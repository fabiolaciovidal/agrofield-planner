-- SOLO PARA BASE NUEVA/VACIA.
-- Si tu Supabase ya tiene tablas creadas, NO ejecutes este archivo completo.
-- En ese caso ejecuta supabase_migration_existing.sql.

-- Tabla de Clientes
CREATE TABLE clients (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    "farmName" TEXT NOT NULL,
    address TEXT,
    coords JSONB, -- Espera un objeto { "lat": numero, "lon": numero }
    "contactPerson" TEXT,
    phone TEXT,
    "accountStatus" TEXT,
    "leadStatus" TEXT,
    priority TEXT,
    "lastVisit" TEXT,
    crops JSONB,
    "vendedorId" TEXT
);

-- Tabla simple para administrar usuarios visibles en la app.
-- El acceso real sigue viviendo en Supabase Auth.
CREATE TABLE app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'Vendedor',
    "sellerCode" TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    "createdAt" TEXT,
    "passwordHash" TEXT
);

-- Tabla de Visitas
CREATE TABLE visits (
    id BIGINT PRIMARY KEY,
    "clientId" BIGINT REFERENCES clients(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    "timeSlot" TEXT,
    status TEXT,
    notes TEXT,
    photos JSONB,
    tasks JSONB,
    commitments TEXT,
    "clientSignature" TEXT,
    "vendedorId" TEXT,
    "campaignId" TEXT,
    "checkIn" JSONB,
    "checkOut" JSONB
);

-- Tabla de Tareas (Tasks)
CREATE TABLE tasks (
    id BIGINT PRIMARY KEY,
    description TEXT NOT NULL,
    "dueDate" TEXT,
    completed BOOLEAN DEFAULT FALSE,
    "clientId" BIGINT REFERENCES clients(id) ON DELETE CASCADE
);

-- Tabla de Interacciones
CREATE TABLE interactions (
    id BIGINT PRIMARY KEY,
    "clientId" BIGINT REFERENCES clients(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT,
    summary TEXT,
    details TEXT
);

-- Tabla de Campañas
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    season TEXT,
    year INTEGER,
    active BOOLEAN DEFAULT false
);

-- Tabla de Planes de Venta
CREATE TABLE sales_plans (
    id TEXT PRIMARY KEY,
    "vendedorId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "targetValue" NUMERIC,
    "currentProgress" NUMERIC DEFAULT 0
);

-- Desactiva las políticas de Row Level Security (RLS) para que el app 
-- frontend pueda leer/escribir libremente (solo para esta prueba de prototipo)
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
