-- Corrección idempotente para proyectos existentes de AgroField.
-- Fuerza que clientes y visitas escritos por vendedores usen el sellerCode
-- resuelto desde Supabase Auth. No elimina ni modifica datos existentes.

CREATE OR REPLACE FUNCTION public.enforce_current_seller_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resolved_seller_code TEXT;
BEGIN
    IF public.current_app_role() = 'Vendedor' THEN
        resolved_seller_code := public.current_seller_code();

        IF resolved_seller_code IS NULL OR resolved_seller_code = '' THEN
            RAISE EXCEPTION 'No se pudo determinar el vendedor autenticado'
                USING ERRCODE = '42501';
        END IF;

        NEW."vendedorId" := resolved_seller_code;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_current_seller_assignment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_current_seller_assignment() TO authenticated;

DROP TRIGGER IF EXISTS clients_assign_current_seller ON public.clients;
CREATE TRIGGER clients_assign_current_seller
BEFORE INSERT OR UPDATE OF "vendedorId" ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.enforce_current_seller_assignment();

DROP TRIGGER IF EXISTS visits_assign_current_seller ON public.visits;
CREATE TRIGGER visits_assign_current_seller
BEFORE INSERT OR UPDATE OF "vendedorId" ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.enforce_current_seller_assignment();

SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('clients_assign_current_seller', 'visits_assign_current_seller')
ORDER BY event_object_table, event_manipulation;
