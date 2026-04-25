# 💬 CHAT IMPLEMENTATION - DÍA 2 PLAN

**Objetivo**: Implementar chat básico entre usuarios (conductor ↔ pasajero)  
**Tiempo**: 6-8 horas  
**Risk**: LOW (tabla nueva, aislada)  
**Equipo**: 2 personas

---

## 📊 ESTADO ACTUAL

```
✅ BD: notifications table existe
✅ Frontend: screens bien estructuradas
❌ BD: NO existe tabla messages
❌ Frontend: NO existe ChatScreen
❌ Service: NO existe messages.ts
```

---

## 🎯 ARQUITECTURA FINAL

```
User A                           User B
   ↓                               ↓
HomeScreen ← Chat icon badge    HomeScreen
   ↓                               ↓
ChatScreen (lista conversaciones)
   ↓ (click conversation)
ConversationDetail
   ↓
- Ver mensajes históricos
- Escribir mensaje nuevo
- Enviar
   ↓
Supabase: INSERT messages table
   ↓ (polling cada 2s)
Actualiza ConversationDetail
   ↓
User B: Ve nuevo mensaje + notif
```

---

## 🔧 PASO 1: DATABASE SCHEMA (30 MIN)

### CREAR TABLA MESSAGES

En Supabase SQL Editor, ejecuta:

```sql
-- ============================================
-- TABLA: messages (Chat between users)
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  -- Contexto del mensaje (booking/ruta opcional)
  
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_users CHECK (from_user_id != to_user_id)
  -- No auto-mensajes
);

-- ============================================
-- ÍNDICES (Optimizar queries)
-- ============================================

CREATE INDEX IF NOT EXISTS messages_from_idx 
ON messages(from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_to_idx 
ON messages(to_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_conversation_idx 
ON messages(from_user_id, to_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_unread_idx 
ON messages(to_user_id, is_read);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Política: Ver mensajes donde soy from_user OR to_user
CREATE POLICY "Users can view their messages"
  ON messages
  FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Política: Insertar mensajes solo si eres from_user
CREATE POLICY "Users can create their own messages"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Política: Marcar propios mensajes como read
CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- ============================================
-- TRIGGER: Crear notificación cuando llega mensaje
-- ============================================

CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read
  )
  VALUES (
    NEW.to_user_id,
    'message',
    '💬 Nuevo mensaje',
    'Tienes un nuevo mensaje',
    jsonb_build_object(
      'message_id', NEW.id,
      'from_user_id', NEW.from_user_id,
      'booking_id', NEW.booking_id
    ),
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_notification_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION create_message_notification();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Listar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('messages', 'notifications');

-- Resultado esperado:
-- messages ✅
-- notifications ✅
```

### ✅ VERIFICATION

Ejecuta y verifica que NO hay errores:
```
Expected output: 2 rows (messages + notifications)
```

**Si hay error**: Copiar-pegar completo de nuevo (SQL es idempontente)

---

## 🛠️ PASO 2: BACKEND SERVICE (90 MIN)

### CREAR: `src/services/messages.ts`

