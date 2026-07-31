-- Seguridad de producción para AgroField.
-- Ejecutar después de supabase_schema.sql o supabase_migration_existing.sql.
-- Probar primero en un proyecto Supabase de staging.

ALTER TABLE app_users DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "erpCode" TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "visitId" BIGINT;

-- Vincula perfiles heredados con el UUID real de Supabase Auth cuando coincide el email.
UPDATE app_users AS profile
SET id = auth_user.id::text
FROM auth.users AS auth_user
WHERE lower(profile.email) = lower(auth_user.email)
  AND profile.id <> auth_user.id::text
  AND NOT EXISTS (
      SELECT 1 FROM app_users existing WHERE existing.id = auth_user.id::text
  );

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT profile.role
    FROM public.app_users AS profile
    WHERE profile.active = true
      AND (
          profile.id = auth.uid()::text
          OR lower(profile.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
    ORDER BY (profile.id = auth.uid()::text) DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_seller_code()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT profile."sellerCode"
    FROM public.app_users AS profile
    WHERE profile.active = true
      AND (
          profile.id = auth.uid()::text
          OR lower(profile.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
    ORDER BY (profile.id = auth.uid()::text) DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_app_user_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.app_users AS profile
        WHERE profile.active = true
          AND (
              profile.id = auth.uid()::text
              OR lower(profile.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
          )
    );
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_seller_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_app_user_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_seller_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_app_user_active() TO authenticated;

-- Impide que un vendedor cree o actualice registros con el código de otra cartera.
-- Los triggers se ejecutan antes de RLS, de modo que también recuperan operaciones
-- offline antiguas que quedaron encoladas con un vendedor incorrecto.
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

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE clients, visits, tasks, interactions, campaigns, sales_plans, app_users FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE clients, visits, tasks, interactions, campaigns, sales_plans, app_users TO authenticated;

DROP POLICY IF EXISTS app_users_select ON app_users;
DROP POLICY IF EXISTS app_users_write ON app_users;
CREATE POLICY app_users_select ON app_users
FOR SELECT TO authenticated
USING (
    public.is_current_app_user_active()
    AND (
        id = auth.uid()::text
        OR public.current_app_role() IN ('Admin', 'Gerente')
    )
);
CREATE POLICY app_users_write ON app_users
FOR ALL TO authenticated
USING (public.current_app_role() IN ('Admin', 'Gerente'))
WITH CHECK (public.current_app_role() IN ('Admin', 'Gerente'));

DROP POLICY IF EXISTS clients_select ON clients;
DROP POLICY IF EXISTS clients_insert ON clients;
DROP POLICY IF EXISTS clients_update ON clients;
DROP POLICY IF EXISTS clients_delete ON clients;
CREATE POLICY clients_select ON clients
FOR SELECT TO authenticated
USING (
    public.is_current_app_user_active()
    AND (
        public.current_app_role() IN ('Admin', 'Gerente')
        OR "vendedorId" = public.current_seller_code()
    )
);
CREATE POLICY clients_insert ON clients
FOR INSERT TO authenticated
WITH CHECK (
    public.current_app_role() IN ('Admin', 'Gerente')
    OR "vendedorId" = public.current_seller_code()
);
CREATE POLICY clients_update ON clients
FOR UPDATE TO authenticated
USING (
    public.current_app_role() IN ('Admin', 'Gerente')
    OR "vendedorId" = public.current_seller_code()
)
WITH CHECK (
    public.current_app_role() IN ('Admin', 'Gerente')
    OR "vendedorId" = public.current_seller_code()
);
CREATE POLICY clients_delete ON clients
FOR DELETE TO authenticated
USING (
    public.current_app_role() IN ('Admin', 'Gerente')
    OR "vendedorId" = public.current_seller_code()
);

DROP POLICY IF EXISTS visits_access ON visits;
CREATE POLICY visits_access ON visits
FOR ALL TO authenticated
USING (
    public.current_app_role() IN ('Admin', 'Gerente')
    OR "vendedorId" = public.current_seller_code()
)
WITH CHECK (
    public.current_app_role() IN ('Admin', 'Gerente')
    OR "vendedorId" = public.current_seller_code()
);

DROP POLICY IF EXISTS interactions_access ON interactions;
CREATE POLICY interactions_access ON interactions
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = interactions."clientId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = interactions."clientId"
    )
);

DROP POLICY IF EXISTS tasks_access ON tasks;
CREATE POLICY tasks_access ON tasks
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = tasks."clientId"
    )
    OR EXISTS (
        SELECT 1 FROM visits
        WHERE visits.id = tasks."visitId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = tasks."clientId"
    )
    OR EXISTS (
        SELECT 1 FROM visits
        WHERE visits.id = tasks."visitId"
    )
);

DROP POLICY IF EXISTS campaigns_read ON campaigns;
DROP POLICY IF EXISTS campaigns_write ON campaigns;
CREATE POLICY campaigns_read ON campaigns
FOR SELECT TO authenticated
USING (public.is_current_app_user_active());
CREATE POLICY campaigns_write ON campaigns
FOR ALL TO authenticated
USING (public.current_app_role() IN ('Admin', 'Gerente'))
WITH CHECK (public.current_app_role() IN ('Admin', 'Gerente'));

DROP POLICY IF EXISTS sales_plans_read ON sales_plans;
DROP POLICY IF EXISTS sales_plans_write ON sales_plans;
CREATE POLICY sales_plans_read ON sales_plans
FOR SELECT TO authenticated
USING (
    public.current_app_role() IN ('Admin', 'Gerente')
    OR "vendedorId" = public.current_seller_code()
);
CREATE POLICY sales_plans_write ON sales_plans
FOR ALL TO authenticated
USING (public.current_app_role() IN ('Admin', 'Gerente'))
WITH CHECK (public.current_app_role() IN ('Admin', 'Gerente'));
