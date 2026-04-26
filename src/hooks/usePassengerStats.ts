import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface PassengerStats {
  totalTrips: number;
  totalSpent: number;
  averagePerTrip: number;
}

/**
 * Hook para cargar estadísticas del pasajero en TIEMPO REAL
 * Calcula basado en:
 * - Bookings completados (bookings.booking_status = 'completed')
 * - Con pago completado (bookings.payment_status = 'completed')
 */
export const usePassengerStats = (passengerId?: string) => {
  const [stats, setStats] = useState<PassengerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!passengerId) {
      setStats(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1️⃣ OBTENER TODOS LOS BOOKINGS DEL PASAJERO
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, price, booking_status, payment_status, created_at')
        .eq('passenger_id', passengerId);

      if (bookingsError) {
        throw new Error(`Error loading bookings: ${bookingsError.message}`);
      }

      if (!bookings || bookings.length === 0) {
        setStats({
          totalTrips: 0,
          totalSpent: 0,
          averagePerTrip: 0,
        });
        setLoading(false);
        return;
      }

      // 2️⃣ CALCULAR ESTADÍSTICAS
      // Solo contar bookings completados con pago completado
      const completedBookings = bookings.filter(
        (b) => b.booking_status === 'completed' && b.payment_status === 'completed'
      );

      const totalTrips = completedBookings.length;
      const totalSpent = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
      const averagePerTrip = totalTrips > 0 ? Math.round(totalSpent / totalTrips) : 0;

      setStats({
        totalTrips,
        totalSpent,
        averagePerTrip,
      });
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error in usePassengerStats:', errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  }, [passengerId]);

  // Cargar stats cuando el componente monta o cuando cambia passengerId
  useEffect(() => {
    loadStats();
  }, [passengerId, loadStats]);

  return {
    stats,
    loading,
    error,
    loadStats,
    refetch: loadStats,
  };
};
