-- Ejecutar esta migracion en Supabase SQL Editor si la base ya tiene tablas creadas.
-- No recrea clients/visits/tasks/etc. Solo agrega lo necesario para la version actual.

CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'Vendedor',
    "sellerCode" TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    "createdAt" TEXT,
    "passwordHash" TEXT
);

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS "vendedorId" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "leadStatus" TEXT DEFAULT 'Prospect';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "accountStatus" TEXT DEFAULT 'OK';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "lastVisit" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS crops JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS coords JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE visits ADD COLUMN IF NOT EXISTS "vendedorId" TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS "checkIn" JSONB;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS "checkOut" JSONB;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS commitments TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS "clientSignature" TEXT;

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    season TEXT,
    year INTEGER,
    active BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS sales_plans (
    id TEXT PRIMARY KEY,
    "vendedorId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "targetValue" NUMERIC,
    "currentProgress" NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT PRIMARY KEY,
    description TEXT NOT NULL,
    "dueDate" TEXT,
    completed BOOLEAN DEFAULT FALSE,
    "clientId" BIGINT REFERENCES clients(id) ON DELETE CASCADE,
    "visitId" BIGINT
);

CREATE TABLE IF NOT EXISTS interactions (
    id BIGINT PRIMARY KEY,
    "clientId" BIGINT REFERENCES clients(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT,
    summary TEXT,
    details TEXT
);

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
