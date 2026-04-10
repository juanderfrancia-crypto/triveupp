import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { checkDriverApprovalStatus } from "../services/driverApproval";

export interface Route {
  id: string;
  driver_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price_per_seat: number;
  total_seats: number;
  available_seats: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_plate: string;
  vehicle_color: string;
  vehicle_type?: 'auto' | 'taxi' | 'busetica' | 'buseta';
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  driver_name?: string;
  driver_rating?: number;
  driver_trips?: number;
}

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = async (
    origin?: string,
    destination?: string,
    vehicleType?: 'all' | 'auto' | 'taxi' | 'busetica' | 'buseta'
  ) => {
    try {
      setError(null);
      setLoading(true);

      let query = supabase
        .from("routes")
        .select("*")
        .eq("status", "scheduled")
        .gt("available_seats", 0);

      if (vehicleType && vehicleType !== 'all') {
        query = query.eq('vehicle_type', vehicleType);
      }

      if (origin) {
        query = query.ilike("origin", `%${origin}%`);
      }

      if (destination) {
        query = query.ilike("destination", `%${destination}%`);
      }

      const { data, error: fetchError } = await query.order("departure_time", {
        ascending: true,
      });

      if (fetchError) throw fetchError;

      setRoutes(data || []);
      return data;
    } catch (err: any) {
      const message = err.message || "Error fetching routes";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getRouteById = async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      const message = err.message || "Error fetching route";
      setError(message);
      return null;
    }
  };

  const createRoute = async (routeData: Omit<Route, "id" | "created_at" | "updated_at">) => {
    try {
      setError(null);

      // Validate driver approval status
      const driverId = routeData.driver_id;
      const approvalStatus = await checkDriverApprovalStatus(driverId);

      if (!approvalStatus.canCreateRoutes) {
        let errorMsg = 'No puedes crear rutas. ';
        
        if (!approvalStatus.isDriver) {
          errorMsg += 'Solo los conductores pueden crear rutas.';
        } else if (!approvalStatus.isVerified) {
          errorMsg += 'Tu cuenta de conductor aún no ha sido verificada.';
        } else if (approvalStatus.pendingDocuments.length > 0) {
          errorMsg += `Faltan documentos por aprobar: ${approvalStatus.pendingDocuments.join(', ')}`;
        }

        throw new Error(errorMsg);
      }

      // Create the route
      const { data, error } = await supabase
        .from("routes")
        .insert([routeData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      const message = err.message || "Error creating route";
      setError(message);
      throw err;
    }
  };

  return {
    routes,
    loading,
    error,
    fetchRoutes,
    getRouteById,
    createRoute,
  };
};
