# Acceso al panel del punto para pruebas

## Objetivo
Permitir que el equipo de PASALLAVE pueda acceder rápidamente al teclado del punto (`/point`) para probar depósitos, retiros y devoluciones sin depender de credenciales desconocidas.

## Estado actual
- La ruta del panel del punto es `/point` (anteriormente `/kiosk`).
- Requiere autenticación con rol `kiosk` y un `kiosk_id` asignado en `profiles`.
- En la base de datos existe un usuario demo con rol `kiosk`: `punto1@pasallave.com`, asignado a "Kiosco Palermo".
- No hay documentación ni contraseña conocida para ese usuario demo en el repositorio.
- Los nuevos registros por `/login` reciben rol `host` automáticamente, por lo que no se puede crear un usuario de punto desde el login público.

## Propuesta de solución
1. **Resetear la contraseña del demo de punto** a un valor conocido y documentado (ej. `Demo1234`).
2. **Agregar credenciales de demo visibles** en la pantalla de login (`/login`) para facilitar las pruebas: admin, anfitrión, asociado y punto.
3. **Verificar que el flujo de `/point` funcione** con ese usuario: teclado numérico, validación de códigos de depósito/retiro/devolución, asignación dinámica de casillero y grilla de ocupación.
4. **(Opcional) Agregar un botón de acceso directo** en el panel de admin para abrir `/point` como "vista previa del punto" sin cerrar sesión del admin, útil para demos internas.

## Criterios de aceptación
- Desde `/login` se puede leer un recuadro con las credenciales de demo del punto.
- Al ingresar con `punto1@pasallave.com` y la contraseña documentada, el sistema redirige a `/point` y carga el teclado.
- Se puede validar al menos un código de depósito y un retiro sin errores 401/403.
- No se afecta la seguridad de producción: las credenciales de demo deben estar condicionadas a un entorno de preview/development o ser removidas antes del go-live.

## Notas técnicas
- La contraseña de Supabase Auth se puede actualizar mediante `supabase.auth.admin.updateUserById` desde una función server con rol de servicio, o mediante SQL directo sobre `auth.users` (no recomendado sin conocer el hash).
- La forma más limpia es exponer una función server `resetDemoPassword` protegida por un flag de entorno o por verificación de admin, que invoque `supabaseAdmin.auth.admin.updateUserById`.
- Alternativamente, se puede crear un nuevo usuario demo de punto desde el panel de admin con una contraseña elegida y documentarla.
