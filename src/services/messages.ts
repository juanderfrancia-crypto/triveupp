import { supabase } from './supabase'
import { sendPushNotificationToUser } from './pushNotifications'

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
