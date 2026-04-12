import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { ChatBubble } from '../components/ChatBubble'
import { useRoute } from '@react-navigation/native'

const ChatScreen = ({ navigation }: any) => {
  const { user } = useAuth()
  const route = useRoute<any>()
  const {
    conversations,
    contacts,
    unreadCount,
    loadConversation,
    currentOtherUserId,
    messages,
    send,
    loading,
    error,
    setCurrentOtherUserId,
  } = useChat(user?.id)
  const [inputText, setInputText] = useState('')

  useEffect(() => {
    const otherUserId = route.params?.otherUserId as string | undefined
    if (otherUserId) {
      loadConversation(otherUserId)
    }
  }, [route.params?.otherUserId, loadConversation])

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
      marginTop: 4,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      fontSize: 18,
      marginRight: 12,
      color: '#007AFF',
      fontWeight: '600',
    },
    chatHeaderTitle: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: '#eee',
      alignItems: 'flex-end',
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
      backgroundColor: '#f9f9f9',
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
    emptyContainer: {
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    emptyText: {
      color: '#999',
      fontSize: 16,
    },
    errorText: {
      color: 'red',
      padding: 8,
      textAlign: 'center',
      backgroundColor: '#ffe6e6',
    },
    contactsSection: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
      color: '#333',
    },
  })

  // VISTA 1: LISTA DE CONVERSACIONES
  if (!currentOtherUserId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.title}>Mensajes</Text>
              {unreadCount > 0 && <Text style={{ color: '#007AFF', fontSize: 14 }}>({unreadCount} no leídos)</Text>}
            </View>
          </View>
        </View>

        {contacts.length > 0 && (
          <View style={styles.contactsSection}>
            <Text style={styles.sectionTitle}>Iniciar nuevo chat</Text>
            {contacts.map((contact) => (
              <TouchableOpacity
                key={contact.user_id}
                style={styles.conversationItem}
                onPress={() => loadConversation(contact.user_id)}
              >
                <Text style={styles.conversationName}>{contact.name}</Text>
                <Text style={styles.conversationPreview} numberOfLines={1}>
                  {contact.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay conversaciones aún</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                Aquí puedes iniciar un chat con conductores o pasajeros de tus viajes recientes.
              </Text>
            </View>
          }
        />

      </SafeAreaView>
    )
  }

  // VISTA 2: DETALLE DE CONVERSACIÓN
  const otherUserName =
    conversations.find(c => c.other_user_id === currentOtherUserId)?.other_user_name || 'Usuario'

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setCurrentOtherUserId(null)}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>{otherUserName}</Text>
      </View>

      {/* Mensajes */}
      {loading && messages.length === 0 ? (
        <View style={[styles.messageList, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item.message}
              isFromMe={item.from_user_id === user?.id}
              timestamp={item.created_at}
              isRead={item.is_read}
            />
          )}
          style={styles.messageList}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
            </View>
          }
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
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: !inputText.trim() ? 0.5 : 1 }]}
          onPress={() => {
            send(inputText)
            setInputText('')
          }}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </SafeAreaView>
  )
}

export default ChatScreen
