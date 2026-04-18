import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Flag para determinar si push notifications están disponibles
const isPushNotificationsAvailable = Platform.OS === 'ios' || Platform.OS === 'android'

// Importar lazy para evitar errores
let Notifications: any = null
try {
  Notifications = require('expo-notifications')
} catch (error) {
  console.warn('expo-notifications no disponible')
}

// Configurar el manejador de notificaciones
export const configureNotificationHandler = () => {
  if (!isPushNotificationsAvailable || !Notifications) {
    console.log('Push notifications no disponibles en esta plataforma')
    return
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  } catch (error: any) {
    console.warn('Push notifications handler not available:', error.message)
  }
}

// Obtener token de notificación push
export const getPushNotificationToken = async (): Promise<string | null> => {
  try {
    // Android Expo Go (SDK 53+) no soporta push notifications remotas
    if (!isPushNotificationsAvailable || !Notifications) {
      console.log('[DEBUG getPushNotificationToken] Push notifications no disponibles en esta plataforma')
      return null
    }

    console.log('[DEBUG getPushNotificationToken] Platform:', Platform.OS)
    console.log('[DEBUG getPushNotificationToken] Device.isDevice:', Device.isDevice)

    // Verificar si es dispositivo físico
    if (!Device.isDevice) {
      console.log('[DEBUG getPushNotificationToken] ⚠️ No es dispositivo físico o emulador detectado')
      // En Android real a veces Device.isDevice no funciona correctamente
      // Si es Android, intentamos igual obtener el token
      if (Platform.OS !== 'android') {
        return null
      }
      console.log('[DEBUG getPushNotificationToken] Intentando obtener token de todas formas (Android)...')
    }

    console.log('[DEBUG getPushNotificationToken] Solicitando permisos...')

    // Obtener permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    console.log('[DEBUG getPushNotificationToken] Status actual:', existingStatus)
    
    let finalStatus = existingStatus

    // Si no tiene permiso, solicitar
    if (existingStatus !== 'granted') {
      console.log('[DEBUG getPushNotificationToken] Pidiendo permisos...')
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
      console.log('[DEBUG getPushNotificationToken] Resultado de solicitud:', status)
    }

    // Si NO tiene permiso, retornar null
    if (finalStatus !== 'granted') {
      console.log('[DEBUG getPushNotificationToken] ❌ Permisos denegados - status:', finalStatus)
      return null
    }

    console.log('[DEBUG getPushNotificationToken] ✅ Permisos otorgados, obteniendo token...')

    // Obtener el token
    let token = null
    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'trive-app',
      })
      token = pushTokenData.data
    } catch (tokenError: any) {
      console.warn('[DEBUG getPushNotificationToken] Error obteniendo token con projectId:', tokenError.message)
      // Intentar sin projectId como fallback
      try {
        console.log('[DEBUG getPushNotificationToken] Intentando sin projectId...')
        const pushTokenData = await Notifications.getExpoPushTokenAsync()
        token = pushTokenData.data
      } catch (fallbackError: any) {
        console.warn('[DEBUG getPushNotificationToken] Error obteniendo token (fallback):', fallbackError.message)
        throw fallbackError
      }
    }

    console.log('[DEBUG getPushNotificationToken] ✅ Token obtenido:', token)
    return token
  } catch (error: any) {
    console.error('[DEBUG getPushNotificationToken] Error final:', error.message || error)
    return null
  }
}

// Registrar token en Supabase
export const registerPushToken = async (userId: string, token: string) => {
  try {
    console.log('[DEBUG registerPushToken] Registrando token para usuario:', userId)
    
    // Validate that the provided userId matches the authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser || authUser.id !== userId) {
      console.warn('[DEBUG registerPushToken] Intento de registro de token no autorizado')
      return
    }

    // Obtener la info actual del usuario
    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('[DEBUG registerPushToken] Error fetching user:', fetchError)
      throw fetchError
    }

    console.log('[DEBUG registerPushToken] Token anterior:', user?.push_token)
    console.log('[DEBUG registerPushToken] Token nuevo:', token)

    // Si el token es diferente, actualizar
    if (user?.push_token !== token) {
      console.log('[DEBUG registerPushToken] Actualizando token en BD...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId)

      if (updateError) {
        console.error('[DEBUG registerPushToken] Error updating:', updateError)
        throw updateError
      }
      console.log('[DEBUG registerPushToken] ✅ Token actualizado exitosamente')
    } else {
      console.log('[DEBUG registerPushToken] Token ya está actualizado')
    }
  } catch (error) {
    console.error('[DEBUG registerPushToken] Error:', error)
  }
}

// Guardar preferencias locales
export const saveNotificationPreferences = async (preferences: {
  push: boolean
  email: boolean
  sms: boolean
}) => {
  try {
    await AsyncStorage.setItem(
      'notification_preferences',
      JSON.stringify(preferences)
    )
  } catch (error) {
    console.error('Error guardando preferencias:', error)
  }
}

// Cargar preferencias locales
export const loadNotificationPreferences = async () => {
  try {
    const preferences = await AsyncStorage.getItem('notification_preferences')
    if (preferences) {
      return JSON.parse(preferences)
    }
    // Retornar defaults
    return {
      push: true,
      email: true,
      sms: false,
    }
  } catch (error) {
    console.error('Error cargando preferencias:', error)
    return {
      push: true,
      email: true,
      sms: false,
    }
  }
}

