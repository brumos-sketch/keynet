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

Respuesta: `ok`, `enrollmentId`, `claimCode` (por ejemplo `LK-ABC-123`), `expiresAt` y `pollAfter: 3`. El servidor genera aleatoriamente tres letras y tres números. Guardar el identificador y mostrar el código en la pantalla. Vence a los 10 minutos. Nunca mostrar ni registrar el secreto.

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

## Capacidad dinámica y relés RS485

Cada locker tiene su propia capacidad, editable en **Admin → Puntos → Posiciones**. No hay una cantidad única para todos los dispositivos. La cantidad configurada debe coincidir con los casilleros físicos y relés instalados.

Después de vincularse y en cada arranque, consultar:

```http
GET https://pasallave.lovable.app/api/public/locker/info
Authorization: Bearer <apiKey>
```

Ejemplo de respuesta del endpoint existente:

```json
{
  "ok": true,
  "name": "Locker de ejemplo",
  "address": "Dirección del locker",
  "positions": 24,
  "is24h": true
}
```

`positions` es el número total de casilleros, numerados de **1 a positions**; no es la cantidad de casilleros libres. El servidor asigna la posición para cada operación. El firmware no debe elegirla ni asumir que siempre hay 36 casilleros.

Recomendaciones para el firmware:

- Consultar nuevamente `/info` al reconectarse y periódicamente si se necesitan cambios de capacidad sin reiniciar. El servidor no envía estos cambios por push.
- Comprobar que `positions` sea un entero positivo y que no supere los canales físicos configurados. Ante una configuración incompatible, no accionar relés y mostrar un error de configuración.
- Antes de abrir, comprobar que la posición devuelta por una validación exitosa sea un entero entre `1` y `positions`, con un relé físico asignado. Una respuesta inválida o un error de red nunca autoriza la apertura.
- Mantener separado el número lógico de casillero del direccionamiento físico Modbus: PASALLAVE devuelve la posición, no la dirección de esclavo ni el registro de la placa.

Para placas iguales con `C` canales, una distribución consecutiva puede calcularse así:

```text
indicePlaca = (posicion - 1) / C       (división entera, índice desde 0)
indiceCanal = (posicion - 1) % C       (índice desde 0)
```

Ejemplo: con placas de 8 canales, el casillero 17 corresponde a la tercera placa (`indicePlaca = 2`) y su primer canal (`indiceCanal = 0`). El firmware debe convertir esos índices a la dirección de esclavo y a la bobina o registro que indique el manual de la placa. No asumir direcciones Modbus ni comandos universales; para cableados no consecutivos, usar una tabla explícita de posición → esclavo/canal.

Para ampliar la capacidad, instalar primero los casilleros y relés adicionales, configurar su direccionamiento en el firmware y luego actualizar **Posiciones** en el panel. Cambiar solo el número en el panel no instala ni configura el hardware; evitar recompilar requiere que el firmware ya soporte esa ampliación.

Para reducirla, verificar primero que ninguna llave ni operación pendiente utilice posiciones que se eliminarán. Esta es una comprobación operativa necesaria, no una garantía de bloqueo automático al editar la capacidad.

## Errores y seguridad

- `401`: secreto o API key inválidos. No abrir casilleros. Una API key revocada requiere una nueva vinculación aprobada.
- `410`: vinculación vencida o reemplazada. Borrar únicamente los datos temporales e iniciar otra.
- `429`: esperar los segundos de `Retry-After` antes de reintentar. Inicio: 5 solicitudes por IP cada 10 minutos; consulta/confirmación: 120 por IP por minuto, por endpoint.
- Cortes de red: reintentos con espera progresiva; nunca abrir sin una validación válida.
- HTTPS con validación de certificado obligatoria: nunca usar `setInsecure()`.
- No registrar claves, secretos ni cuerpos de entrega. Habilitar Secure Boot, cifrado de flash y NVS en producción, y proteger el acceso a restablecimiento de fábrica.
- El código visible solo permite solicitar aprobación: por sí solo no permite obtener la API key. El servidor guarda únicamente hashes; la clave es entregada al dispositivo mediante HTTPS y no al administrador.

No se usa Web Push: la consulta breve produce la vinculación automática sin depender de un servicio de notificaciones.

## Tablets de puntos asistidos

Abrir `/point` en el navegador, PWA o aplicación de la tablet. La pantalla genera el secreto automáticamente y solicita un código `PT-ABC-123` al servidor. En **Admin → Puntos**, pulsar **Vincular tablet** en el punto asistido correspondiente e ingresar el código.

La tablet usa el mismo protocolo seguro en `/api/public/point/enroll/start`, `/poll` y `/ack`. La aprobación solo admite códigos del tipo de punto elegido. La credencial se guarda en el almacenamiento persistente del mismo navegador y origen; cada operación verifica su hash en el servidor. Al cerrar y volver a abrir, reiniciar o cortar la luz, se vuelve directamente al teclado sin otro código de acceso.

Si se borran los datos del navegador, se cambia de navegador o dirección del sitio, se usa modo incógnito o el administrador desvincula el dispositivo, será necesaria una nueva aprobación. Un corte de red no borra la credencial ni permite operar sin validación. Para la instalación definitiva usar siempre la dirección publicada, no la de vista previa.

**Desvincular** revoca inmediatamente la credencial e invalida entregas pendientes. La pantalla vuelve a vinculación cuando detecta la revocación (en el siguiente control, cada 45 segundos, o al intentar operar). Reemplazar un dispositivo autoriza solo la nueva credencial; cada punto tiene un dispositivo autorizado a la vez.
## Código de configuración del locker

- Cada locker tiene un código secreto de 6 dígitos (por defecto `456852`, se muestra `456-852`) para abrir el menú de configuración en la pantalla.
- Se edita o genera al azar en Admin → Puntos → editar locker.
- El ESP32 lo obtiene en `GET /api/public/locker/info` (campo `adminCode`, crudo sin guion). Consultarlo al arrancar y periódicamente (p. ej. cada heartbeat) y guardarlo en NVS; si no hay red, usar el último guardado.
- En la pantalla: si el usuario ingresa `adminCode`, abrir el menú local y **no** llamar a `/validate`.
- El servidor nunca asigna ese código a una llave y `/validate` lo rechaza ("Código reservado para configuración del locker").

```cpp
// tras GET /info
String adminCode = doc["adminCode"] | "456852";
prefs.putString("admin_code", adminCode);
// al confirmar el teclado
if (typed == prefs.getString("admin_code", "456852")) { openConfigMenu(); return; }
```
