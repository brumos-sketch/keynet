# Autocompletado de direcciones (sin Google)

Sí, se puede sin Google: Nominatim (OpenStreetMap) devuelve varias coincidencias, no solo una. Hoy pedimos `limit=1`, por eso no hay lista de sugerencias.

## Qué cambia

Un mismo campo reutilizable "Dirección con sugerencias":

- Al escribir (3+ caracteres, espera ~500 ms), aparece debajo una lista de hasta 5 coincidencias reales.
- Con teclado (flechas + Enter) o con clic se elige una; el campo queda con la dirección completa y se guardan las coordenadas.
- Estados claros: "Buscando…", "Sin coincidencias", y errores silenciosos sin romper el formulario.

Se aplica en tres lugares:

1. **Alta de llave** (asistente del anfitrión): al elegir una sugerencia se calcula el punto más cercano con esas coordenadas, igual que ahora pero sin adivinar.
2. **Buscar puntos** (`/buscar`): el campo de búsqueda ofrece sugerencias; al elegir una se ordena la lista por cercanía y el mapa se centra ahí. Escribir texto libre sigue filtrando por nombre como hoy.
3. **Panel de administrador → Puntos**: alta y edición de un punto. Al elegir una sugerencia se guardan además latitud y longitud del punto, que hoy quedan vacías (por eso el mapa de la home no muestra el punto existente).

## Detalle técnico

- `src/lib/geo.functions.ts`: nueva server fn `suggestAddresses` (Nominatim, `limit=5`, `countrycodes=ar`, `addressdetails=1`) que devuelve `{ lat, lng, label }[]`. Se mantiene `geocodeAddress` para usos existentes.
- Nuevo `src/components/pasallave/address-autocomplete.tsx`: input controlado + popover/lista, debounce, cancelación de pedidos previos, navegación por teclado, `onSelect(point)`.
- `src/components/pasallave/new-key-wizard.tsx`: reemplaza el input de "Dirección (opcional)" y el `useEffect` de geocodificación por el nuevo componente; `nearest` se calcula desde las coordenadas elegidas.
- `src/routes/buscar.tsx`: el input de búsqueda pasa al nuevo componente; `origin` se setea al elegir sugerencia (se quita el geocodificado automático por texto).
- `src/routes/_authenticated/admin.puntos.tsx`: `blankForm` suma `lat`/`lng`; el campo Dirección usa el nuevo componente; al editar se precargan `k.lat`/`k.lng`.
- `src/lib/admin.functions.ts`: las funciones de crear/actualizar punto aceptan y persisten `lat` y `lng` (columnas ya existentes en la tabla de puntos).
- Sin cambios de base de datos.
- Nota de uso: Nominatim pide bajo volumen de consultas; el debounce y el límite de 5 resultados alcanzan. Migrar a Google Places después sería cambiar solo la implementación de `suggestAddresses`.
