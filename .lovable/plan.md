# Rediseño y ruta del panel del punto asociado

## Objetivo
Renombrar la ruta del panel del punto de `/kiosk` a `/point` y rediseñar la interfaz para que sea más clara, accesible y adecuada para el uso diario del encargado del punto.

## Estado actual
- El panel existe en `src/routes/_authenticated/kiosk.tsx` y responde a `/kiosk`.
- Tiene teclado numérico, validación de códigos, indicador de ocupación y listado de posiciones.
- Los usuarios con rol `kiosk` son redirigidos allí tras iniciar sesión.

## Cambios propuestos

### 1. Ruta
- Renombrar `src/routes/_authenticated/kiosk.tsx` → `src/routes/_authenticated/point.tsx`.
- Actualizar `createFileRoute("/_authenticated/kiosk")` a `createFileRoute("/_authenticated/point")`.
- Actualizar el redirect post-login para el rol `kiosk` en `src/hooks/useAuth.tsx` y en cualquier otra referencia interna.
- Actualizar los enlaces de admin/host que apuntan a `/kiosk`.

### 2. Rediseño del panel
- **Header más limpio**: nombre del punto, dirección y estado de apertura como una barra de contexto prominente.
- **Teclado grande y táctil**: botones numerados de alto contraste, con zona de código claramente legible, ideal para uso en tablet o celular del encargado.
- **Feedback inmediato**: resultado de la última validación (depósito, retiro/devolución, error) con color, icono y posición del locker si aplica.
- **Resumen de ocupación**: visualización compacta de casilleros (posiciones libres/ocupadas) para saber de un vistazo el estado del punto.
- **Listado de intercambios activos**: reserva, estado, código de huésped y posición, con búsqueda rápida.
- **Bloqueo fuera de horario**: mantener el aviso de punto cerrado, pero con mejor jerarquía visual.
- Seguir el sistema de diseño existente (modo claro, tokens semánticos, radio `16px`, DM Sans).

### 3. Lógica y datos
- Reutilizar `validateCode` del servidor; sin cambios en la máquina de estados actual.
- Reutilizar el modelo de códigos unificado (depósito fijo de la llave, código bidireccional de retiro/devolución).
- Asegurar que la query de intercambios filtre por el punto asignado cuando corresponda.

### 4. Verificación
- Probar que `/point` carga para el usuario `punto1@pasallave.com`.
- Validar códigos de depósito y retiro.
- Confirmar que `/kiosk` redirige o devuelve 404 según lo esperado (no se mantendrá).
- Revisar que los enlaces desde admin y host apuntan a `/point`.

## Notas
- No se toca la base de datos ni la lógica de negocio de `validateCode`.
- No se integra MercadoPago ni cambios de facturación.
- El diseño se mantiene dentro del sistema de tokens ya definido.
