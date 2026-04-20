import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Clipboard,
  SectionList,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system/legacy'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { ChatBubble } from '../components/ChatBubble'
import { ConversationItem } from '../components/ConversationItem'
import { TypingIndicator } from '../components/TypingIndicator'
import { DateSeparator } from '../components/DateSeparator'
import { ChatHeader } from '../components/ChatHeader'
import { SearchBar } from '../components/SearchBar'
import { EmojiPicker } from '../components/EmojiPicker'
import { MessageInput } from '../components/MessageInput'
import { sendAudioMessage, markAsRead, markAudioAsListened, deleteMessage, sendReplyMessage, pinMessage, unpinMessage, getPinnedMessages, editMessage, archiveConversation, getArchivedConversations, getArchivedConversationsDetailed, deleteArchivedConversationPermanently, unarchiveConversation } from '../services/messages'
import { useRoute } from '@react-navigation/native'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'
import { ReplyBubble } from '../components/ReplyBubble'
import { PinnedMessageBar } from '../components/PinnedMessageBar'

type ChatMessageRowProps = {
  item: any
  userId?: string
  onCopyMessage: (message: string) => void
  onDeleteMessage: (messageId: string) => void
  onReplyMessage: (message: any) => void
  onEditMessage: (message: any) => void
  onPinMessage: (messageId: string) => void
  onUnpinMessage: (messageId: string) => void
}

