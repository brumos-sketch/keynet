# Google Maps en pasallave

No necesitás crear cuenta en Google Cloud ni conseguir una API key: Lovable tiene un conector de Google Maps Platform con credenciales administradas. Yo abro la tarjeta de conexión, vos aceptás, y con eso quedan habilitados mapa, autocompletado y geocodificación.

De todos los productos del catálogo, solo se usan tres:

- **Maps JavaScript API** — el mapa interactivo.
- **Places API (New)** — autocompletado de direcciones y datos del lugar.
- **Geocoding API** — dirección a coordenadas (para guardar lat/lng de los puntos).

## Qué cambia en la app

1. **Mapa de puntos** (`/buscar` y el teléfono de la home): pasa de OpenStreetMap a Google Maps, con los mismos marcadores con el logo de pasallave (azul normal, naranja el elegido) y el pin distinto para tu dirección. Se mantiene el encuadre automático, el clic en marcador que selecciona la tarjeta y el botón "Dejar llaves aquí".
2. **Autocompletado de direcciones**: el campo actual pasa a usar Google Places, con sugerencias mucho más precisas que las de hoy (número de puerta, esquinas, nombres de comercios). Se usa en alta de llave, búsqueda de puntos y alta/edición de punto en el panel de administrador.
3. **Geolocalización "cerca mío"**: botón para usar la ubicación del navegador y ordenar los puntos por cercanía real, sin escribir la dirección. Si el usuario rechaza el permiso, sigue funcionando igual que hoy escribiendo la dirección.
4. **Cómo llegar**: los enlaces pasan a abrir la ruta en Google Maps desde la ubicación del usuario.

Todo lo demás (ocupación, horarios, estados, panel del punto) queda igual.

## Detalle técnico

- Conectar el conector `google_maps` (credenciales administradas). El mapa en el navegador usa `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`; geocodificación y Places del lado servidor pasan por el gateway desde server functions.
- `src/lib/geo.functions.ts`: `geocodeAddress` y `suggestAddresses` cambian su implementación interna a Google (Geocoding API y `places/v1/places:autocomplete` + `places:searchText` vía gateway), manteniendo la misma firma y tipos, así no cambia ningún componente que las consume.
- `src/components/pasallave/points-map.tsx`: se reescribe con `@vis.gl/react-google-maps` (`APIProvider`, `Map`, `AdvancedMarker` no — se usa `Marker` clásico sin `mapId`), carga asíncrona, misma API de props (`points`, `origin`, `selectedId`, `onSelect`, `height`). Se quitan `leaflet`/`react-leaflet` y su CSS del `__root.tsx`.
- `src/components/pasallave/address-autocomplete.tsx`: mismo componente y misma UX (debounce, teclado, estados), consumiendo las sugerencias de Google.
- Nuevo botón de geolocalización en `/buscar` usando `navigator.geolocation` dentro de un handler de cliente, con fallback silencioso.
- Sin cambios de base de datos ni de RLS.

## Nota sobre dominio propio

La clave administrada funciona en `*.lovable.app`. Cuando publiques en un dominio propio (pasallave.com), va a hacer falta una API key propia de Google Cloud con ese dominio en la lista de referrers; te guío en ese momento.
