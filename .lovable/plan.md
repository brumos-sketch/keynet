# App instalable (PWA) con notificaciones

Sí. Arranco por lo que se puede hacer hoy: la app instalable con notificaciones push reales.

## Etapa 1 — App instalable en el teléfono

- Manifiesto de la app con nombre "pasallave", ícono (el logo actual), colores navy/naranja y apertura en modo app (sin barra del navegador).
- Íconos para Android e iOS (192, 512 y apple-touch-icon).
- Botón "Instalar app" en el panel del anfitrión y en el perfil, que aparece solo cuando el navegador lo permite; en iPhone se muestra la instrucción "Compartir → Agregar a inicio".
- Sin modo offline por ahora (no hace falta y evita problemas de caché).

## Etapa 2 — Notificaciones push reales

Hoy la campanita es interna (avisos dentro de la web). Con push, el aviso llega aunque la app esté cerrada.

- El usuario activa el interruptor de campanita en `/perfil` y el navegador le pide permiso.
- La suscripción del dispositivo se guarda en una tabla nueva `push_subscriptions` (usuario, endpoint, claves, dispositivo).
- Cada vez que hoy se crea un aviso interno (depósito, retiro, devolución, vencimiento, pago acreditado), además se envía el push a los dispositivos del usuario, respetando el interruptor.
- Un service worker exclusivo de mensajería recibe y muestra la notificación; al tocarla abre la pantalla correspondiente.
- Panel de perfil: lista de dispositivos con notificaciones activas y opción de desactivar.

## Etapa 3 — Lockers automáticos (preparación)

La lógica de códigos y estados ya sirve tal cual: hoy una persona valida el código en `/point`; mañana la pantalla del casillero hace lo mismo y además abre la puerta.

Lo que se agrega:

- Tabla `locker_devices`: un dispositivo por punto, con token propio y estado de conexión (último latido).
- Tabla `locker_events`: registro de cada apertura, cierre y falla, con fecha, casillero e intercambio asociado.
- Endpoint público seguro `/api/public/locker/*` para que el controlador del casillero:
  1. valide el código y reciba la orden "abrí el casillero N",
  2. confirme que la puerta se abrió y se cerró.
  Toda llamada se autentica con el token del dispositivo; nunca devuelve datos personales.
- Modo kiosco en `/point`: pantalla completa, sin botón de salir, con mensaje "Abriendo casillero N…" y confirmación de cierre.
- En Admin → Puntos: estado del dispositivo (en línea / fuera de línea), últimas aperturas y opción de apertura manual de emergencia.

Esta etapa queda como esqueleto funcional (se puede probar con un dispositivo simulado) hasta que definas el hardware. Cuando elijas el controlador (por ejemplo ESP32 con relés, o una marca de casilleros con su propia API) se ajusta solo la capa de comunicación, no la lógica.

## Detalle técnico

- Manifiesto en `public/manifest.webmanifest` + etiquetas en `src/routes/__root.tsx`. Sin service worker de caché (solo el de mensajería), para no romper la vista previa.
- Push con Web Push estándar (VAPID): par de claves guardado como secreto del proyecto; la clave pública se expone al cliente. Envío desde funciones de servidor, junto al `insert` en `notifications` que ya existe en `src/lib/exchange.server.ts` y `src/lib/pasallave.functions.ts`.
- `push_subscriptions` con RLS: cada usuario solo ve y borra las suyas; `service_role` para el envío.
- `locker_devices` / `locker_events`: sin acceso anónimo; el endpoint público valida el token con cliente privilegiado dentro del handler.
- Reutilizo la lógica actual de `pointValidateCode` para la validación del casillero, agregando el evento de apertura.

## Orden sugerido

1. Etapa 1 (instalable) — rápida y visible.
2. Etapa 2 (push) — requiere el interruptor de perfil que ya existe.
3. Etapa 3 (lockers) — cuando definas el hardware.
