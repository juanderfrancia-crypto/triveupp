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

      const { data, error: fetchError } = await supabase
        .from('available_rides')
        .select('*')
        .order('departure_time', { ascending: true })

      if (fetchError) {
        console.error('Error fetching available rides:', fetchError)
        setError(fetchError.message)
        return
      }

      setRides((data as AvailableRide[]) || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Exception fetching rides:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Setup realtime subscription
  useEffect(() => {
    // Fetch initial data
    fetchAvailableRides()

    // Subscribe to changes on routes table
    // (booking changes affect available_seats, which triggers route updates)
    const channel = supabase
      .channel('available-rides-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Any change
          schema: 'public',
          table: 'routes',
          filter: `status=eq.scheduled`, // Only scheduled routes
        },
        (payload) => {
          console.log('Route change detected:', payload)
          // Refetch when routes table changes
          fetchAvailableRides()
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error')
          setError('Realtime connection error')
        }
      })

    setSubscription(channel)

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
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
