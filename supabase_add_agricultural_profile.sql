-- Migración idempotente para habilitar la ficha productiva por cliente.
-- No elimina ni modifica datos existentes.

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS "agriculturalProfile" JSONB
DEFAULT '{"crops": []}'::jsonb;

UPDATE public.clients
SET "agriculturalProfile" = '{"crops": []}'::jsonb
WHERE "agriculturalProfile" IS NULL;

SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
  AND column_name = 'agriculturalProfile';
