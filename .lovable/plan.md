# Ingreso al punto con código de acceso

## Situación actual
- El panel del punto vive en `/point` (`src/routes/_authenticated/point.tsx`), dentro del área protegida por login de usuario.
- Sólo entra un usuario con rol *Punto* que tenga un punto asignado en su perfil.
- El teclado 3x3, la ocupación de casilleros y las pantallas de resultado / error / "todavía no disponible" ya están diseñados y funcionando.
- La tabla de puntos ya tiene un campo `access_code` que hoy no se usa para entrar.

## Cambio propuesto
El panel pasa a ser una pantalla pública en `/point`: el encargado escribe el código de acceso del punto y entra directo, sin email ni contraseña.

### 1. Pantalla de acceso (estilo keynet24)
- Al abrir `/point` sin sesión de punto, se muestra sólo el teclado numérico para el código de acceso, con el logo arriba.
- Código correcto → pasa directo al teclado de validación de códigos.
- Código incorrecto → mensaje de error con la misma animación de sacudida que ya existe.
- La sesión del punto queda guardada en el navegador: una vez ingresado el código, el punto queda logueado y no hay botón de salir.

### 2. Panel
- Pantalla enfocada en el teclado numérico y el resultado de cada validación (depositar / entregar / recibir, con el número de casillero).
- No se muestra la ocupación del punto, la barra de progreso ni la grilla de casilleros.
- Los datos del punto (nombre, horario, casilleros) se obtienen a partir del código de acceso en lugar del usuario logueado.


### 3. Administración del código
- En Admin → Puntos, el código de acceso se muestra en la ficha del punto, con opción de copiarlo y de generar uno nuevo.

## Detalles técnicos
- Mover `src/routes/_authenticated/point.tsx` a `src/routes/point.tsx` (ruta pública, sin `RoleGuard`), conservando el componente del panel.
- Nuevas funciones de servidor en `src/lib/point.functions.ts`, todas recibiendo el código de acceso y validándolo contra `kiosks.access_code` antes de operar (cliente privilegiado cargado dentro del handler):
  - `pointLogin({ accessCode })` → datos del punto o error.
  - `pointState({ accessCode })` → punto + intercambios del punto.
  - `pointValidateCode({ accessCode, code })` → reutiliza la lógica actual de `validateCode`, sin cambiar la máquina de estados ni los estados de intercambio.
- El código de acceso se guarda en `localStorage` (`pasallave.point.code`) y se revalida en cada carga.
- Normalizar el código (trim + mayúsculas) y limitar reintentos fallidos con una espera corta para evitar prueba y error.
- El rol *Punto* deja de usarse para entrar al panel; los enlaces internos que apuntaban a `/point` se mantienen y el redirect post-login de ese rol va a `/point`.
- Base de datos: sin cambios de esquema; sólo se usa `kiosks.access_code`, que ya existe.

## Verificación
- Entrar a `/point` sin sesión y validar un código correcto e incorrecto.
- Validar un código de depósito y uno de retiro desde el panel y confirmar que el intercambio cambia de estado.
- Confirmar que al recargar la página el punto sigue adentro y que "Salir" lo devuelve a la pantalla de código.