```typescript
import { supabase } from './supabase'

export interface Message {
  id: string
  from_user_id: string
  to_user_id: string
  booking_id?: string
  message: string
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface Conversation {
  other_user_id: string
  other_user_name: string
  other_user_avatar?: string
  last_message: string
  last_message_time: string
  unread_count: number
}

// ============================================
// OBTENER LISTA DE CONVERSACIONES
// ============================================

export const getConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    // Obtener últimos mensajes por conversación (de ambas direcciones)
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        from_user_id,
        to_user_id,
        message,
        created_at,
        is_read,
        from_user:from_user_id(id, name, avatar_url),
        to_user:to_user_id(id, name, avatar_url)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1000) // Traer últimos 1000 para procesar

    if (error) throw error

    // Procesar: Agrupar por conversación única
    const conversationMap = new Map<string, Conversation>()

    for (const msg of data || []) {
      const otherUserId = msg.from_user_id === userId ? msg.to_user_id : msg.from_user_id
      const otherUser = msg.from_user_id === userId ? msg.to_user : msg.from_user

      if (!conversationMap.has(otherUserId)) {
        // Contar no-leídos en esta conversación
        const unreadCount = (data || []).filter(
          m => (m.from_user_id === otherUserId && m.to_user_id === userId && !m.is_read)
        ).length

        conversationMap.set(otherUserId, {
          other_user_id: otherUserId,
          other_user_name: otherUser.name,
          other_user_avatar: otherUser.avatar_url,
          last_message: msg.message,
          last_message_time: msg.created_at,
          unread_count: unreadCount,
        })
      }
    }

    return Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())
  } catch (err: any) {
    console.error('Error fetching conversations:', err)
    throw err
  }
}

// ============================================
// OBTENER MENSAJE DE UNA CONVERSACIÓN
// ============================================

export const getConversation = async (
  userId: string,
  otherUserId: string,
  limit = 50
): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error

    // Marcar como leídos (todos los mensajes que recibí de otherUserId)
    const unreadMessages = (data || []).filter(m => m.to_user_id === userId && !m.is_read)
    if (unreadMessages.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadMessages.map(m => m.id))
    }

    return data || []
  } catch (err: any) {
    console.error('Error fetching conversation:', err)
    throw err
  }
}

// ============================================
// ENVIAR MENSAJE
// ============================================

export const sendMessage = async (
  fromUserId: string,
  toUserId: string,
  message: string,
  bookingId?: string
): Promise<Message> => {
  try {
    if (!message.trim()) {
      throw new Error('Mensaje vacío')
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          message: message.trim(),
          booking_id: bookingId || null,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err: any) {
    console.error('Error sending message:', err)
    throw err
  }
}

// ============================================
// MARCAR COMO LEÍDO
// ============================================

export const markAsRead = async (messageIds: string[]): Promise<void> => {
  try {
    if (messageIds.length === 0) return

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', messageIds)

    if (error) throw error
  } catch (err: any) {
    console.error('Error marking as read:', err)
    throw err
  }
}

// ============================================
// ELIMINAR CONVERSACIÓN (borrar todos los mensajes)
// ============================================

export const deleteConversation = async (userId: string, otherUserId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(
        `and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`
      )

    if (error) throw error
  } catch (err: any) {
    console.error('Error deleting conversation:', err)
    throw err
  }
}
```

**✅ CHECKPOINT**: Archivo creado sin errores

---

## 🪝 PASO 3: FRONTEND HOOK (60 MIN)

### CREAR: `src/hooks/useChat.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import {
  getConversations,
  getConversation,
  sendMessage,
  markAsRead,
  deleteConversation,
  Message,
  Conversation,
} from '../services/messages'

