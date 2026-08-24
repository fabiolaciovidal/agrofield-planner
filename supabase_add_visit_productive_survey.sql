-- Habilita el relevamiento productivo histórico dentro de cada visita.
-- Es idempotente y no modifica visitas existentes.

ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS "productiveSurvey" JSONB;

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'visits'
  AND column_name = 'productiveSurvey';
