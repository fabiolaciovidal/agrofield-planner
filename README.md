<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AgroField Planner

CRM de campo móvil con React, Supabase, PWA y operación offline.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and configure the required `VITE_` variables.
3. Run the app:
   `npm run dev`

## Verificación

Antes de publicar:

    npm test
    npm run build

## Supabase

Para una base nueva, ejecutar `supabase_schema.sql`. Para una base existente,
ejecutar `supabase_migration_existing.sql`. Después ejecutar
`supabase_production_security.sql` para crear las políticas RLS.

Para un proyecto existente que ya tenga las políticas instaladas, ejecutar
`supabase_fix_seller_assignment.sql` para asegurar que clientes y visitas
queden vinculados al vendedor autenticado. El script es idempotente y muestra
los triggers instalados al finalizar.

Probar primero en staging y generar un respaldo antes de aplicar migraciones
sobre producción.

La lista de aceptación previa a una demostración Android está en
`docs/android_release_checklist.md`.

## Variables de Vercel

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_SIGNATURE`
- `VITE_ENABLE_AI_ASSISTANT`
- `VITE_API_KEY` cuando se habilite el asistente

Solo servidor:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` nunca debe usar el prefijo `VITE_`.
