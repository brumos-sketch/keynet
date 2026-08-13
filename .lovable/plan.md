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


## Detalle técnico

- Manifiesto en `public/manifest.webmanifest` + etiquetas en `src/routes/__root.tsx`. Sin service worker de caché (solo el de mensajería), para no romper la vista previa.
- Push con Web Push estándar (VAPID): par de claves guardado como secreto del proyecto; la clave pública se expone al cliente. Envío desde funciones de servidor, junto al `insert` en `notifications` que ya existe en `src/lib/exchange.server.ts` y `src/lib/pasallave.functions.ts`.
- `push_subscriptions` con RLS: cada usuario solo ve y borra las suyas; `service_role` para el envío.

## Orden sugerido

1. Etapa 1 (instalable) — rápida y visible.
2. Etapa 2 (push) — requiere el interruptor de perfil que ya existe.
