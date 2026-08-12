# Buscador de puntos con OpenStreetMap

Buena idea: OSM/Nominatim no necesita cuenta ni clave, así que sirve para dejar el flujo completo andando ya. El código queda aislado en una capa de mapas para poder cambiar a Google Maps más adelante tocando un solo lugar.

## Qué cambia en `/buscar`

- El campo de búsqueda pasa a aceptar **dirección o barrio**: al escribir, se geocodifica con Nominatim (con espera de ~700 ms y cancelación de pedidos previos) y se ubica el punto de origen.
- La lista de puntos se **ordena por distancia** a esa dirección, mostrando "a 450 m" o "a 2,3 km" en cada tarjeta. Sin dirección, se mantiene el filtro de texto actual.
- El mapa pasa de un `iframe` de OSM a un **mapa interactivo Leaflet** con:
  - marcadores de todos los puntos visibles (marcador distinto para el elegido),
  - marcador del origen buscado,
  - encuadre automático sobre los resultados,
  - clic en un marcador que selecciona la tarjeta y viceversa.
- Cada tarjeta y el panel del mapa conservan estado abierto/cerrado, categoría, ocupación y el enlace "Cómo llegar".
- Si no hay resultados cerca (por texto o por radio), se sigue ofreciendo la lista de espera con la dirección ya cargada.

## Alta de llave

El asistente de nueva llave ya geocodifica con Nominatim; pasa a usar el mismo servicio compartido y muestra el punto sugerido con su distancia formateada igual que en `/buscar`.

## Preparado para Google Maps

Toda la lógica de mapas queda detrás de una interfaz única (geocodificar dirección, calcular distancia, render del mapa). Migrar a Google Maps después es reemplazar la implementación OSM por la de Google, sin tocar las pantallas.

## Detalle técnico

- `src/lib/geo.ts`: `haversineKm()`, `formatDistance()` y tipo `GeoPoint` (sin dependencias de proveedor).
- `src/lib/geo.functions.ts`: server fn `geocodeAddress` que llama a Nominatim desde el servidor (evita CORS y rate-limit del navegador, permite mandar el `User-Agent` que pide su política de uso) y devuelve `{ lat, lng, label }`.
- `src/components/pasallave/points-map.tsx`: componente Leaflet, cargado con `React.lazy` dentro de `<ClientOnly>` para que `leaflet` no entre al bundle SSR; recibe `points`, `origin`, `selectedId`, `onSelect`.
- Dependencias nuevas: `leaflet` + `react-leaflet` (CSS vía `<link>` en `__root.tsx`, no `@import`).
- `src/routes/buscar.tsx`: estado de origen geocodificado, orden por distancia con `useMemo`, uso del nuevo mapa.
- `src/components/pasallave/new-key-wizard.tsx`: reemplaza el `fetch` directo a Nominatim por `geocodeAddress` y usa `formatDistance`.
- Sin cambios de base de datos.
