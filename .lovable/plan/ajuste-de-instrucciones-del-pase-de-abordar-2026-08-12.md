# Ajuste de instrucciones del pase de abordar

## Objetivo
Actualizar el texto de las instrucciones del pase de abordar para que no mencione el casillero y refleje el flujo de retiro asistido por el punto.

## Cambios

### 1. Instrucciones del pase

En `src/routes/pase.$ref.tsx` reemplazar los textos de `s1` a `s4` en español, inglés y portugués:

- **s1**: “Andá al punto asociado en la dirección indicada, dentro del horario de atención.”
- **s2**: “Dá tu código al encargado del punto.”
- **s3**: “Recibí la llave de la propiedad.”


Las traducciones equivalentes se mantienen en inglés y portugués.

### 2. Mensaje condicional por fecha/horario de retiro

Agregar una nueva línea debajo de la lista de pasos, visible solo cuando el pase tenga `pickup_time`:

> “Retiro disponible a partir de las [pickup_time].”

Debe aparecer traducido en los tres idiomas (`pickupAvailable`, `pickupAvailableFrom`).

### 3. Ajustes menores de coherencia

- Revisar que el mensaje `pending` (“El código de devolución se habilita cuando retirás la llave.”) siga siendo consistente con el nuevo flujo.
- Asegurar que el og:description no mencione “posición del casillero” (ya fue corregido previamente; se revalida).

## Archivos afectados

- `src/routes/pase.$ref.tsx`

## Sin cambios de base de datos
