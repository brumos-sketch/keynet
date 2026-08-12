# Correcciones: pase de abordar y alta de llave

## 1. El pase no muestra la posición del casillero

En `/pase/$ref` se saca el bloque "Casillero" con el número grande. El huésped ve punto, dirección, mapa, horario, códigos y fechas; la posición la indica la pantalla del punto al validar el código.

## 2. "Nueva llave" en el panel del anfitrión

En el panel del anfitrión el botón pasa de "Nueva propiedad" a "Nueva llave", el título del asistente a "Alta de llave", el primer paso se llama "Llave" y el mensaje de éxito dice "Llave dada de alta".

## 3. Validación del alta

- Nombre de la llave: obligatorio (mínimo 2 caracteres) para continuar.
- Dirección / propiedad: opcional, rotulada como "Dirección (opcional)".

## 4. Punto más cercano al escribir la dirección

Si el anfitrión completa la dirección, debajo del campo aparece una tarjeta con el punto asociado más cercano (nombre, dirección, distancia aproximada y horario) y un botón "Elegir este punto" que lo preselecciona en el paso siguiente. Si no hay coincidencia geográfica, se muestra un texto neutro invitando a elegir el punto manualmente.

## Detalles técnicos

- `src/routes/pase.$ref.tsx`: eliminar el bloque `locker` y su etiqueta en los tres idiomas.
- `src/components/pasallave/new-key-wizard.tsx`:
  - textos y `canContinue` (paso 0 solo depende de `name`).
  - geocodificación de la dirección con Nominatim (mismo servicio ya usado en `/buscar`), con debounce ~700 ms y cancelación de pedidos previos.
  - cálculo de distancia haversine contra los kioscos con `lat`/`lng` ya cargados en la consulta `["host","kiosks"]`; se muestra el mínimo.
  - la sugerencia setea `form.kioskId`; el paso "Punto" marca ese punto como elegido.
- `src/routes/_authenticated/host.tsx`: ajustar cualquier rótulo "propiedad" ligado al botón del asistente.
- Sin cambios de base de datos.
