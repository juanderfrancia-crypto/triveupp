-- MIGRATION_ROUTE_VEHICLE_TYPE.sql
-- Add vehicle_type metadata to routes so searches can filter by transport type.

ALTER TABLE routes
ADD COLUMN IF NOT EXISTS vehicle_type text;

CREATE INDEX IF NOT EXISTS idx_routes_vehicle_type ON routes(vehicle_type);
