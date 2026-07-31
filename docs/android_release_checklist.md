# Control de liberación Android

Esta lista define el mínimo técnico que debe aprobarse antes de congelar la
versión usada en una demostración. Cada ejecución debe registrar fecha,
dispositivo, versión visible de AgroField, responsable y evidencia.

## Condiciones de prueba

- [ ] Android principal con Chrome actualizado.
- [ ] Segundo Android o computadora para verificar datos remotos.
- [ ] Usuario QA Vendedor activo y usuario QA Administrador activo.
- [ ] Campaña de prueba seleccionada.
- [ ] Respaldo reciente de Supabase.
- [ ] Datos temporales identificados para limpieza posterior.

## Flujo vendedor con internet

- [ ] Iniciar sesión y confirmar nombre, campaña y versión instalada.
- [ ] Crear un cliente y comprobarlo desde el segundo dispositivo.
- [ ] Programar una visita y comprobarla desde el segundo dispositivo.
- [ ] Editar prioridad y estado comercial.
- [ ] Registrar nota, tarea, foto y firma.
- [ ] Ejecutar check-in y check-out con permiso de ubicación.
- [ ] Confirmar que el indicador de pendientes permanece en cero.

## Flujo vendedor sin internet

- [ ] Activar modo avión y mantener abierta la aplicación instalada.
- [ ] Crear un cliente y una visita.
- [ ] Confirmar que aparece el contador amarillo de pendientes.
- [ ] Cerrar y volver a abrir la aplicación todavía sin conexión.
- [ ] Confirmar que cliente y visita siguen visibles.
- [ ] Añadir nota, tarea, foto o firma sin conexión.
- [ ] Recuperar internet y pulsar **Actualizar datos** una vez.
- [ ] Confirmar el mensaje `Datos sincronizados correctamente`.
- [ ] Confirmar que el contador pendiente desaparece.
- [ ] Confirmar todos los datos desde el segundo dispositivo.

## Seguridad y perfiles

- [ ] El vendedor solo ve clientes y visitas de su `sellerCode`.
- [ ] Un vendedor no puede abrir rutas administrativas.
- [ ] Administrador y gerente pueden ver el consolidado autorizado.
- [ ] Desactivar un usuario impide un nuevo acceso.
- [ ] Clientes y visitas nuevos quedan asignados por el trigger de Supabase.

## Administración

- [ ] Crear y desactivar un vendedor de prueba.
- [ ] Importar clientes mediante la plantilla CSV.
- [ ] Importar campaña y objetivo comercial.
- [ ] Revisar indicadores por vendedor y campaña.
- [ ] Exportar visitas e interacciones y abrir los archivos resultantes.

## PWA y actualización

- [ ] Instalar AgroField desde Chrome en la pantalla de inicio.
- [ ] Abrir sin conexión después de una carga online previa.
- [ ] Confirmar icono, nombre y modo pantalla independiente.
- [ ] Publicar una versión de prueba y confirmar que cambia el identificador
      visible sin borrar IndexedDB ni operaciones pendientes.
- [ ] Confirmar que no aparecen mensajes con SQL, RLS, códigos o trazas.

## Evidencia acumulada

| Fecha | Flujo | Resultado | Evidencia |
|---|---|---|---|
| 2026-07-31 | Cola local: cliente + visita hacia Supabase | Aprobado parcialmente | Usuario confirmó sincronización exitosa y desaparición del error |

## Criterio de salida

La versión puede declararse candidata a demo cuando no existan fallas críticas,
la prueba offline completa esté aprobada en Android, los datos aparezcan en un
segundo dispositivo y exista un respaldo recuperable de Supabase.
