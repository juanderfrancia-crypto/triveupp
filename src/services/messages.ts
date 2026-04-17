import { supabase } from './supabase'
import { sendPushNotificationToUser } from './pushNotifications'

export interface Message {
  id: string
  from_user_id: string
  to_user_id: string
  booking_id?: string
  message: string
  message_type?: 'text' | 'audio'
  audio_url?: string
  audio_duration?: number
  is_audio_listened?: boolean
  is_read: boolean
  read_at?: string
  created_at: string
  // FASE 2 - Advanced features
  reply_to_id?: string
  is_pinned?: boolean
  edited_at?: string
  edited_by?: string
}

export interface Conversation {
  other_user_id: string
  other_user_name: string
  other_user_avatar?: string
  last_message: string
  last_message_time: string
  unread_count: number
}

export interface ChatContact {
  user_id: string
  name: string
  avatar_url?: string | null
  relation: 'driver' | 'passenger'
  description: string
}

// ============================================
// OBTENER CONTACTOS DE CHAT A PARTIR DE TUS VIAJES
// ============================================

export const getChatContactsForUser = async (userId: string): Promise<ChatContact[]> => {
  try {
    const contactsMap = new Map<string, ChatContact>()

    // 1. Si soy pasajero, obtengo los conductores de mis bookings.
    const { data: passengerBookings, error: passengerBookingsError } = await supabase
      .from('bookings')
      .select('route_id')
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (passengerBookingsError) throw passengerBookingsError

    const passengerRouteIds = Array.from(new Set((passengerBookings || []).map((booking) => booking.route_id)))
    if (passengerRouteIds.length > 0) {
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select('id, driver_id, driver_name, origin, destination, departure_time')
        .in('id', passengerRouteIds)

      if (routes && routes.length > 0) {
        const driverIds = Array.from(new Set(routes.map((route) => route.driver_id).filter(Boolean)))
        const { data: drivers, error: driverProfilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', driverIds)

        if (driverProfilesError) throw driverProfilesError

        const driverMap = new Map((drivers || []).map((driver) => [driver.id, driver]))

        for (const route of routes) {
          if (!route.driver_id) continue
          const driver = driverMap.get(route.driver_id)
          if (!driver) continue

          if (!contactsMap.has(driver.id)) {
            contactsMap.set(driver.id, {
              user_id: driver.id,
              name: driver.name || route.driver_name || 'Conductor',
              avatar_url: driver.avatar_url,
              relation: 'driver',
              description: `Conductor de ${route.origin} → ${route.destination}`,
            })
          }
        }
      }
    }

    // 2. Si soy conductor, obtengo los pasajeros de mis rutas.
    const { data: myRoutes, error: myRoutesError } = await supabase
      .from('routes')
      .select('id')
      .eq('driver_id', userId)
      .limit(50)

    if (myRoutesError) throw myRoutesError

    const driverRouteIds = Array.from(new Set((myRoutes || []).map((route) => route.id)))
    if (driverRouteIds.length > 0) {
      const { data: driverBookings, error: driverBookingsError } = await supabase
        .from('bookings')
        .select('passenger_id')
        .in('route_id', driverRouteIds)
        .order('created_at', { ascending: false })
        .limit(200)

      if (driverBookingsError) throw driverBookingsError

      const passengerIds = Array.from(new Set((driverBookings || []).map((booking) => booking.passenger_id).filter(Boolean)))
      if (passengerIds.length > 0) {
        const { data: passengers, error: passengerProfilesError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', passengerIds)

        if (passengerProfilesError) throw passengerProfilesError

        for (const passenger of passengers || []) {
          if (!contactsMap.has(passenger.id)) {
            contactsMap.set(passenger.id, {
              user_id: passenger.id,
              name: passenger.name || 'Pasajero',
              avatar_url: passenger.avatar_url,
              relation: 'passenger',
              description: 'Pasajero de tus viajes recientes',
            })
          }
        }
      }
    }

    return Array.from(contactsMap.values()).slice(0, 20)
  } catch (err: any) {
    console.error('Error fetching chat contacts:', err)
    throw err
  }
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
      const otherUserArray = msg.from_user_id === userId ? msg.to_user : msg.from_user
      const otherUser = Array.isArray(otherUserArray) ? otherUserArray[0] : otherUserArray

      if (!conversationMap.has(otherUserId) && otherUser) {
        // Contar no-leídos en esta conversación
        const unreadCount = (data || []).filter(
          m => (m.from_user_id === otherUserId && m.to_user_id === userId && !m.is_read)
        ).length

        conversationMap.set(otherUserId, {
          other_user_id: otherUserId,
          other_user_name: otherUser.name || 'Usuario',
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
// OBTENER MENSAJES DE UNA CONVERSACIÓN
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

    // Validar que no se envíe mensaje a sí mismo
    if (fromUserId === toUserId) {
      throw new Error('No puedes enviarte un mensaje a ti mismo')
    }

    // Validar que ambos IDs existan
    if (!fromUserId || !toUserId) {
      throw new Error('IDs de usuario inválidos')
    }

    // Obtener datos del remitente para la notificación (en paralelo)
    const senderProfilePromise = supabase
      .from('profiles')
      .select('name')
      .eq('id', fromUserId)
      .single()

    // 1. Insertar mensaje
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

    // 2. Obtener el token push del usuario receptor
    const { data: recipientProfile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token, name')
      .eq('id', toUserId)
      .single()

    // 3. Obtener el nombre del remitente
    const { data: senderProfile } = await senderProfilePromise

    // DEBUG: Log para ver qué está pasando
    console.log('[DEBUG sendMessage] recipientProfile:', recipientProfile)
    console.log('[DEBUG sendMessage] push_token:', recipientProfile?.push_token)
    console.log('[DEBUG sendMessage] profileError:', profileError)

    if (!profileError && recipientProfile?.push_token) {
      // 4. Enviar notificación push
      const senderName = senderProfile?.name || 'Usuario'
      console.log('[DEBUG sendMessage] Enviando notificación push a:', recipientProfile.push_token)
      
      const pushResult = await sendPushNotificationToUser(
        recipientProfile.push_token,
        `Mensaje de ${senderName}`,
        message.substring(0, 100), // Primeros 100 caracteres
        {
          type: 'message',
          from_user_id: fromUserId,
          sender_name: senderName,
          message_id: data.id,
          message_preview: message.substring(0, 100),
        }
      )
      console.log('[DEBUG sendMessage] Push result:', pushResult)
    } else {
      console.log('[DEBUG sendMessage] No se envió push - token:', recipientProfile?.push_token ? 'existe' : 'NO EXISTE')
    }

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

// ============================================
// UTILIDADES DE AUDIO
// ============================================

function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64
  const decoder = typeof atob === 'function' ? atob : globalThis.atob

  if (typeof decoder !== 'function') {
    throw new Error('El entorno no soporta atob para decodificar Base64')
  }

  const binaryString = decoder(cleanBase64)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}

// ============================================
// ENVIAR MENSAJE DE AUDIO
// ============================================

export const sendAudioMessage = async (
  fromUserId: string,
  toUserId: string,
  audioBase64: string,
  durationMs: number,
  senderName?: string,
  bookingId?: string
): Promise<Message> => {
  try {
    // Validar que no se envíe a sí mismo
    if (fromUserId === toUserId) {
      throw new Error('No puedes enviarte un mensaje a ti mismo')
    }

    if (!fromUserId || !toUserId) {
      throw new Error('IDs de usuario inválidos')
    }

    // 1. Subir archivo de audio a Storage
    const filename = `${Date.now()}.m4a`
    const candidatePaths = [
      `${fromUserId}/${filename}`,
      `audio/${fromUserId}/${filename}`,
      `audios/${fromUserId}/${filename}`,
      `messages/${fromUserId}/${filename}`,
    ]
    const audioBytes = base64ToUint8Array(audioBase64)

    let uploadedFilePath: string | null = null
    let uploadError: any = null

    for (const candidatePath of candidatePaths) {
      const { error } = await supabase.storage
        .from('audio-messages')
        .upload(candidatePath, audioBytes, {
          contentType: 'audio/m4a',
          upsert: false,
        })

      if (!error) {
        uploadedFilePath = candidatePath
        uploadError = null
        break
      }

      console.warn(`Audio upload failed for path ${candidatePath}:`, error)
      uploadError = error
    }

    if (!uploadedFilePath) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Error al subir audio: ${uploadError?.message || uploadError}`)
    }

    // 2. Obtener URL pública
    const { data: publicUrl } = supabase.storage
      .from('audio-messages')
      .getPublicUrl(uploadedFilePath)

    if (!publicUrl) {
      throw new Error('No se pudo obtener URL del audio')
    }

    // 3. Guardar mensaje en DB con tipo 'audio'
    const { data, error } = await supabase
      .from('messages')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message: `[Nota de voz: ${(durationMs / 1000).toFixed(1)}s]`,
        message_type: 'audio',
        audio_url: publicUrl.publicUrl,
        audio_duration: durationMs,
        is_audio_listened: false,
        booking_id: bookingId,
      })
      .select()
      .single()

    if (error) throw error

    // 4. Enviar notificación push
    try {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', toUserId)
        .single()

      if (recipientProfile?.push_token) {
        await sendPushNotificationToUser(
          recipientProfile.push_token,
          `Nota de voz de ${senderName || 'Usuario'}`,
          `Nota de voz - ${(durationMs / 1000).toFixed(1)}s`,
          {
            type: 'message',
            from_user_id: fromUserId,
            sender_name: senderName,
            message_id: data.id,
            message_type: 'audio',
          }
        )
      }
    } catch (pushErr) {
      console.error('Error sending push notification:', pushErr)
      // No fallar si la notificación push falla
    }

    return data
  } catch (err: any) {
    console.error('Error sending audio message:', err)
    throw err
  }
}

// ============================================
// MARCAR AUDIO COMO ESCUCHADO
// ============================================

export const markAudioAsListened = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_audio_listened: true })
      .eq('id', messageId)

    if (error) throw error
  } catch (err: any) {
    console.error('Error marking audio as listened:', err)
    throw err
  }
}

// ============================================
// ELIMINAR UN MENSAJE (Soft delete)
// ============================================

export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    console.log('🗑️ [deleteMessage] Iniciando eliminación del mensaje:', messageId)
    
    // Primero verificar que el mensaje existe
    const { data: existingMsg, error: fetchError } = await supabase
      .from('messages')
      .select('id, message, from_user_id')
      .eq('id', messageId)
      .single()

    console.log('🗑️ [deleteMessage] Mensaje encontrado:', existingMsg)
    if (fetchError) {
      console.error('🗑️ [deleteMessage] Error al buscar mensaje:', fetchError)
      throw fetchError
    }

    if (!existingMsg) {
      throw new Error('Mensaje no encontrado')
    }

    // Ahora marcar como eliminado
    const { data, error } = await supabase
      .from('messages')
      .update({ 
        message: '[Mensaje eliminado]',
        message_type: 'text'
      })
      .eq('id', messageId)
      .select()

    console.log('🗑️ [deleteMessage] Response data:', data)
    console.log('🗑️ [deleteMessage] Response error:', error)
    console.log('🗑️ [deleteMessage] Filas actualizadas:', data?.length || 0)

    if (error) {
      console.error('🗑️ [deleteMessage] Error from Supabase:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('🗑️ [deleteMessage] ⚠️ No se actualizó ninguna fila. Verifica permisos RLS')
      throw new Error('No se pudo actualizar el mensaje - verifica permisos')
    }
    
    console.log('✓ [deleteMessage] Mensaje marcado como eliminado:', messageId)
  } catch (err: any) {
    console.error('❌ [deleteMessage] Error:', err.message || err)
    throw err
  }
}

// ============================================
// ARCHIVAR/ELIMINAR CONVERSACIÓN COMPLETA
// ============================================

export const archiveConversation = async (userId: string, otherUserId: string): Promise<void> => {
  try {
    console.log('📁 [archiveConversation] Archivando conversación con:', otherUserId)
    
    const { error } = await supabase
      .from('archived_conversations')
      .insert({
        user_id: userId,
        other_user_id: otherUserId,
      })

    if (error) {
      console.error('Error archivando conversación:', error)
      throw error
    }

    console.log('✓ [archiveConversation] Conversación archivada:', otherUserId)
  } catch (err: any) {
    console.error('❌ [archiveConversation] Error:', err.message || err)
    throw err
  }
}

// Desarchivar conversación
export const unarchiveConversation = async (userId: string, otherUserId: string): Promise<void> => {
  try {
    console.log('📁 [unarchiveConversation] Desarchivando conversación con:', otherUserId)
    
    const { error } = await supabase
      .from('archived_conversations')
      .delete()
      .eq('user_id', userId)
      .eq('other_user_id', otherUserId)

    if (error) {
      console.error('Error desarchivando conversación:', error)
      throw error
    }

    console.log('✓ [unarchiveConversation] Conversación desarchivada:', otherUserId)
  } catch (err: any) {
    console.error('❌ [unarchiveConversation] Error:', err.message || err)
    throw err
  }
}

// Obtener lista de conversaciones archivadas
export const getArchivedConversations = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('archived_conversations')
      .select('other_user_id')
      .eq('user_id', userId)

    if (error) throw error

    return (data || []).map(row => row.other_user_id)
  } catch (err: any) {
    console.error('Error fetching archived conversations:', err)
    throw err
  }
}

// Obtener conversaciones archivadas CON detalles
export const getArchivedConversationsDetailed = async (userId: string): Promise<Conversation[]> => {
  try {
    // Obtener IDs de archivadas
    const { data: archived, error: archivedError } = await supabase
      .from('archived_conversations')
      .select('other_user_id')
      .eq('user_id', userId)

    if (archivedError) throw archivedError

    const archivedIds = (archived || []).map(row => row.other_user_id)
    if (archivedIds.length === 0) return []

    // Obtener detalles de esos usuarios en tabla conversaciones
    const { data: conversations, error: convError } = await supabase
      .from('messages')
      .select('from_user_id, to_user_id')
      .or(`and(from_user_id.eq.${userId},to_user_id.in.(${archivedIds.join(',')})),and(from_user_id.in.(${archivedIds.join(',')}),to_user_id.eq.${userId})`)
      .order('created_at', { ascending: false })

    if (convError) throw convError

    // Construir lista de conversaciones archivadas
    const archConvMap = new Map<string, Conversation>()
    
    for (const archivedId of archivedIds) {
      // Obtener perfil del otro usuario
      const { data: otherProfile, error: profileError } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', archivedId)
        .single()

      if (profileError) continue

      // Obtener último mensaje con ese usuario
      const { data: lastMsg, error: msgError } = await supabase
        .from('messages')
        .select('message, created_at, from_user_id, to_user_id, is_read')
        .or(`and(from_user_id.eq.${userId},to_user_id.eq.${archivedId}),and(from_user_id.eq.${archivedId},to_user_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      archConvMap.set(archivedId, {
        other_user_id: archivedId,
        other_user_name: otherProfile.name || 'Usuario',
        other_user_avatar: otherProfile.avatar_url,
        last_message: lastMsg?.message || '[Sin mensajes]',
        last_message_time: lastMsg?.created_at || new Date().toISOString(),
        unread_count: 0, // Las archivadas no tienen count de no leídos
      })
    }

    return Array.from(archConvMap.values())
  } catch (err: any) {
    console.error('Error fetching archived conversations detailed:', err)
    throw err
  }
}

// Eliminar PERMANENTEMENTE una conversación archivada (también elimina mensajes)
export const deleteArchivedConversationPermanently = async (userId: string, otherUserId: string): Promise<void> => {
  try {
    console.log('🗑️ [deleteArchivedConversationPermanently] Eliminando para siempre:', otherUserId)
    
    // 1. Eliminar mensajes donde yo soy el remitente Y el otro es receptor
    const { error: error1 } = await supabase
      .from('messages')
      .delete()
      .eq('from_user_id', userId)
      .eq('to_user_id', otherUserId)

    if (error1) {
      console.warn('⚠️ [deleteArchivedConversationPermanently] Warning (msg 1):', error1)
    }

    // 2. Eliminar mensajes donde el otro es remitente Y yo soy receptor
    const { error: error2 } = await supabase
      .from('messages')
      .delete()
      .eq('from_user_id', otherUserId)
      .eq('to_user_id', userId)

    if (error2) {
      console.warn('⚠️ [deleteArchivedConversationPermanently] Warning (msg 2):', error2)
    }

    // 3. Eliminar del archivo
    const { error: archiveError } = await supabase
      .from('archived_conversations')
      .delete()
      .eq('user_id', userId)
      .eq('other_user_id', otherUserId)

    if (archiveError) {
      console.error('Error eliminando permanentemente:', archiveError)
      throw archiveError
    }

    console.log('✓ [deleteArchivedConversationPermanently] Eliminado permanentemente:', otherUserId)
  } catch (err: any) {
    console.error('❌ [deleteArchivedConversationPermanently] Error:', err.message || err)
    throw err
  }
}

// ============================================
// FASE 2: REPLY/QUOTE, PIN, EDIT
// ============================================

// Enviar respuesta a un mensaje
export const sendReplyMessage = async (
  fromUserId: string,
  toUserId: string,
  message: string,
  replyToId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message,
        message_type: 'text',
        reply_to_id: replyToId,
        is_read: false,
      })

    if (error) throw error
    console.log('Respuesta enviada:', replyToId)
  } catch (err: any) {
    console.error('Error sending reply:', err)
    throw err
  }
}

// Fijar un mensaje
export const pinMessage = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_pinned: true })
      .eq('id', messageId)

    if (error) throw error
    console.log('Mensaje fijado:', messageId)
  } catch (err: any) {
    console.error('Error pinning message:', err)
    throw err
  }
}

// Desfijar un mensaje
export const unpinMessage = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_pinned: false })
      .eq('id', messageId)

    if (error) throw error
    console.log('Mensaje desfijado:', messageId)
  } catch (err: any) {
    console.error('Error unpinning message:', err)
    throw err
  }
}

// Obtener mensajes fijados de una conversación
export const getPinnedMessages = async (
  userId1: string,
  userId2: string
): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(from_user_id.eq.${userId1},to_user_id.eq.${userId2}),and(from_user_id.eq.${userId2},to_user_id.eq.${userId1})`
      )
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error('Error getting pinned messages:', err)
    return []
  }
}

// Editar un mensaje
export const editMessage = async (
  messageId: string,
  newMessage: string,
  userId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({
        message: newMessage,
        edited_at: new Date().toISOString(),
        edited_by: userId,
      })
      .eq('id', messageId)

    if (error) throw error
    console.log('Mensaje editado:', messageId)
  } catch (err: any) {
    console.error('Error editing message:', err)
    throw err
  }
}

// Obtener un mensaje específico (para reply)
export const getMessageById = async (messageId: string): Promise<Message | null> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (error) throw error
    return data as Message
  } catch (err: any) {
    console.error('Error getting message:', err)
    return null
  }
}

