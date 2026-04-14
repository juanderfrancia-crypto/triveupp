import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { ChatBubble } from '../components/ChatBubble'
import { sendAudioMessage, markAudioAsListened } from '../services/messages'
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
  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder()
  const [inputText, setInputText] = useState('')
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const [searchText, setSearchText] = useState('')

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
    backButtonContainer: {
      padding: 8,
      marginLeft: 12,
      borderRadius: 8,
      backgroundColor: '#f0f0f0',
    },
    chatHeaderTitle: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
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
    searchInput: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 12,
      backgroundColor: '#f9f9f9',
      fontSize: 14,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#333',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateDescription: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    ctaButton: {
      backgroundColor: '#007AFF',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 20,
      marginBottom: 16,
    },
    ctaButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 14,
    },
    refreshButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#007AFF',
    },
    refreshButtonText: {
      color: '#007AFF',
      fontWeight: '600',
      fontSize: 13,
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
            <TouchableOpacity 
              onPress={() => {
                // Recargar pantalla
                setCurrentOtherUserId(null)
                setInputText('')
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name="refresh" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {contacts.length > 0 && (
          <View style={styles.contactsSection}>
            <Text style={styles.sectionTitle}>📱 Iniciar nuevo chat</Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Contactos de viajes anteriores - puedes iniciar un nuevo chat aquí
            </Text>
            
            {/* Barra de búsqueda */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Buscar contacto..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />

            {/* Contactos filtrados */}
            {contacts
              .filter(contact => 
                contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
                contact.description.toLowerCase().includes(searchText.toLowerCase())
              )
              .map((contact) => (
                <TouchableOpacity
                  key={contact.user_id}
                  style={styles.conversationItem}
                  onPress={() => {
                    loadConversation(contact.user_id)
                    setSearchText('')
                  }}
                >
                  <Text style={styles.conversationName}>{contact.name}</Text>
                  <Text style={styles.conversationPreview} numberOfLines={1}>
                    {contact.description}
                  </Text>
                </TouchableOpacity>
              ))}
            
            {searchText && contacts.filter(c => 
              c.name.toLowerCase().includes(searchText.toLowerCase()) ||
              c.description.toLowerCase().includes(searchText.toLowerCase())
            ).length === 0 && (
              <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 12 }}>
                No se encontraron contactos
              </Text>
            )}
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
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateIcon}>💬</Text>
              <Text style={styles.emptyStateTitle}>¿Cómo funciona el chat?</Text>
              <Text style={styles.emptyStateDescription}>
                {'🚗 Cuando completes un viaje con otro usuario{`\n`}(como pasajero o conductor){`\n\n`}📱 Podrás enviarle mensajes{`\n`}de texto y notas de voz{`\n\n`}👥 Todos tus contactos{`\n`}de viajes aparecerán aquí'}
              </Text>
              
              {/* CTA Buttons */}
              <TouchableOpacity 
                style={styles.ctaButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.ctaButtonText}>🔍 Buscar tu primer viaje</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={async () => {
                  // Reset
                  setCurrentOtherUserId(null)
                  setInputText('')
                }}
              >
                <Text style={styles.refreshButtonText}>↻ Recargar</Text>
              </TouchableOpacity>
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
        <Text style={styles.chatHeaderTitle}>{otherUserName}</Text>
        <TouchableOpacity 
          onPress={() => setCurrentOtherUserId(null)}
          style={styles.backButtonContainer}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
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
              messageType={item.message_type || 'text'}
              audioUrl={item.audio_url}
              audioDuration={item.audio_duration}
              isAudioListened={item.is_audio_listened}
              isFromMe={item.from_user_id === user?.id}
              timestamp={item.created_at}
              isRead={item.is_read}
              onAudioPlay={() => {
                // Marcar como escuchado cuando se reproduce
                if (!item.is_audio_listened && item.id) {
                  markAudioAsListened(item.id).catch(err =>
                    console.error('Error marking audio as listened:', err)
                  )
                }
              }}
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
        {!isRecording ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!loading && !isUploadingAudio}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.sendButton, { opacity: !inputText.trim() || loading ? 0.5 : 1 }]}
              onPress={() => {
                if (inputText.trim()) {
                  send(inputText)
                  setInputText('')
                }
              }}
              disabled={!inputText.trim() || loading || isUploadingAudio}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </TouchableOpacity>

            {/* Botón de grabar audio */}
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: '#FF3B30', marginLeft: 8 }]}
              onPress={async () => {
                const started = await startRecording()
                if (!started) {
                  Alert.alert(
                    'Error',
                    'No se pudieron obtener permisos para acceder al micrófono'
                  )
                }
              }}
            >
              <Ionicons name="mic" size={20} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Indicador de grabación */}
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#fff9f9',
                borderRadius: 20,
                marginRight: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#FF3B30',
                    marginRight: 8,
                    animation: 'pulse',
                  }}
                />
                <Text style={{ color: '#FF3B30', fontWeight: '600' }}>Grabando...</Text>
              </View>
            </View>

            {/* Botón para completar grabación */}
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: '#34C759' }]}
              onPress={async () => {
                if (!user?.id || !currentOtherUserId) return

                const result = await stopRecording()
                if (result) {
                  try {
                    setIsUploadingAudio(true)

                    // Leer el archivo en base64
                    const base64 = await FileSystem.readAsStringAsync(result.uri, {
                      encoding: 'base64',
                    })

                    // Enviar mensaje de audio
                    await sendAudioMessage(
                      user.id,
                      currentOtherUserId,
                      base64,
                      result.durationMs,
                      user.name || 'Usuario'
                    )

                    // Recargar conversación
                    await loadConversation(currentOtherUserId)
                  } catch (err) {
                    console.error('Error uploading audio:', err)
                    Alert.alert('Error', 'No se pudo enviar la nota de voz')
                  } finally {
                    setIsUploadingAudio(false)
                  }
                }
              }}
              disabled={isUploadingAudio}
            >
              <Ionicons name="checkmark" size={20} color="white" />
            </TouchableOpacity>

            {/* Botón para cancelar grabación */}
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: '#888', marginLeft: 8 }]}
              onPress={async () => {
                await cancelRecording()
              }}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </SafeAreaView>
  )
}

export default ChatScreen
