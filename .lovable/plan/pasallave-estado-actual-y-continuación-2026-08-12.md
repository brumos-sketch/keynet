# PASALLAVE — Estado actual y continuación

## Respuesta a la pregunta: ¿ya están listos todos los puntos del orden de construcción?

No. Hoy está funcionando la **Fase 1 (módulos 1-8 del orden de construcción)**: base de datos, autenticación por roles y el panel de administrador con sus CRUDs principales. Los módulos 9-20 aún no están implementados.

## Qué está listo (Fase 1)

1. **Supabase + tablas + auth + RLS** — 13 tablas, roles separados en `user_roles`, funciones de seguridad por rol, trigger `handle_new_user`, datos demo.
2. **Login + registro + redirección por rol** — `/login` con email/password/Google, registro como host automático, redirección a `/admin`, `/associate`, `/host` o `/kiosk`.
3. **Layout admin + sidebar** — navegación desktop y móvil.
4. **Usuarios** — tabla, cambio de rol por fila, creación manual.
5. **Anfitriones** — alta y baja; edición pendiente.
6. **Puntos** — alta con categorías, horarios, comisión, asociado, código PP; edición, foto y panel de posiciones pendientes.
7. **Llaves** — alta con plan, bloqueo/desbloqueo, eliminación; auto-generación de intercambio libre y `access_code` Pro pendiente.
8. **Intercambios** — tabla con estados y avance manual; detalle con timeline y códigos por plan pendiente.

## Qué falta (módulos 9-20)

9. **Interfaz del punto** — teclado numérico XXX-XXX, validación de códigos en orden correcto (Pro → depósito fijo → pickup bidireccional → un uso), countdown fuera de horario.
10. **Lógica de planes** — un uso 48h + extra $1.500/día, mensual auto-renovable, Pro con access codes fijos/rotativos y validez.
11. **Panel anfitrión completo** — agregar propiedad en 4 pasos, configurar estadía, manejo de expired, renovación con pago simulado.
12. **Gestión Pro** — access codes por rol, registro de accesos, bloqueo remoto.
13. **Panel asociado completo** — stats reales, historial de comisiones, ocupación por punto.
14. **Dashboard admin** — listo en Fase 1.
15. **Facturación completa** — acuerdos Pro, generación automática de períodos.
16. **Boarding pass** — `/pass/[bookingRef]` público, multi-idioma (es/en/pt), sin posición ni teléfono.
17. **Buscador de puntos + waitlist** — geolocalización, dirección, mapa con OpenStreetMap, formulario de lista de espera.
18. **MercadoPago** — flujo de compra real.
19. **Notificaciones + vencimientos** — alerts, cálculo de overdue, cron/jobs.
20. **SEO + seguridad** — metadatos, hardening, revisión final.

## Propuesta para continuar

Dividir lo que falta en dos entregas manejables:

- **Fase 2**: módulos 9-13 (interfaz del punto, lógica de planes, panel anfitrión completo, gestión Pro, panel asociado completo).
- **Fase 3**: módulos 15-20 (facturación completa, boarding pass, buscador, MercadoPago, notificaciones, SEO/seguridad). El módulo 14 (dashboard admin) ya está.

Antes de empezar, conviene decidir: ¿se avanza con la Fase 2 completa o se prioriza algún módulo específico? También confirmar que MercadoPago sigue postergado a la Fase 3 y que el buscador usará OpenStreetMap/Nominatim sin API key.
