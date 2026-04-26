import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getChatContactsForUser,
  getConversations,
  getConversation,
  sendMessage,
  markAsRead,
  deleteConversation,
  subscribeToNewMessages,
  subscribeToMessageChanges,
  subscribeToTypingIndicator,
  updateUserOnlineStatus,
  Message,
  Conversation,
  ChatContact,
} from '../services/messages'

export const useChat = (userId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentOtherUserId, setCurrentOtherUserId] = useState<string | null>(null)
  const [otherUserTyping, setOtherUserTyping] = useState(false)

  // Refs para limpiar suscripciones
  const messagesChannelRef = useRef<(() => void) | null>(null)
  const changesChannelRef = useRef<(() => void) | null>(null)
  const typingChannelRef = useRef<(() => void) | null>(null)

  // ============================================
  // CARGAR CONVERSACIONES (polling cada 5s - reducido para salvar recursos)
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

    // Polling reducido a 5s para mantener sync sin sobrecargar
    const interval = setInterval(loadConversations, 5000)
    return () => clearInterval(interval)
  }, [userId])

  // ============================================
  // CARGAR CONTACTOS
  // ============================================

  useEffect(() => {
    if (!userId) return

    const loadContacts = async () => {
      try {
        const data = await getChatContactsForUser(userId)
        setContacts(data)
      } catch (err: any) {
        console.error('Error loading chat contacts:', err)
      }
    }

    loadContacts()
  }, [userId])

  // ============================================
  // CARGAR MENSAJES DE UNA CONVERSACIÓN
  // ============================================

  const loadConversation = useCallback(
    async (otherUserId: string) => {
      if (!userId) return

      // Evitar cargar conversación contigo mismo
      if (otherUserId === userId) {
        console.warn('[useChat] ⚠️ No se puede cargar conversación contigo mismo')
        return
      }

      if (__DEV__) {
        console.log('[useChat] loadConversation', { userId, otherUserId })
      }

      try {
        setError(null)
        setLoading(true)
        setCurrentOtherUserId(otherUserId)

        // Limpiar suscripciones anteriores
        if (messagesChannelRef.current) {
          messagesChannelRef.current()
          messagesChannelRef.current = null
        }
        if (changesChannelRef.current) {
          changesChannelRef.current()
          changesChannelRef.current = null
        }
        if (typingChannelRef.current) {
          typingChannelRef.current()
          typingChannelRef.current = null
        }

        const data = await getConversation(userId, otherUserId)
        if (__DEV__) {
          console.log('[useChat] loadConversation result', { otherUserId, length: (data || []).length })
        }
        setMessages(data)

        // ============================================
        // REALTIME: Suscribirse a nuevos mensajes
        // ============================================
        messagesChannelRef.current = subscribeToNewMessages(
          userId,
          otherUserId,
          (newMessage) => {
            if (__DEV__) {
              console.log('[useChat] 📩 Nuevo mensaje recibido:', newMessage.id)
            }
            setMessages(prev => {
              // Evitar duplicados
              if (prev.some(m => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        )

        // ============================================
        // REALTIME: Suscribirse a cambios en mensajes (edit, delete)
        // ============================================
        const messageIds = data.map(m => m.id)
        if (messageIds.length > 0) {
          changesChannelRef.current = subscribeToMessageChanges(
            messageIds,
            (messageId, changes) => {
              if (__DEV__) {
                console.log('[useChat] 📝 Mensaje actualizado:', messageId, changes)
              }
              setMessages(prev =>
                prev.map(m =>
                  m.id === messageId ? { ...m, ...changes } : m
                )
              )
            }
          )
        }

        // ============================================
        // REALTIME: Escuchar typing del otro usuario
        // ============================================
        typingChannelRef.current = subscribeToTypingIndicator(
          userId,
          otherUserId,
          (isTyping) => {
            if (__DEV__) {
              console.log('[useChat] ⏳ Otro usuario typing:', isTyping)
            }
            setOtherUserTyping(isTyping)
          }
        )
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
  // LIMPIEZA AL CAMBIAR DE CONVERSACIÓN O DESMONTAR
  // ============================================

  useEffect(() => {
    return () => {
      // Limpiar todas las suscripciones
      if (messagesChannelRef.current) {
        messagesChannelRef.current()
        messagesChannelRef.current = null
      }
      if (changesChannelRef.current) {
        changesChannelRef.current()
        changesChannelRef.current = null
      }
      if (typingChannelRef.current) {
        typingChannelRef.current()
        typingChannelRef.current = null
      }
    }
  }, [])

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
        if (__DEV__) {
          console.log('[useChat] send result', { userId, currentOtherUserId, newMessage })
        }
        setMessages(prev => {
          // Evitar duplicados (el realtime también podría agregar)
          if (prev.some(m => m.id === newMessage.id)) {
            return prev
          }
          return [...prev, newMessage]
        })
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

  // ============================================
  // ACTUALIZAR ESTADO ONLINE (llamar desde ChatScreen)
  // ============================================

  useEffect(() => {
    if (!userId) return

    // Actualizar online status inmediatamente
    updateUserOnlineStatus(userId)

    // Y luego cada 30 segundos mientras la app está activa
    const interval = setInterval(() => {
      updateUserOnlineStatus(userId)
    }, 30000)

    return () => clearInterval(interval)
  }, [userId])

  return {
    conversations,
    contacts,
    messages,
    loading,
    error,
    unreadCount,
    loadConversation,
    send,
    deleteChat,
    currentOtherUserId,
    setCurrentOtherUserId,
    otherUserTyping,
  }
}