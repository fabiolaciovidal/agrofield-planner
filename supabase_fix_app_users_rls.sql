-- Correccion para permitir la demo de administracion de usuarios desde el frontend.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- Para el prototipo/demo: dejar la tabla abierta al frontend con anon key.
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_users TO authenticated;