const ChatMessageRow = React.memo(({ item, userId, onCopyMessage, onDeleteMessage, onReplyMessage, onEditMessage, onPinMessage, onUnpinMessage }: ChatMessageRowProps) => {
  const showDateSeparator = item.showDateSeparator === true

  const handleAudioPlay = useCallback(() => {
    if (!item.is_audio_listened && item.id) {
      markAudioAsListened(item.id).catch(err => {
        console.error('Error marking audio as listened:', err)
      })
    }
  }, [item.id, item.is_audio_listened])

  const handleCopy = useCallback(() => onCopyMessage(item.message), [onCopyMessage, item.message])
  const handleDelete = useCallback(() => onDeleteMessage(item.id), [onDeleteMessage, item.id])
  const handleReply = useCallback(() => onReplyMessage(item), [onReplyMessage, item.id])
  const handleEdit = useCallback(() => onEditMessage(item), [onEditMessage, item.id])
  const handlePin = useCallback(() => onPinMessage(item.id), [onPinMessage, item.id])
  const handleUnpin = useCallback(() => onUnpinMessage(item.id), [onUnpinMessage, item.id])

  return (
    <View>
      {showDateSeparator && <DateSeparator date={item.created_at} />}
      <ChatBubble
        message={item.message}
        messageType={item.message_type || 'text'}
        audioUrl={item.audio_url}
        audioDuration={item.audio_duration}
        isAudioListened={item.is_audio_listened}
        isFromMe={item.from_user_id === userId}
        timestamp={item.created_at}
        isRead={item.is_read}
        isEdited={!!item.edited_at}
        isPinned={item.is_pinned}
        onAudioPlay={handleAudioPlay}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onReply={handleReply}
        onEdit={handleEdit}
        onPin={handlePin}
        onUnpin={handleUnpin}
      />
    </View>
  )
}, (prevProps, nextProps) => {
  const item = prevProps.item
  const nextItem = nextProps.item

  return (
    item.id === nextItem.id &&
    item.message === nextItem.message &&
    item.message_type === nextItem.message_type &&
    item.audio_url === nextItem.audio_url &&
    item.audio_duration === nextItem.audio_duration &&
    item.is_audio_listened === nextItem.is_audio_listened &&
    item.from_user_id === nextItem.from_user_id &&
    item.created_at === nextItem.created_at &&
    item.is_read === nextItem.is_read &&
    item.edited_at === nextItem.edited_at &&
    item.is_pinned === nextItem.is_pinned &&
    item.showDateSeparator === nextItem.showDateSeparator &&
    prevProps.userId === nextProps.userId &&
    prevProps.onCopyMessage === nextProps.onCopyMessage &&
    prevProps.onDeleteMessage === nextProps.onDeleteMessage &&
    prevProps.onReplyMessage === nextProps.onReplyMessage &&
    prevProps.onEditMessage === nextProps.onEditMessage &&
    prevProps.onPinMessage === nextProps.onPinMessage &&
    prevProps.onUnpinMessage === nextProps.onUnpinMessage
  )
})

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
    deleteChat,
    setCurrentOtherUserId,
  } = useChat(user?.id)
  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder()
  
  // Estados
  const [inputText, setInputText] = useState('')
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false) // Se actualiza cuando el otro usuario escribe (via WebSocket)
  const [showEmojiPickerMain, setShowEmojiPickerMain] = useState(false)
  const [scrollToBottom, setScrollToBottom] = useState(true)
  const [replyingTo, setReplyingTo] = useState<any>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [archivedConversations, setArchivedConversations] = useState<string[]>([])
  const [archivedConversationsDetailed, setArchivedConversationsDetailed] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const toastTimeoutRef = useRef<NodeJS.Timeout>(null!)
  const isDeletingRef = useRef(false) // Flag para prevenir re-archiving durante delete
  const flatListRef = useRef<FlatList>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>(null!)

  // Cargar conversación desde parámetros
  useEffect(() => {
    const otherUserId = route.params?.otherUserId as string | undefined
    if (otherUserId) {
      // @ts-ignore - useChat hook expects required parameter
      loadConversation(otherUserId)
      // Cargar mensajes fijados
      // @ts-ignore - loadPinnedMessages parameter handling
      loadPinnedMessages(otherUserId)
    }
  }, [route.params?.otherUserId])

  // Cargar conversaciones archivadas
  useEffect(() => {
    if (user?.id && !isDeletingRef.current) {
      loadArchivedConversations()
    }
  }, [user?.id])

  const loadArchivedConversations = async () => {
    // No cargar si estamos en proceso de eliminación
    if (isDeletingRef.current) {
      console.warn('⚠️ [loadArchivedConversations] Bloqueado - estamos eliminando permanentemente')
      return
    }
    
    try {
      if (user?.id) {
        const archived = await getArchivedConversations(user.id)
        setArchivedConversations(archived)
        
        // Cargar detalles de las archivadas
        const archivedDetailed = await getArchivedConversationsDetailed(user.id)
        setArchivedConversationsDetailed(archivedDetailed)
      }
    } catch (error) {
      console.error('Error loading archived conversations:', error)
    }
  }

  const activeConversationIds = conversations.map(c => c.other_user_id)
  const conversationContactIds = new Set<string>([...activeConversationIds, ...archivedConversations])

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchText.toLowerCase()) ||
    c.description.toLowerCase().includes(searchText.toLowerCase())
  )

  const newContacts = filteredContacts.filter(c => !conversationContactIds.has(c.user_id))
  const hiddenContactsCount = filteredContacts.filter(c => conversationContactIds.has(c.user_id)).length

  // Auto-cerrar toast después de 2 segundos
  useEffect(() => {
    if (toastMessage) {
      // Limpiar timeout anterior si existe
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
      // Crear nuevo timeout
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null)
      }, 2000)
    }
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [toastMessage])

  // Cargar mensajes fijados
  const loadPinnedMessages = async (otherUserId: string) => {
    try {
      if (user?.id) {
        const pinned = await getPinnedMessages(user.id, otherUserId)
        setPinnedMessages(pinned || [])
      }
    } catch (error) {
      console.error('Error loading pinned messages:', error)
    }
  }

  // Auto scrollear cuando llegan nuevos mensajes
  useEffect(() => {
    if (scrollToBottom && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  // Simular indicador de escritura (en realidad solo visual, sin real-time)
  const handleTyping = (text: string) => {
    setInputText(text)
    // TODO: Aquí iría lógica para enviar "typing..." event al servidor
    // Para mostrar cuando OTRA persona escribe, usar WebSocket/Realtime updates
    // NO mostrar cuando TÚ MISMO escribes
  }

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!inputText.trim() || sendingMessage || !currentOtherUserId) return

    try {
      setSendingMessage(true)
      
      // Si estamos editando, editar en lugar de enviar
      if (editingMessageId) {
        await handleSendEdit()
        return
      }

      // Si estamos respondiendo, enviar como reply
      if (replyingTo) {
        await handleSendReply()
        return
      }

      // Enviar mensaje normal
      await send(inputText)
      setInputText('')
      setIsTyping(false)

      // Refrescar la conversación después de enviar para asegurar que el mensaje se muestra
      if (currentOtherUserId) {
        await loadConversation(currentOtherUserId)
      }

      // Marcar mensajes como leídos
      if (currentOtherUserId && messages.length > 0) {
        const unreads = messages.filter(m => !m.is_read && m.to_user_id === user?.id)
        for (const msg of unreads) {
          // @ts-ignore - markAsRead parameter type
          await markAsRead(msg.id)
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje')
    } finally {
      setSendingMessage(false)
    }
  }

  // Enviar audio
  const handleSendAudio = async () => {
    if (!user?.id || !currentOtherUserId) return

    const result = await stopRecording()
    if (result) {
      try {
        setIsUploadingAudio(true)
        const base64 = await FileSystem.readAsStringAsync(result.uri, { encoding: 'base64' })

        await sendAudioMessage(
          user.id,
          currentOtherUserId as string,
          base64,
          result.durationMs,
          user.email || 'Usuario'
        )

        // Recargar conversación
        // @ts-ignore - loadConversation parameter type
        await loadConversation(currentOtherUserId)
      } catch (err) {
        console.error('Error uploading audio:', err)
        Alert.alert('Error', 'No se pudo enviar la nota de voz')
      } finally {
        setIsUploadingAudio(false)
      }
    }
  }

  // Copiar mensaje al portapapeles
  const handleCopyMessage = useCallback((message: string) => {
    Clipboard.setString(message)
    setToastMessage('✓ Copiado al portapapeles')
  }, [])

  // Agregar emoji al input
  const handleAddEmojiToInput = useCallback((emoji: string) => {
    setInputText(prev => prev + emoji)
    setShowEmojiPickerMain(false)
  }, [])

  // Menú de opciones del chat
  const handleOpenChatOptions = () => {
    setShowChatMenu(!showChatMenu)
  }

  // Cerrar menú al navegar o cambiar de pantalla
  useEffect(() => {
    return () => {
      setShowChatMenu(false)
    }
  }, [])

  // Eliminar mensaje
  const handleDeleteMessage = useCallback((messageId: string) => {
    Alert.alert(
      'Eliminar mensaje',
      '¿Estás seguro de que deseas eliminar este mensaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSendingMessage(true)
              console.log('🗑️ Eliminando mensaje:', messageId)
              
              // Eliminar de la BD
              const result = await deleteMessage(messageId)
              console.log('✓ Respuesta eliminación:', result)
              
              // Recargar inmediatamente
              if (currentOtherUserId) {
                console.log('🔄 Recargando conversación...')
                await loadConversation(currentOtherUserId)
                console.log('✓ Conversación recargada')
              }
              setToastMessage('✓ Mensaje eliminado')
            } catch (error: any) {
              console.error('❌ Error al eliminar:', error)
              setToastMessage('✗ ' + (error?.message || 'No se pudo eliminar el mensaje'))
            } finally {
              setSendingMessage(false)
            }
          },
        },
      ]
    )
  }, [currentOtherUserId, loadConversation])

  // Eliminar/Archivar conversación
  const handleDeleteConversation = (otherUserId: string) => {
    // Prevenir que se archive si estamos en proceso de eliminación permanente
    if (isDeletingRef.current) {
      console.warn('⚠️ [handleDeleteConversation] Bloqueado - estamos eliminando permanentemente')
      return
    }
    
    const otherUserName = conversations.find(c => c.other_user_id === otherUserId)?.other_user_name
      || archivedConversationsDetailed.find(c => c.other_user_id === otherUserId)?.other_user_name
      || contacts.find(c => c.user_id === otherUserId)?.name
      || 'Usuario'
    
    Alert.alert(
      'Archivar conversación',
      `¿Deseas archivar la conversación con ${otherUserName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSendingMessage(true)
              console.log('📁 Archivando conversación con:', otherUserId)
              console.log('📁 [DEBUG] archivedConversations array ANTES:', archivedConversations)
              console.log('📁 [DEBUG] isDeletingRef.current:', isDeletingRef.current)
              
              if (user?.id) {
                await archiveConversation(user.id, otherUserId)
                
                // ✅ Usar función de actualización para evitar race conditions
                setArchivedConversations(prevArchived => {
                  if (!prevArchived.includes(otherUserId)) {
                    console.log('📁 [DEBUG] Agregando a archivadas:', otherUserId)
                    return [...prevArchived, otherUserId]
                  }
                  return prevArchived
                })
                
                // Recargar conversaciones archivadas
                await loadArchivedConversations()
                
                // Si la conversación actual está abierta, cerrarla
                if (currentOtherUserId === otherUserId) {
                  setCurrentOtherUserId(null)
                }
                
                setToastMessage('✓ Conversación archivada')
                console.log('📁 [DEBUG] archivedConversations array DESPUÉS:', archivedConversations)
              }
            } catch (error: any) {
              console.error('❌ Error al archivar conversación:', error)
              setToastMessage('✗ No se pudo archivar')
            } finally {
              setSendingMessage(false)
            }
          },
        },
      ]
    )
  }

  // Recuperar conversación archivada
  const handleRecoverConversation = (otherUserId: string) => {
    const otherUserName = archivedConversationsDetailed.find(c => c.other_user_id === otherUserId)?.other_user_name || 'Usuario'
    
    Alert.alert(
      'Recuperar conversación',
      `¿Deseas recuperar la conversación con ${otherUserName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recuperar',
          style: 'default',
          onPress: async () => {
            try {
              setSendingMessage(true)
              console.log('📁 [handleRecoverConversation] Recuperando conversación con:', otherUserId)
              
              if (user?.id) {
                await unarchiveConversation(user.id, otherUserId)
                console.log('✓ [handleRecoverConversation] Desarchivado correctamente')
                
                // ✅ Usar función de actualización para evitar race conditions
                setArchivedConversations(prevArchived => prevArchived.filter(id => id !== otherUserId))
                setArchivedConversationsDetailed(prevDetailed => prevDetailed.filter(c => c.other_user_id !== otherUserId))
                console.log('✓ [handleRecoverConversation] Estado actualizado')
                
                setToastMessage('✓ Conversación recuperada')
              }
            } catch (error: any) {
              console.error('❌ Error al recuperar:', error)
              setToastMessage('✗ No se pudo recuperar')
            } finally {
              setSendingMessage(false)
              console.log('✓ [handleRecoverConversation] FIN del proceso')
            }
          },
        },
      ]
    )
  }

  // Eliminar PERMANENTEMENTE una conversación archivada
  const handleDeleteArchivedPermanently = (otherUserId: string) => {
    const otherUserName = archivedConversationsDetailed.find(c => c.other_user_id === otherUserId)?.other_user_name || 'Usuario'
    
    Alert.alert(
      'Eliminar para siempre',
      `¿Deseas eliminar PERMANENTEMENTE la conversación con ${otherUserName}? No se puede recuperar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              isDeletingRef.current = true // ← Flag: estamos borrando
              setSendingMessage(true)
              console.log('🗑️ [handleDeleteArchivedPermanently] Eliminando permanentemente:', otherUserId)
              
              if (user?.id) {
                await deleteArchivedConversationPermanently(user.id, otherUserId)
                console.log('✓ [handleDeleteArchivedConversation Permanently] Eliminado correctamente')
                
                // ✅ Usar función de actualización para evitar race conditions
                setArchivedConversations(prevArchived => prevArchived.filter(id => id !== otherUserId))
                setArchivedConversationsDetailed(prevDetailed => prevDetailed.filter(c => c.other_user_id !== otherUserId))
                console.log('✓ [handleDeleteArchivedPermanently] Estado actualizado')
                
                setToastMessage('✓ Eliminado para siempre')
              }
            } catch (error: any) {
              console.error('❌ Error al eliminar permanentemente:', error)
              setToastMessage('✗ Error al eliminar')
              isDeletingRef.current = false // ← Reset flag on error
            } finally {
              setSendingMessage(false)
              // Esperar 2000ms antes de permitir nueva archivación  
              setTimeout(() => {
                isDeletingRef.current = false
                console.log('✓ [handleDeleteArchivedPermanently] FIN del proceso - Flag reseteado')
              }, 2000)
            }
          },
        },
      ]
    )
  }

  // Responder a un mensaje
  const handleReplyMessage = useCallback((message: any) => {
    setReplyingTo(message)
  }, [])

  // Enviar respuesta a un mensaje
  const handleSendReply = async () => {
    if (!inputText.trim() || !replyingTo || !currentOtherUserId || !user?.id) return

    try {
      setSendingMessage(true)
      await sendReplyMessage(user.id, currentOtherUserId, inputText, replyingTo.id)
      setInputText('')
      setReplyingTo(null)

      // Recargar conversación
      if (currentOtherUserId) {
        await loadConversation(currentOtherUserId)
        setToastMessage('✓ Respuesta enviada')
      }
    } catch (error: any) {
      console.error('Error sending reply:', error)
      setToastMessage('✗ Error al enviar la respuesta')
    } finally {
      setSendingMessage(false)
    }
  }

  // Editar un mensaje
  const handleEditMessage = useCallback((message: any) => {
    setInputText(message.message)
    setEditingMessageId(message.id)
  }, [])

  // Enviar edición de mensaje
  const handleSendEdit = async () => {
    if (!inputText.trim() || !editingMessageId || !user?.id) return

    try {
      setSendingMessage(true)
      console.log('✏️ Editando mensaje:', editingMessageId)
      
      await editMessage(editingMessageId, inputText, user.id)
      console.log('✓ Mensaje editado en BD')
      
      setInputText('')
      setEditingMessageId(null)

      // Recargar conversación
      if (currentOtherUserId) {
        console.log('🔄 Recargando conversación...')
        await loadConversation(currentOtherUserId)
        console.log('✓ Conversación recargada')
        setToastMessage('✓ Mensaje editado')
      }
    } catch (error: any) {
      console.error('❌ Error editando mensaje:', error)
      setToastMessage('✗ Error al editar el mensaje')
    } finally {
      setSendingMessage(false)
    }
  }

  // Fijar un mensaje
  const handlePinMessage = useCallback((messageId: string) => {
    Alert.alert(
      'Fijar mensaje',
      '¿Fijar este mensaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fijar',
          onPress: async () => {
            try {
              await pinMessage(messageId)
              if (currentOtherUserId) {
                await loadPinnedMessages(currentOtherUserId)
              }
              setToastMessage('✓ Mensaje fijado')
            } catch (error: any) {
              console.error('Error pinning message:', error)
              setToastMessage('✗ Error al fijar el mensaje')
            }
          },
        },
      ]
    )
  }, [currentOtherUserId, loadPinnedMessages])

  // Desfijar un mensaje
  const handleUnpinMessage = useCallback(async (messageId: string) => {
    try {
      await unpinMessage(messageId)
      if (currentOtherUserId) {
        await loadPinnedMessages(currentOtherUserId)
      }
      setToastMessage('✓ Mensaje desfijado')
    } catch (error: any) {
      console.error('Error unpinning message:', error)
      setToastMessage('✗ Error al desfijar el mensaje')
    }
  }, [currentOtherUserId, loadPinnedMessages])

  // Agrupar mensajes por fecha
  const groupMessagesByDate = () => {
    const groups: { [key: string]: any[] } = {}

    messages.forEach(msg => {
      const date = new Date(msg.created_at).toISOString().split('T')[0]
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(msg)
    })

    return Object.entries(groups)
      .map(([date, msgs]) => ({
        date,
        data: msgs,
      }))
      .reverse()
  }

  // Filtrar mensajes por búsqueda
  const getFilteredMessages = () => {
    if (!searchText.trim()) return messages
    
    const lowerSearch = searchText.toLowerCase()
    return messages.filter(msg => {
      if (msg.message_type === 'text' && msg.message) {
        return msg.message.toLowerCase().includes(lowerSearch)
      }
      return false
    })
  }

  const filteredMessages = getFilteredMessages()

  const displayedMessages = useMemo(() => {
    const source = showSearch ? filteredMessages : messages
    return source.map((msg, index) => ({
      ...msg,
      showDateSeparator:
        index === 0 ||
        new Date(source[index - 1]?.created_at).toISOString().split('T')[0] !==
          new Date(msg.created_at).toISOString().split('T')[0],
    }))
  }, [showSearch, filteredMessages, messages])

  const renderMessageItem = useCallback(({ item }: { item: any }) => {
    return (
      <ChatMessageRow
        item={item}
        userId={user?.id}
        onCopyMessage={handleCopyMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyMessage={handleReplyMessage}
        onEditMessage={handleEditMessage}
        onPinMessage={handlePinMessage}
        onUnpinMessage={handleUnpinMessage}
      />
    )
  }, [user?.id, handleCopyMessage, handleDeleteMessage, handleReplyMessage, handleEditMessage, handlePinMessage, handleUnpinMessage])

  useEffect(() => {
    if (__DEV__) {
      console.log('[ChatScreen] currentOtherUserId=', currentOtherUserId, 'messages=', messages.length, 'displayed=', displayedMessages.length, 'loading=', loading)
    }
  }, [currentOtherUserId, messages.length, displayedMessages.length, loading])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    // ===== LISTA DE CONVERSACIONES =====
    header: {
      padding: SPACING.md,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: TYPOGRAPHY.size.lg,
      fontWeight: '700',
      color: COLORS.textPrimary,
    },
    headerSubtitle: {
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    conversationList: {
      flex: 1,
    },
    contactsSection: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
    },
    sectionTitle: {
      fontSize: TYPOGRAPHY.size.md,
      fontWeight: '700',
      marginBottom: SPACING.md,
      color: COLORS.textPrimary,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.md,
      backgroundColor: '#F9FAFB',
      fontSize: TYPOGRAPHY.size.md,
      color: COLORS.textPrimary,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: SPACING.lg,
    },
    emptyStateTitle: {
      fontSize: TYPOGRAPHY.size.lg,
      fontWeight: '700',
      color: COLORS.textPrimary,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    emptyStateDescription: {
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginBottom: SPACING.lg,
      lineHeight: 22,
    },
    ctaButton: {
      backgroundColor: COLORS.primary,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.full,
      marginBottom: SPACING.md,
    },
    ctaButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: TYPOGRAPHY.size.md,
      textAlign: 'center',
    },
    emptyContactState: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      backgroundColor: '#F8FAFC',
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      marginBottom: SPACING.md,
    },
    emptyContactText: {
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textSecondary,
      textAlign: 'center',
    },
    hiddenInfoBox: {
      marginTop: SPACING.md,
      padding: SPACING.md,
      backgroundColor: '#EFF6FF',
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: '#DBEAFE',
    },
    hiddenInfoText: {
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    // ===== CHAT ABIERTO =====
    messageListContent: {
      paddingVertical: SPACING.sm,
    },
    errorContainer: {
      backgroundColor: '#FEE2E2',
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: '#FECACA',
    },
    errorText: {
      color: '#DC2626',
      fontSize: TYPOGRAPHY.size.sm,
      textAlign: 'center',
    },
    // ===== PESTAÑAS =====
    tabsContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    tab: {
      flex: 1,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabActive: {
      borderBottomColor: COLORS.primary,
    },
    tabText: {
      fontSize: TYPOGRAPHY.size.md,
      fontWeight: '500',
      color: COLORS.textSecondary,
    },
    tabTextActive: {
      color: COLORS.primary,
      fontWeight: '700',
    },
    // ===== CONVERSACIONES ARCHIVADAS =====
    archivedItemContainer: {
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
      backgroundColor: '#FAFAFA',
    },
    archivedActions: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
      backgroundColor: '#F3F4F6',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    recoverButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: '#EBF5FF',
      gap: SPACING.xs,
    },
    recoverButtonText: {
      color: COLORS.primary,
      fontWeight: '600',
      fontSize: TYPOGRAPHY.size.sm,
    },
    deleteForeverButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: '#FEE2E2',
      gap: SPACING.xs,
    },
    deleteForeverButtonText: {
      color: COLORS.error,
      fontWeight: '600',
      fontSize: TYPOGRAPHY.size.sm,
    },
  })

  // ===== VISTA 1: LISTA DE CONVERSACIONES =====
  if (!currentOtherUserId) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mensajes</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSubtitle}>{unreadCount} no leídos</Text>
            )}
          </View>
        </View>

        {contacts.length > 0 && (
          <View style={styles.contactsSection}>
            <Text style={styles.sectionTitle}>📱 Contactos</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Buscar contacto..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {newContacts.length > 0 ? (
                newContacts.map(contact => (
                  <ConversationItem
                    key={contact.user_id}
                    avatar={contact.avatar_url || undefined}
                    name={contact.name}
                    lastMessage={contact.description}
                    lastMessageTime={new Date().toISOString()}
                    unreadCount={0}
                    isDriver={contact.relation === 'driver'}
                    onPress={() => {
                      loadConversation(contact.user_id)
                      setSearchText('')
                    }}
                  />
                ))
              ) : (
                <View style={styles.emptyContactState}>
                  <Text style={styles.emptyContactText}>
                    Todos tus contactos ya tienen conversación activa o archivada.
                  </Text>
                </View>
              )}

              {hiddenContactsCount > 0 && (
                <View style={styles.hiddenInfoBox}>
                  <Text style={styles.hiddenInfoText}>
                    {hiddenContactsCount} contacto(s) no se muestran aquí porque ya tienen chat activo o archivado. Revisa la lista de conversaciones arriba.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Pestañas: Activos vs Archivados */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              💬 Activos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'archived' && styles.tabActive]}
            onPress={() => setActiveTab('archived')}
          >
            <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
              📁 Archivados ({archivedConversationsDetailed.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'active' ? (
          // VISTA: Conversaciones Activas
          conversations.length > 0 ? (
            <FlatList
              data={conversations.filter(c => !archivedConversations.includes(c.other_user_id))}
              keyExtractor={item => item.other_user_id}
              renderItem={({ item }) => (
                <ConversationItem
                  avatar={item.other_user_avatar}
                  name={item.other_user_name}
                  lastMessage={item.last_message}
                  lastMessageTime={item.last_message_time}
                  unreadCount={item.unread_count}
                  isDriver={contacts.some(c => c.user_id === item.other_user_id && c.relation === 'driver')}
                  onPress={() => loadConversation(item.other_user_id)}
                  onDelete={() => handleDeleteConversation(item.other_user_id)}
                />
              )}
              contentContainerStyle={{ flexGrow: conversations.length === 0 ? 1 : undefined }}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateIcon}>💬</Text>
              <Text style={styles.emptyStateTitle}>¿Cómo funciona el chat?</Text>
              <Text style={styles.emptyStateDescription}>
                Cuando completes un viaje con otro usuario, podrás enviarle mensajes de texto y notas de voz.
              </Text>

              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.ctaButtonText}>🔍 Buscar tu primer viaje</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          // VISTA: Conversaciones Archivadas
          archivedConversationsDetailed.length > 0 ? (
            <FlatList
              data={archivedConversationsDetailed}
              keyExtractor={item => item.other_user_id}
              renderItem={({ item }) => (
                <View style={styles.archivedItemContainer}>
                  <ConversationItem
                    avatar={item.other_user_avatar}
                    name={item.other_user_name}
                    lastMessage={item.last_message}
                    lastMessageTime={item.last_message_time}
                    unreadCount={0}
                    isDriver={contacts.some(c => c.user_id === item.other_user_id && c.relation === 'driver')}
                    onPress={() => {}}
                    onDelete={undefined}
                  />
                  {/* Botones: Eliminar Para Siempre + Recuperar */}
                  <View style={styles.archivedActions}>
                    <TouchableOpacity
                      style={[styles.deleteForeverButton, sendingMessage && { opacity: 0.5 }]}
                      onPress={() => handleDeleteArchivedPermanently(item.other_user_id)}
                      disabled={sendingMessage}
                    >
                      <Ionicons name="trash-bin" size={18} color={COLORS.error} />
                      <Text style={styles.deleteForeverButtonText}>🗑️ Borrar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.recoverButton, sendingMessage && { opacity: 0.5 }]}
                      onPress={() => handleRecoverConversation(item.other_user_id)}
                      disabled={sendingMessage}
                    >
                      <Ionicons name="arrow-undo" size={18} color={COLORS.primary} />
                      <Text style={styles.recoverButtonText}>↺ Recuperar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={{ flexGrow: 1 }}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateIcon}>📁</Text>
              <Text style={styles.emptyStateTitle}>Sin conversaciones archivadas</Text>
              <Text style={styles.emptyStateDescription}>
                Las conversaciones que archives aparecerán aquí.
              </Text>
            </View>
          )
        )}
      </SafeAreaView>
    )
  }

  // ===== VISTA 2: CHAT ABIERTO =====
  const otherUserInfo = conversations.find(c => c.other_user_id === currentOtherUserId)
  const isDriver = contacts.some(c => c.user_id === currentOtherUserId && c.relation === 'driver')
  
  // Verificar si el otro usuario está online basado en su último mensaje
  // Si el último mensaje fue hace menos de 5 minutos, asumimos que está activo
  const isOnlineNow = otherUserInfo && otherUserInfo.last_message_time
    ? (() => {
        try {
          const lastMessageTime = new Date(otherUserInfo.last_message_time).getTime()
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
          return lastMessageTime > fiveMinutesAgo
        } catch (e) {
          return false
        }
      })()
    : false

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
      {/* Header mejorado con info del conductor */}
      <ChatHeader
        name={otherUserInfo?.other_user_name || 'Usuario'}
        avatar={otherUserInfo?.other_user_avatar}
        rating={isDriver ? 4.8 : undefined}
        isDriver={isDriver}
        isVerified={isDriver}
        isOnline={isOnlineNow}
        onBack={() => setCurrentOtherUserId(null)}
        onProfilePress={() => {}}
        onSearchPress={() => setShowSearch(!showSearch)}
        onOptionsPress={handleOpenChatOptions}
      />

      {/* Mensajes fijados */}
      {pinnedMessages.length > 0 && (
        <PinnedMessageBar
          pinnedMessages={pinnedMessages}
          onMessagePress={(msg) => {
            // Scroll al mensaje fijado o mostrar detalles
            // @ts-ignore - msg type handling
            console.log('Clicked pinned message:', msg.id)
          }}
          onUnpin={handleUnpinMessage}
        />
      )}

      {/* Menú contextual de opciones del chat */}
      {showChatMenu && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
          onPress={() => setShowChatMenu(false)}
          activeOpacity={1}
        >
          <View style={{ position: 'absolute', top: 50, right: SPACING.md, backgroundColor: 'white', borderRadius: 8, ...SHADOWS.lg }}>
            <TouchableOpacity
              onPress={() => {
                setShowChatMenu(false)
                Alert.alert('Perfil', otherUserInfo?.other_user_name, [{ text: 'OK' }])
              }}
              style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="person-circle" size={18} color={COLORS.primary} />
              <Text style={{ marginLeft: SPACING.sm, fontSize: TYPOGRAPHY.size.md, color: COLORS.textPrimary }}>Ver perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowChatMenu(false)
                Alert.alert(
                  '¿Bloquear usuario?',
                  `¿Deseas bloquear a ${otherUserInfo?.other_user_name}?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Bloquear', style: 'destructive', onPress: () => {
                      Alert.alert('Usuario bloqueado', `No podrás ver mensajes de ${otherUserInfo?.other_user_name}`)
                    }}
                  ]
                )
              }}
              style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="ban" size={18} color={COLORS.warning} />
              <Text style={{ marginLeft: SPACING.sm, fontSize: TYPOGRAPHY.size.md, color: COLORS.warning }}>Bloquear usuario</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowChatMenu(false)
                Alert.alert('Reportar', `¿Reportar a ${otherUserInfo?.other_user_name}?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Reportar', style: 'destructive', onPress: () => {
                    Alert.alert('Reporte enviado', 'Nuestro equipo revisará tu reporte')
                  }}
                ])
              }}
              style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="flag" size={18} color={COLORS.error} />
              <Text style={{ marginLeft: SPACING.sm, fontSize: TYPOGRAPHY.size.md, color: COLORS.error }}>Reportar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Mensajes agrupados por fecha */}
      {loading && messages.length === 0 ? (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {showSearch && (
            <SearchBar
              searchText={searchText}
              onSearchChange={setSearchText}
              onClear={() => {
                setSearchText('')
                setShowSearch(false)
              }}
              matchCount={filteredMessages.length}
              totalCount={messages.length}
            />
          )}
          <FlatList
            ref={flatListRef}
            data={displayedMessages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messageListContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            onEndReachedThreshold={0.5}
          onEndReached={() => setScrollToBottom(true)}
          onMomentumScrollBegin={() => setScrollToBottom(false)}
          ListFooterComponent={
            otherUserTyping ? (
              <TypingIndicator 
                userName={otherUserInfo?.other_user_name || 'Usuario'} 
                color={COLORS.primary} 
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <Ionicons name="chatbubble-outline" size={48} color={COLORS.textSecondary} />
              <Text style={{ marginTop: SPACING.md, color: COLORS.textSecondary }}>
                Sin mensajes aún
              </Text>
            </View>
          }
        />
        </View>
      )}

      {/* Input area - Typing indicator removido (debe venir del servidor cuando otro usuario escribe) */}
      {/* Mostrar ReplyBubble si estamos respondiendo a un mensaje */}
      {replyingTo && (
        <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: '#F3F4F6', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
          <ReplyBubble
            originalMessage={replyingTo.message}
            originalSenderName={replyingTo.from_user_id === user?.id ? 'Tú' : otherUserInfo?.other_user_name || 'Usuario'}
            messageType={replyingTo.message_type}
            onPress={() => {
              // Scroll al mensaje original
              console.log('Scrolling to original message:', replyingTo.id)
            }}
            onClear={() => setReplyingTo(null)}
          />
        </View>
      )}

      {/* Mostrar indicador de edición si estamos editando */}
      {editingMessageId && (
        <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: '#F3F4F6', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary }}>Editando mensaje...</Text>
          <TouchableOpacity onPress={() => { setEditingMessageId(null); setInputText(''); }}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <MessageInput
        value={inputText}
        onChangeText={handleTyping}
        onSend={handleSendMessage}
        onEmojiPress={() => setShowEmojiPickerMain(!showEmojiPickerMain)}
        onRecordPress={async () => {
          const started = await startRecording()
          if (!started) {
            Alert.alert('Error', 'No se pudieron obtener permisos para acceder al micrófono')
          }
        }}
        onCancelRecord={async () => await cancelRecording()}
        onSendAudio={handleSendAudio}
        isRecording={isRecording}
        isLoading={loading}
        editingMessageId={editingMessageId}
        sendingMessage={sendingMessage}
        isUploadingAudio={isUploadingAudio}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Emoji picker para input */}
      <EmojiPicker
        visible={showEmojiPickerMain}
        onSelectEmoji={handleAddEmojiToInput}
        onClose={() => setShowEmojiPickerMain(false)}
      />

      {/* Toast temporal - se auto-cierra después de 2 segundos */}
      {toastMessage && (
        <View style={{
          position: 'absolute',
          bottom: 100,
          left: SPACING.md,
          right: SPACING.md,
          backgroundColor: toastMessage.startsWith('✓') ? '#34C759' : '#FF3B30',
          borderRadius: RADIUS.full,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          alignItems: 'center',
          justifyContent: 'center',
          ...SHADOWS.lg
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: TYPOGRAPHY.size.md,
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {toastMessage}
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

export default ChatScreen