// Registrar escuchador de notificaciones entrantes
export const setupNotificationListeners = (
  onNotificationReceived?: (notification: any) => void
) => {
  if (!isPushNotificationsAvailable || !Notifications) {
    return () => {} // Retornar función vacía
  }

  try {
    // Notificación recibida mientras app está en foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        console.log('Notificación recibida:', notification)
        if (onNotificationReceived) {
          onNotificationReceived(notification)
        }
      }
    )

    // Notificación presionada
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log('Notificación presionada:', response)
        // Aquí puedes manejar la navegación o acciones
      })

    // Retornar función para limpiar listeners
    return () => {
      if (notificationListener) {
        notificationListener.remove()
      }
      if (responseListener) {
        responseListener.remove()
      }
    }
  } catch (error: any) {
    console.warn('Push notification listeners not available:', error.message)
    return () => {} // Retornar función vacía si falla
  }
}

// Enviar notificación de prueba
export const sendTestNotification = async () => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '¡Hola, Trive!',
        body: 'Esta es una notificación de prueba',
        data: {
          type: 'test',
        },
      },
      trigger: {
        seconds: 2,
      },
    })
    console.log('Notificación de prueba programada')
  } catch (error) {
    console.error('Error enviando notificación de prueba:', error)
  }
}

// Enviar notificación push a un usuario por token
export const sendPushNotificationToUser = async (
  recipientToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  try {
    console.log('[DEBUG sendPushNotificationToUser] Enviando a token:', recipientToken)
    console.log('[DEBUG sendPushNotificationToUser] Título:', title)
    console.log('[DEBUG sendPushNotificationToUser] Body:', body)

    // Usar Expo Push Notifications API
    const message = {
      to: recipientToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      badge: 1,
      priority: 'high', // Android: alta prioridad
    }

    console.log('[DEBUG sendPushNotificationToUser] Payload:', JSON.stringify(message))

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()
    console.log('[DEBUG sendPushNotificationToUser] Response status:', response.status)
    console.log('[DEBUG sendPushNotificationToUser] Response:', result)

    if (!response.ok) {
      console.error('[DEBUG sendPushNotificationToUser] Error enviando notificación push:', result)
      return false
    }

    console.log('[DEBUG sendPushNotificationToUser] ✅ Notificación push enviada exitosamente')
    return true
  } catch (error) {
    console.error('[DEBUG sendPushNotificationToUser] Error:', error)
    return false
  }
}

// Enviar notificación de cancelación de viaje
export const notifyTripCancellation = async (
  bookingId: string,
  cancellerUserId: string,
  cancelReason?: string
) => {
  try {
    console.log('[DEBUG notifyTripCancellation] Enviando notificación de cancelación:', bookingId)

    // Obtener información del booking con driver y pasajero
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        passenger_id,
        routes(
          id,
          driver_id,
          origin,
          destination,
          departure_time,
          profiles(
            id,
            name,
            push_token
          )
        ),
        passenger:passenger_id(
          id,
          name,
          push_token
        )
      `
      )
      .eq('id', bookingId)
      .single()

    if (bookingError) {
      console.error('[DEBUG notifyTripCancellation] Error fetching booking:', bookingError)
      return false
    }

    if (!booking) {
      console.log('[DEBUG notifyTripCancellation] Booking no encontrado')
      return false
    }

    const route = booking.routes
    const driver = route?.profiles
    const passenger = booking.passenger

    if (!route || !driver || !passenger) {
      console.log('[DEBUG notifyTripCancellation] Información incompleta del booking')
      return false
    }

    // Determinar quién cancela y a quién notificar
    const isPassengerCancelling = cancellerUserId === booking.passenger_id
    const recipientToken = isPassengerCancelling ? driver?.push_token : passenger?.push_token
    const recipientName = isPassengerCancelling ? driver?.name : passenger?.name
    const cancellerName = isPassengerCancelling ? passenger?.name : driver?.name

    if (!recipientToken) {
      console.log('[DEBUG notifyTripCancellation] No hay push token para el destinatario')
      return false
    }

    // Construir mensaje de notificación
    const notificationTitle = isPassengerCancelling
      ? '❌ Pasajero canceló el viaje'
      : '❌ Conductor canceló el viaje'

    const routeInfo = `${route.origin} → ${route.destination}`
    const reasonText = cancelReason ? ` (${cancelReason})` : ''
    const notificationBody = `De ${cancellerName}: ${routeInfo}${reasonText}`

    console.log('[DEBUG notifyTripCancellation] Enviando a token:', recipientToken)
    console.log('[DEBUG notifyTripCancellation] Título:', notificationTitle)
    console.log('[DEBUG notifyTripCancellation] Body:', notificationBody)

    // Enviar notificación push
    const pushResult = await sendPushNotificationToUser(
      recipientToken,
      notificationTitle,
      notificationBody,
      {
        type: 'trip_cancelled',
        booking_id: bookingId,
        route_id: route.id,
        origin: route.origin,
        destination: route.destination,
        canceller_id: cancellerUserId,
        canceller_name: cancellerName,
        reason: cancelReason || 'Sin especificar',
      }
    )

    console.log('[DEBUG notifyTripCancellation] Push result:', pushResult)
    return pushResult
  } catch (error) {
    console.error('[DEBUG notifyTripCancellation] Error:', error)
    return false
  }
}
