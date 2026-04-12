import { useState, useEffect, useCallback } from 'react'
import {
  getChatContactsForUser,
  getConversations,
  getConversation,
  sendMessage,
  markAsRead,
  deleteConversation,
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
  }
}
