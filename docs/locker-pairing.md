# Vinculación del ESP32 a PASALLAVE

URL base una vez publicados los cambios: `https://pasallave.lovable.app`.
Este protocolo requiere incorporarse al firmware del ESP32; no instala ni actualiza la placa desde la web.

## Primera instalación

1. Configurar Wi-Fi en la pantalla. Si ya existe una API key en NVS, no iniciar otra vinculación.
2. Generar 32 bytes aleatorios con `esp_fill_random`, codificarlos en 64 caracteres hexadecimales minúsculos como `deviceSecret`. Nunca usar MAC, número de serie, contraseña ni `random()` sin fuente criptográfica. Guardar temporalmente el secreto en NVS.
3. Enviar `POST /api/public/locker/enroll/start`, Content-Type `application/json`:

```json
{ "deviceSecret": "<64 caracteres hexadecimales aleatorios>" }
```

Respuesta: `ok`, `enrollmentId`, `claimCode` (por ejemplo `LK-A1B2C3D4`), `expiresAt` y `pollAfter: 3`. Guardar el identificador y mostrar el código en la pantalla. Vence a los 10 minutos. Nunca mostrar ni registrar el secreto.

4. En Admin → Puntos, elegir el locker automático, pulsar **Vincular dispositivo** e ingresar ese código. Solo el administrador puede aprobarlo. Si reemplaza un dispositivo, su clave anterior deja de funcionar cuando el nuevo recibe la suya.
5. Cada 3 segundos enviar `POST /api/public/locker/enroll/poll`:

```json
{ "enrollmentId": "<identificador recibido>", "deviceSecret": "<secreto temporal>" }
```

`status: pending` significa que falta la aprobación. Con `status: ready` llegan `apiKey` y `lockerId`. Guardar la API key en NVS y leerla de nuevo para comprobar que quedó persistida. Si se pierde la respuesta, consultar nuevamente: entrega la misma clave hasta confirmar recepción o vencer.
6. Solo después de guardar la clave, enviar `POST /api/public/locker/enroll/ack` con el mismo cuerpo. La respuesta `status: acknowledged` cierra la entrega. Reintentar si se corta la conexión. Borrar entonces el secreto temporal y el identificador. La clave no vuelve a entregarse después de la confirmación.
7. Mostrar el teclado de códigos. En todos los arranques siguientes leer la clave de NVS y conectarse directamente.

## Operación habitual

Enviar `Authorization: Bearer <apiKey>` a:
- `GET /api/public/locker/info`.
- `POST /api/public/locker/ping` cada 45–60 segundos.
- `POST /api/public/locker/validate` con `{"code":"123-456"}`.

La vinculación no acciona relés: el firmware sigue siendo responsable del comando RS485 y de verificar el resultado físico.

## Errores y seguridad

- `401`: secreto o API key inválidos. No abrir casilleros. Una API key revocada requiere una nueva vinculación aprobada.
- `410`: vinculación vencida o reemplazada. Borrar únicamente los datos temporales e iniciar otra.
- `429`: esperar los segundos de `Retry-After` antes de reintentar. Inicio: 5 solicitudes por IP cada 10 minutos; consulta/confirmación: 120 por IP por minuto, por endpoint.
- Cortes de red: reintentos con espera progresiva; nunca abrir sin una validación válida.
- HTTPS con validación de certificado obligatoria: nunca usar `setInsecure()`.
- No registrar claves, secretos ni cuerpos de entrega. Habilitar Secure Boot, cifrado de flash y NVS en producción, y proteger el acceso a restablecimiento de fábrica.
- El código visible solo permite solicitar aprobación: por sí solo no permite obtener la API key. El servidor guarda únicamente hashes; la clave es entregada al dispositivo mediante HTTPS y no al administrador.

No se usa Web Push: la consulta breve produce la vinculación automática sin depender de un servicio de notificaciones.