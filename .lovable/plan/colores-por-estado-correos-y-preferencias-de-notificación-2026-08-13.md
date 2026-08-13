# Colores por estado, correos y preferencias de notificación

## 1. Colores por estado y por plan (dashboards)

Hoy los estados usan tonos poco diferenciados (dos estados en gris, dos en azul) y los planes comparten estilo. Se define una paleta clara y se aplica en todos los paneles (admin, anfitrión, punto asociado, pase de abordar):

- Creado: gris
- Esperando depósito: ámbar
- Depositada: azul
- Retirada: violeta
- Completado: verde
- Atrasado: naranja
- Vencido: rojo

Planes:
- Pasa Una: celeste
- Pasa Mes: azul PASALLAVE
- Pasa Pro: dorado/ámbar

Se agregan los tonos nuevos al componente de etiquetas (`Pill`) como tokens del tema (no colores fijos), para que funcionen en modo claro y oscuro. Los badges de estado y de plan quedan idénticos en todas las pantallas.

## 2. Correos

Requisito previo: hace falta un dominio propio para enviar correos desde tu marca. Al final del plan hay un botón para configurarlo; sin eso no se pueden enviar correos de la aplicación.

Correos a implementar (uno por destinatario, disparados por un evento real):

1. **Bienvenida** al registrarse (nuevo usuario anfitrión).
2. **Pago acreditado** al pagar un período/plan (desde el flujo de pago actual, con el detalle del período, plan e importe).
3. **Movimientos de la llave**, al anfitrión:
   - Llave depositada en el punto
   - Llave retirada por el huésped
   - Llave devuelta / intercambio completado

Cada correo es una plantilla con la identidad visual de PASALLAVE (logo, azul eléctrico, Quicksand como fuente de referencia), con la referencia de reserva, el punto y el horario. Los envíos ocurren en el servidor, junto a la operación que los origina, y no se duplican si la operación se reintenta.

## 3. Preferencias de notificación en el perfil

- Nueva pantalla/panel **Perfil** accesible desde el menú del usuario, con dos interruptores:
  - **Correo electrónico**: recibir los correos de movimientos y pagos.
  - **Notificaciones en la campanita**: mostrar los avisos dentro de la app.
- Las preferencias se guardan por usuario y se respetan antes de cada envío: si el correo está apagado, no se envía; si la campanita está apagada, no se crea el aviso interno.
- Los correos de bienvenida y de auth (recuperar contraseña, verificación) se envían siempre, ya que son necesarios para operar la cuenta.

## Detalles técnicos

- `src/lib/pasallave.ts`: ampliar `STATUS_TONE` y `PLAN_TONE` con tonos nuevos (`purple`, `amber`, `orange`, `sky`, `gold`); `src/components/pasallave/ui-bits.tsx` (`Pill`) suma esas variantes usando variables CSS de `src/styles.css`. `status-badge.tsx` queda como fuente única y se reemplazan los `Pill` sueltos que muestran estado/plan en admin, host, associate, point y `pase.$ref`.
- Migración: columnas `notify_email boolean default true` y `notify_push boolean default true` en `public.profiles` (RLS ya permite leer/actualizar el propio perfil).
- Plantillas React Email en `src/lib/email-templates/` (bienvenida, pago acreditado, depósito, retiro, devolución) mediante el andamiaje de correos de la plataforma, con el registro y el ayudante de envío del servidor.
- Envíos desde el servidor: `ensureUserBootstrap` (bienvenida, una sola vez), `payBilling` (pago), y las transiciones de estado en `src/lib/exchange.server.ts` / `point.server.ts` (depósito, retiro, devolución), cada una consultando las preferencias del anfitrión y usando clave de idempotencia derivada del intercambio + tipo.
- Nueva ruta `src/routes/_authenticated/perfil.tsx` con los toggles y una función de servidor autenticada para leer/guardar preferencias.

<presentation-actions>
<presentation-open-email-setup>Configurar dominio de correo</presentation-open-email-setup>
</presentation-actions>