export const useChat = (userId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentOtherUserId, setCurrentOtherUserId] = useState<string | null>(null)

  // ============================================
  // CARGAR CONVERSACIONES (polling cada 2s)
  // ============================================

  useEffect(() => {
    if (!userId) return

    const loadConversations = async () => {
      try {
        setError(null)
        const data = await getConversations(userId)
        setConversations(data)
      } catch (err: any) {
        setError(err.message)
        console.error('Error loading conversations:', err)
      }
    }

    loadConversations()

    // Polling cada 2 segundos (NO es ideal, pero es simple sin WebSocket)
    const interval = setInterval(loadConversations, 2000)
    return () => clearInterval(interval)
  }, [userId])

  // ============================================
  // CARGAR MENSAJES DE UNA CONVERSACIÓN
  // ============================================

  const loadConversation = useCallback(
    async (otherUserId: string) => {
      if (!userId) return

      try {
        setError(null)
        setLoading(true)
        setCurrentOtherUserId(otherUserId)
        const data = await getConversation(userId, otherUserId)
        setMessages(data)
      } catch (err: any) {
        setError(err.message)
        console.error('Error loading conversation:', err)
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  // ============================================
  // POLLING PARA NUEVOS MENSAJES (cada 2s)
  // ============================================

  useEffect(() => {
    if (!userId || !currentOtherUserId) return

    const pollMessages = async () => {
      try {
        const data = await getConversation(userId, currentOtherUserId)
        setMessages(data)
      } catch (err: any) {
        console.error('Error polling messages:', err)
      }
    }

    // Polling cada 2 segundos
    const interval = setInterval(pollMessages, 2000)
    return () => clearInterval(interval)
  }, [userId, currentOtherUserId])

  // ============================================
  // ENVIAR MENSAJE
  // ============================================

  const send = useCallback(
    async (text: string, bookingId?: string) => {
      if (!userId || !currentOtherUserId || !text.trim()) {
        setError('No puedo enviar mensaje vacío')
        return
      }

      try {
        setError(null)
        const newMessage = await sendMessage(userId, currentOtherUserId, text, bookingId)
        setMessages(prev => [...prev, newMessage])
      } catch (err: any) {
        setError(err.message)
        console.error('Error sending message:', err)
      }
    },
    [userId, currentOtherUserId]
  )

  // ============================================
  // ELIMINAR CONVERSACIÓN
  // ============================================

  const deleteChat = useCallback(
    async (otherUserId: string) => {
      if (!userId) return

      try {
        setError(null)
        await deleteConversation(userId, otherUserId)
        // Remover de list
        setConversations(prev => prev.filter(c => c.other_user_id !== otherUserId))
        if (currentOtherUserId === otherUserId) {
          setCurrentOtherUserId(null)
          setMessages([])
        }
      } catch (err: any) {
        setError(err.message)
      }
    },
    [userId, currentOtherUserId]
  )

  // ============================================
  // OBTENER TOTAL NO-LEÍDOS
  // ============================================

  const unreadCount = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  return {
    conversations,
    messages,
    loading,
    error,
    unreadCount,
    loadConversation,
    send,
    deleteChat,
    currentOtherUserId,
  }
}
```

**✅ CHECKPOINT**: Hook creado sin errores de TypeScript

---

## 🎨 PASO 4: UI COMPONENTS (150 MIN)

### CREAR: `src/components/ChatBubble.tsx`

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface ChatBubbleProps {
  message: string
  isFromMe: boolean
  timestamp: string
  isRead?: boolean
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isFromMe, timestamp, isRead }) => {
  const styles = StyleSheet.create({
    bubbleContainer: {
      flexDirection: 'row',
      marginVertical: 4,
      marginHorizontal: 12,
      justifyContent: isFromMe ? 'flex-end' : 'flex-start',
    },
    bubble: {
      maxWidth: '80%',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: isFromMe ? '#007AFF' : '#E5E5EA',
    },
    bubbleText: {
      color: isFromMe ? 'white' : 'black',
      fontSize: 14,
      lineHeight: 20,
    },
    timestamp: {
      alignSelf: isFromMe ? 'flex-end' : 'flex-start',
      marginHorizontal: 12,
      marginTop: 2,
      color: '#999',
      fontSize: 12,
    },
  })

  return (
    <View>
      <View style={styles.bubbleContainer}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{message}</Text>
        </View>
      </View>
      <Text style={styles.timestamp}>{formatDistanceToNow(new Date(timestamp), { locale: es, addSuffix: true })}</Text>
    </View>
  )
}
```

### CREAR: `src/screens/ChatScreen.tsx`

```typescript
import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { ChatBubble } from '../components/ChatBubble'

export const ChatScreen = () => {
  const { user } = useAuth()
  const { conversations, unreadCount, loadConversation, currentOtherUserId, messages, send, loading, error } = useChat(user?.id)
  const [inputText, setInputText] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      backgroundColor: '#f8f8f8',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    conversationList: {
      flex: 1,
    },
    conversationItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    conversationName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    conversationPreview: {
      fontSize: 13,
      color: '#666',
      marginBottom: 4,
    },
    unreadBadge: {
      backgroundColor: '#007AFF',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: 'flex-start',
    },
    badgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    messageList: {
      flex: 1,
      paddingVertical: 8,
    },
    messageContainer: {
      flex: 1,
    },
    chatHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      backgroundColor: '#f8f8f8',
    },
    backButton: {
      fontSize: 18,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: '#eee',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 8,
      maxHeight: 100,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#007AFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
  })

  if (!currentOtherUserId) {
    // LISTA DE CONVERSACIONES
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mensajes</Text>
          {unreadCount > 0 && <Text style={{ color: '#007AFF' }}>({unreadCount} no leídos)</Text>}
        </View>

        <FlatList
          data={conversations}
          keyExtractor={item => item.other_user_id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.conversationItem} onPress={() => loadConversation(item.other_user_id)}>
              <Text style={styles.conversationName}>{item.other_user_name}</Text>
              <Text style={styles.conversationPreview} numberOfLines={1}>
                {item.last_message}
              </Text>
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.badgeText}>{item.unread_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: '#999' }}>No hay conversaciones aún</Text>
            </View>
          }
        />
      </SafeAreaView>
    )
  }

  // DETALLE DE CONVERSACIÓN
  const otherUserName = conversations.find(c => c.other_user_id === currentOtherUserId)?.other_user_name || 'Usuario'

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setIsComposing(false)}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.conversationName}>{otherUserName}</Text>
      </View>

      {/* Mensajes */}
      {loading ? (
        <View style={[styles.messageList, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatBubble message={item.message} isFromMe={item.from_user_id === user?.id} timestamp={item.created_at} isRead={item.is_read} />
          )}
          style={styles.messageList}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          onEndReachedThreshold={0.1}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => {
            send(inputText)
            setInputText('')
          }}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={{ color: 'red', padding: 8, textAlign: 'center' }}>{error}</Text>}
    </SafeAreaView>
  )
}
```

**✅ CHECKPOINT**: Componentes creados y tipados

---

## 📍 PASO 5: NAVIGATION INTEGRATION (30 MIN)

### ACTUALIZAR: `src/navigation/AppNavigator.tsx`

Agregar ChatScreen al stack:

```typescript
// Agregar import
import { ChatScreen } from '../screens/ChatScreen'

// Dentro del Stack.Navigator:
<Stack.Screen 
  name="Chat" 
  component={ChatScreen}
  options={{
    headerShown: false,
  }}
/>
```

### AGREGAR BOTÓN EN HomeScreen

```typescript
// En HomeScreen.tsx, agregar botón con badge de mensajes no leídos
import { useChat } from '../hooks/useChat'

// Dentro del componente:
const { unreadCount } = useChat(user?.id)

// En header o navbar:
<TouchableOpacity onPress={() => navigation.navigate('Chat')}>
  <Text>💬 Chat</Text>
  {unreadCount > 0 && <Badge count={unreadCount} />}
</TouchableOpacity>
```

**✅ CHECKPOINT**: Navigation integrada

---

## 🧪 PASO 6: TESTING (90 MIN)

### TEST 1: Crear mensajes

**Setup**: 2 devices/emulators

```
Device A (User 1):
1. Login
2. Go to Chat
3. Click User 2
4. Type "Hola desde Device A"
5. Click Send

Device B (User 2):
1. Login
2. Go to Chat
3. Verificar que vea "User 1"
4. Click conversation
5. Verificar que vea "Hola desde Device A" ✅
6. Type "Hola desde Device B"
7. Click Send

Device A:
8. En ~2 segundos, debe ver "Hola desde Device B" ✅
```

**✅ PASS**: Si ambos ven mensajes en tiempo real

### TEST 2: No-leídos y notificaciones

```
Device A: Envía mensaje
Device B: 
- ¿Ve badge con número no-leído? ✅
- ¿Ve notificación en notifications table? ✅
```

### TEST 3: Marcar como leído

```
Device B: Abre chat
- ¿Badge desaparece? ✅
- ¿is_read cambia a true en BD? ✅
```

### TEST 4: Conversaciones listadas

```
Device A:
- ¿Ve lista de conversaciones? ✅
- ¿Ordenadas por último mensaje? ✅
- ¿Muestra preview del último mensaje? ✅
```

---

## ⚠️ ROLLBACK PLAN (Si algo rompe)

```bash
# Si algo en BD falla:
# (Backup: constraints están aisladas)

# Revertir tabla messages:
DROP TABLE IF EXISTS messages CASCADE;

# Revertir trigger:
DROP TRIGGER IF EXISTS message_notification_trigger;
DROP FUNCTION IF EXISTS create_message_notification();

# Git rollback si frontend falla:
git checkout -- src/screens/ChatScreen.tsx
git checkout -- src/hooks/useChat.ts
git checkout -- src/components/ChatBubble.tsx
```

---

## 📋 CHECKLIST - DÍA 2

```
PASO 1: BD Schema (30 min)
[ ] Ejecutar SQL
[ ] Verificar tabla messages existe
[ ] Verificar trigger funciona

PASO 2: Service (90 min)
[ ] Crear messages.ts
[ ] No errores de TypeScript
[ ] Todas funciones exportadas

PASO 3: Hook (60 min)
[ ] Crear useChat.ts
[ ] No errores de TypeScript
[ ] Polling cada 2s funciona

PASO 4: UI (150 min)
[ ] ChatBubble.tsx creado
[ ] ChatScreen.tsx creado
[ ] No errores de compilación

PASO 5: Navigation (30 min)
[ ] ChatScreen en AppNavigator
[ ] Botón en HomeScreen
[ ] Navega sin errores

PASO 6: Testing (90 min)
[ ] 2 users envían mensajes
[ ] Ven en tiempo real (~2s)
[ ] Notificaciones crean
[ ] Badges actualizan

TOTAL: 7-8 horas
```

---

## 🎬 PRÓXIMO

Una vez completado:
1. Commit a git: `git commit -m "feat: add chat system"`
2. QA final
3. ENTONCES: Push Android (DÍA 3)

---

**Status**: 🟢 READY TO START

¿Comenzamos? 👇

