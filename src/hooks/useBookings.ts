import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";

export interface Booking {
  id: string;
  route_id: string;
  passenger_id: string;
  seat_number: number;
  price: number;
  payment_method?: string;
  payment_status: string;
  booking_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useBookings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjustRouteAvailableSeats = useCallback(async (routeId: string, delta: number) => {
    try {
      const { data: routeData, error: routeFetchError } = await supabase
        .from("routes")
        .select("available_seats")
        .eq("id", routeId)
        .single();

      if (routeFetchError) {
        console.warn("Error fetching route for available seats adjustment:", routeFetchError);
        return;
      }

      const newAvailableSeats = Math.max((routeData?.available_seats ?? 0) + delta, 0);
      const { error: routeUpdateError } = await supabase
        .from("routes")
        .update({ available_seats: newAvailableSeats })
        .eq("id", routeId);

      if (routeUpdateError) {
        console.warn("Error updating route available seats:", routeUpdateError);
      }
    } catch (error) {
      console.warn("Error adjusting route available seats:", error);
    }
  }, []);

  const createBooking = useCallback(async (
    routeId: string,
    passengerId: string,
    seatNumber: number,
    price: number,
    paymentMethod: string = "cash",
    bookingStatus: "confirmed" | "pending" = "confirmed",
    paymentStatus: string = "pending"
  ) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: bookingError } = await supabase
        .from("bookings")
        .insert([
          {
            route_id: routeId,
            passenger_id: passengerId,
            seat_number: seatNumber,
            price,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            booking_status: bookingStatus,
          },
        ])
        .select()
        .single();

      if (bookingError) {
        if (bookingError.code === '23505' || bookingError.message.includes('unique')) {
          const customError = new Error('Este asiento ya fue reservado. Por favor selecciona otro.');
          ;(customError as any).code = 'SEAT_ALREADY_RESERVED';
          throw customError;
        }
        throw bookingError;
      }

      if (bookingStatus === 'confirmed') {
        await adjustRouteAvailableSeats(routeId, -1);
      }

      return data;
    } catch (err: any) {
      const message = err.message || "Error creating booking";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [adjustRouteAvailableSeats]);

  const reservePendingBookings = useCallback(async (
    routeId: string,
    passengerId: string,
    seatNumbers: number[],
    price: number
  ) => {
    try {
      setError(null);
      setLoading(true);

      const insertRows = seatNumbers.map((seat_number) => ({
        route_id: routeId,
        passenger_id: passengerId,
        seat_number,
        price,
        payment_method: 'pending',
        payment_status: 'pending',
        booking_status: 'pending',
      }));

      const { data, error: bookingError } = await supabase
        .from('bookings')
        .insert(insertRows)
        .select();

      if (bookingError) {
        if (bookingError.code === '23505' || bookingError.message.includes('unique')) {
          const customError = new Error('Uno o más asientos ya fueron reservados. Vuelve a seleccionar.');
          ;(customError as any).code = 'SEAT_ALREADY_RESERVED';
          throw customError;
        }
        throw bookingError;
      }

      await adjustRouteAvailableSeats(routeId, -seatNumbers.length);
      return (data as Booking[]) || [];
    } catch (err: any) {
      const message = err.message || 'Error reservando asientos';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [adjustRouteAvailableSeats]);

  const finalizePendingBookings = useCallback(async (
    bookingIds: string[],
    paymentMethod: string = 'cash'
  ) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .update({ booking_status: 'confirmed', payment_status: paymentMethod, payment_method: paymentMethod })
        .in('id', bookingIds)
        .eq('booking_status', 'pending')
        .select();

      if (error) throw error;
      return (data as Booking[]) || [];
    } catch (err: any) {
      const message = err.message || 'Error confirmando reserva';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const releasePendingBookings = useCallback(async (bookingIds: string[], routeId: string) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled', payment_status: 'expired' })
        .in('id', bookingIds)
        .eq('booking_status', 'pending')
        .select('id');

      if (error) throw error;

      const releasedCount = (data as any[]).length || 0;
      if (releasedCount > 0) {
        await adjustRouteAvailableSeats(routeId, releasedCount);
      }
      return data;
    } catch (err: any) {
      const message = err.message || 'Error liberando reservas pendientes';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [adjustRouteAvailableSeats]);

  const cleanupExpiredPendingBookings = useCallback(async (routeId: string, lockMinutes = 5) => {
    try {
      const cutoff = new Date(Date.now() - lockMinutes * 60000).toISOString();
      const { data: expiredBookings, error: expiredError } = await supabase
        .from('bookings')
        .select('id')
        .eq('route_id', routeId)
        .eq('booking_status', 'pending')
        .lt('created_at', cutoff);

      if (expiredError) {
        console.warn('Error checking expired pending bookings:', expiredError);
        return;
      }

      const expiredIds = (expiredBookings as any[])?.map((booking) => booking.id) || [];
      if (!expiredIds.length) return;

      const { error: releaseError } = await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled', payment_status: 'expired' })
        .in('id', expiredIds);

      if (releaseError) {
        console.warn('Error cancelando reservas pendientes expiradas:', releaseError);
        return;
      }

      await adjustRouteAvailableSeats(routeId, expiredIds.length);
    } catch (error) {
      console.warn('Error cleaning up expired pending bookings:', error);
    }
  }, [adjustRouteAvailableSeats]);

  const getPassengerBookings = useCallback(async (passengerId: string) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select(`*, routes:route_id(*)`)
        .eq("passenger_id", passengerId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      return data;
    } catch (err: any) {
      const message = err.message || "Error fetching bookings";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getRouteBookings = useCallback(async (routeId: string, includePending = false) => {
    try {
      setError(null);
      setLoading(true);

      await cleanupExpiredPendingBookings(routeId);

      let query = supabase.from("bookings").select(`*`).eq("route_id", routeId);

      if (includePending) {
        // Include any booking that is not cancelled so seat availability matches DB constraints.
        query = query.neq("booking_status", "cancelled");
      } else {
        query = query.eq("booking_status", "confirmed");
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      return data;
    } catch (err: any) {
      const message = err.message || "Error fetching route bookings";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cleanupExpiredPendingBookings]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    try {
      setError(null);
      setLoading(true);

      // First, get the booking details BEFORE cancelling
      const { data: bookingData, error: fetchError } = await supabase
        .from("bookings")
        .select("id, route_id")
        .eq("id", bookingId)
        .single();

      if (fetchError) throw new Error("Reserva no encontrada");
      if (!bookingData) throw new Error("Reserva no existe");

      // Update booking status
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ booking_status: "cancelled", payment_status: "refunded" })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // Increment available_seats for the route
      if (bookingData.route_id) {
        // Get current available_seats value
        const { data: routeData, error: routeFetchError } = await supabase
          .from("routes")
          .select("available_seats")
          .eq("id", bookingData.route_id)
          .single();

        if (!routeFetchError && routeData) {
          const newAvailableSeats = (routeData.available_seats || 0) + 1;
          const { error: routeUpdateError } = await supabase
            .from("routes")
            .update({ available_seats: newAvailableSeats })
            .eq("id", bookingData.route_id);

          if (routeUpdateError) {
            console.warn("Error incrementing available seats:", routeUpdateError);
            // Don't throw - the booking was already cancelled
          }
        }
      }

      return bookingData;
    } catch (err: any) {
      const message = err.message || "Error cancelling booking";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createBooking,
    reservePendingBookings,
    finalizePendingBookings,
    releasePendingBookings,
    getPassengerBookings,
    getRouteBookings,
    cancelBooking,
  };
};
