-- ============================================================================
-- AVAILABLE_RIDES VIEW
-- Muestra rutas disponibles AHORA con asientos libres
-- Uso: SELECT * FROM available_rides ORDER BY departure_time ASC
-- ============================================================================

-- Crear VIEW
CREATE OR REPLACE VIEW available_rides AS
SELECT 
  r.id,
  r.driver_id,
  r.origin,
  r.destination,
  r.departure_time,
  r.arrival_time,
  r.price_per_seat,
  r.total_seats,
  r.available_seats,
  r.vehicle_type,
  r.vehicle_color,
  r.vehicle_plate,
  r.status,
  -- Contar asientos reservados (excluir cancelados)
  (r.total_seats - COALESCE(
    (SELECT COUNT(*) FROM bookings 
     WHERE bookings.route_id = r.id 
     AND bookings.booking_status != 'cancelled'),
    0
  )) as seats_available_count,
  -- Info del conductor
  p.id as driver_user_id,
  p.name as driver_name,
  p.phone as driver_phone,
  p.avatar_url as driver_photo,
  COALESCE((
    SELECT AVG(CAST(rating as DECIMAL)) FROM reviews 
    WHERE reviews.reviewer_id = r.driver_id
  ), 0) as driver_rating,
  (
    SELECT COUNT(*) FROM reviews 
    WHERE reviews.reviewer_id = r.driver_id
  ) as driver_review_count,
  r.created_at,
  r.updated_at
FROM routes r
LEFT JOIN profiles p ON r.driver_id = p.id
WHERE 
  -- Solo rutas futuras
  r.departure_time > NOW()
  -- Solo rutas PROGRAMADAS (no en progreso ni completadas)
  AND r.status = 'scheduled'
  -- Solo si hay asientos disponibles
  AND (r.total_seats - COALESCE(
    (SELECT COUNT(*) FROM bookings 
     WHERE bookings.route_id = r.id 
     AND bookings.booking_status != 'cancelled'),
    0
  )) > 0;

-- RLS Policy para vista (opcional pero recomendado)
ALTER VIEW available_rides SET (security_barrier=on);

-- Crear índice para performance (si la tabla routes no lo tiene)
-- CREATE INDEX idx_routes_departure_status 
-- ON routes(departure_time DESC, status) 
-- WHERE status = 'scheduled';

-- Verificar que la vista existe
-- SELECT * FROM available_rides LIMIT 5;
