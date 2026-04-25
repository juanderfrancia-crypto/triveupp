import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface AvailableRide {
  id: string
  driver_id: string
  origin: string
  destination: string
  departure_time: string
  arrival_time: string
  price_per_seat: number
  total_seats: number
  available_seats: number
  seats_available_count: number
  vehicle_type: string
  vehicle_color: string
  vehicle_plate: string
  status: string
  // Driver info
  driver_user_id: string
  driver_name: string
  driver_phone: string
  driver_photo: string | null
  driver_rating: number
  driver_review_count: number
  created_at: string
  updated_at: string
}

export const useAvailableRides = () => {
  const [rides, setRides] = useState<AvailableRide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null)

  // Fetch initial data
  const fetchAvailableRides = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 BUSCANDO RUTAS DISPONIBLES (MODELO INFORMAL):')
      console.log('  Mostrando rutas que salen AHORA o próximas 24 horas')
      console.log('  Permite conductores informales que publican su ruta al instante')
      
      const { data, error: fetchError } = await supabase
        .from('available_rides')
        .select('*')
        // La VIEW already filtra por: departure_time > NOW() - 15 min AND < NOW() + 24 horas
        .order('departure_time', { ascending: true })

      if (fetchError) {
        console.error('❌ Error fetching available rides:', fetchError)
        setError(fetchError.message)
        return
      }

      console.log(`✅ Se encontraron ${(data || []).length} rutas disponibles:`)
      if (data && data.length > 0) {
        data.forEach((ride: any) => {
          const departureTime = new Date(ride.departure_time)
          const now = new Date()
          const minutosHasta = Math.round((departureTime.getTime() - now.getTime()) / 60000)
          const tiempoTexto = minutosHasta < 0 
            ? `hace ${Math.abs(minutosHasta)} min`
            : `en ${minutosHasta} min`
          console.log(`  - ${ride.origin} → ${ride.destination} (${tiempoTexto})`)
        })
      }

      setRides((data as AvailableRide[]) || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Exception fetching rides:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Setup realtime subscription + polling
  useEffect(() => {
    // Fetch initial data
    fetchAvailableRides()

    // 🔔 REALTIME: Listen to BOOKING changes (key to instant updates)
    // When someone books a seat, we need to refetch available rides
    const bookingChannel = supabase
      .channel('available-rides-bookings')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings', // ← KEY CHANGE: Listen to BOOKINGS not ROUTES
        },
        (payload) => {
          console.log('📍 Booking change detected, refetching rides...', payload.eventType)
          // Refetch immediately when booking changes
          setTimeout(() => fetchAvailableRides(), 500) // Small delay to let trigger complete
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime channel error for bookings')
        }
      })

    // 🔔 REALTIME: Also listen to ROUTE changes (for driver updates)
    const routeChannel = supabase
      .channel('available-rides-routes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Only updates, not inserts/deletes
          schema: 'public',
          table: 'routes',
          filter: `status=eq.scheduled`,
        },
        (payload) => {
          console.log('🚗 Route change detected, refetching rides...', payload.new)
          fetchAvailableRides()
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime channel error for routes')
        }
      })

    // ⏰ POLLING: Fallback poll every 3 seconds for instant updates
    // (realtime can have slight delays, this ensures consistency)
    const pollingInterval = setInterval(() => {
      console.log('⏱️ Polling available rides...')
      fetchAvailableRides()
    }, 3000)

    setSubscription(bookingChannel)

    // Cleanup
    return () => {
      if (bookingChannel) supabase.removeChannel(bookingChannel)
      if (routeChannel) supabase.removeChannel(routeChannel)
      clearInterval(pollingInterval)
    }
  }, [fetchAvailableRides])

  const refetch = useCallback(() => {
    fetchAvailableRides()
  }, [fetchAvailableRides])

  return {
    rides,
    loading,
    error,
    refetch,
  }
}
