# PASALLAVE — Fase 2 (módulos 9-13)

## Qué ya existe hoy

Verificado en el código: `src/lib/pasallave.functions.ts` ya expone `createKey`, `createExchange`, `renewExchange`, `createAccessCode`, `toggleAccessCode`, `validateCode` y `expireOneUseExchanges`. El teclado numérico del punto (`kiosk.tsx`), el panel del anfitrión con estadías y renovación (`host.tsx`) y el panel del asociado con comisiones (`associate.tsx`) están construidos.

Lo que falta para cerrar la Fase 2 es la parte visible de la gestión Pro, el comportamiento fuera de horario en el punto, y el detalle de intercambio en el admin.

## Módulo 9 — Interfaz del punto (completar)

- Cabecera con nombre del punto, código PP y estado abierto/cerrado según `is_24h` + `schedule`.
- Fuera de horario: el teclado queda deshabilitado con cuenta regresiva hasta la próxima apertura y mensaje claro.
- Registro de cada validación en `access_log` (acción, rol, nombre) para que quede trazado.
- Panel lateral con los casilleros ocupados del punto y su referencia de reserva.

## Módulo 10 — Lógica de planes (completar)

- Aviso de vencimiento en el panel anfitrión para "Pasa Una": tiempo restante de las 48 horas y cargo por día extra ($1.500).
- Ejecutar `expire_one_use_exchanges()` al cargar el panel del anfitrión y del admin, para que los vencidos se vean sin esperar un job.
- Mensual: marcar la llave como renovable y mostrar el próximo período de cobro.

## Módulo 11 — Panel anfitrión (completar)

- Alta de propiedad en 4 pasos: datos de la llave → elegir punto (lista con horario y dirección) → elegir plan → confirmación con el código de depósito fijo.
- Estado de cada llave con badge de plan y bloqueo, y acceso directo a crear estadía.

## Módulo 12 — Gestión Pro (nuevo)

- Sección "Accesos Pro" en el panel del anfitrión, visible solo para llaves con plan Pro.
- Alta de códigos de acceso por rol (huésped, limpieza, mantenimiento, otro) con nombre, validez opcional por fechas y franja horaria, y reutilizable sí/no.
- Listado con estado activo/bloqueado y botón de bloqueo remoto inmediato.
- Historial de accesos leído desde `access_log`, con fecha, rol y persona.

## Módulo 13 — Panel asociado (completar)

- Ocupación por punto: casilleros usados sobre el total, con barra de progreso.
- Filtro de comisiones por período y total acumulado del año.

## Admin

- Vista de detalle de intercambio: línea de tiempo (creado → depositada → retirada → completado) y los códigos que correspondan al plan, con la posición del casillero visible solo para admin y punto.

## Detalles técnicos

- Nuevas funciones de servidor en `pasallave.functions.ts`: `logAccess` (escritura en `access_log` desde el punto), `listAccessLog` y `kioskOccupancy`; todas con `requireSupabaseAuth` y verificación de rol.
- El cálculo de apertura/cierre reutiliza `describeSchedule` y agrega un helper `isOpenNow(schedule, is24h)` en `src/lib/pasallave.ts`.
- Sin cambios de esquema: `access_codes`, `access_log` y `key_exchanges` ya tienen las columnas necesarias.
- Pagos siguen simulados; MercadoPago queda para la Fase 3.
- Cada vista nueva con su propio título y descripción.

## Fuera de alcance de esta fase

Módulos 15-20: facturación completa, boarding pass, buscador de puntos con OpenStreetMap, MercadoPago, notificaciones y revisión final de SEO/seguridad.
