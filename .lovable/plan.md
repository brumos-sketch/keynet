# Migración de OpenStreetMap a Google Maps Platform

Hoy la app usa Nominatim (OpenStreetMap) para geocodificación/autocompletado y Leaflet + OSM para renderizar mapas. Para pasar a Google Maps hay que reemplazar esas dos capas y conectar el conector de Google Maps Platform.

## Qué cambia

1. **Credenciales**: se conecta el conector `google_maps` del workspace. Esto inyecta las claves que necesita el servidor y la clave pública para el navegador.
2. **Geocodificación y autocompletado**: las server functions `geocodeAddress` y `suggestAddresses` dejan de llamar a Nominatim y usan Google Maps Platform a través del gateway de Lovable.
3. **Render de mapas**: el componente `PointsMap` deja de usar `leaflet`/`react-leaflet` y pasa a Google Maps JavaScript API (por ejemplo con `@vis.gl/react-google-maps`).
4. **Marcadores personalizados**: el pin con el logo de pasallave se reconstruye como marcador de Google Maps.
5. **Link "Cómo llegar"**: cambia de openstreetmap.org a Google Maps directions.
6. **Limpieza**: se eliminan `leaflet`, `react-leaflet` y `@types/leaflet` de las dependencias.

## Pasos técnicos

```text
Conector
└── standard_connectors--connect con connector_id="google_maps"
    └── Elige o crea una conexión de Google Maps Platform

Backend (server functions)
└── src/lib/geo.functions.ts
    ├── geocodeAddress  → gateway /maps/api/geocode/json
    └── suggestAddresses → gateway /places/v1/places:autocomplete o searchText

Frontend mapa
└── src/components/pasallave/points-map.tsx
    ├── Reemplazar MapContainer/TileLayer/Marker/Popup por Map/AdvancedMarker/InfoWindow
    ├── Rehacer iconos del logo como marcador de Google Maps
    └── Rehacer FitBounds con google.maps.LatLngBounds

Consumidores
└── src/routes/buscar.tsx           → link "Cómo llegar" a Google Maps
└── src/components/pasallave/new-key-wizard.tsx
└── src/routes/_authenticated/admin.puntos.tsx
└── src/components/pasallave/phone-mockup.tsx (si renderiza mapa)
    → Sin cambios de lógica; solo ajustar props/imports

Dependencias
└── package.json
    ├── Eliminar: leaflet, react-leaflet, @types/leaflet
    └── Agregar: @vis.gl/react-google-maps (recomendado) o @googlemaps/js-api-loader
```

### Detalle por archivo

- `src/lib/geo.functions.ts`: las respuestas de Google usan `geometry.location.lat/lng` y `formatted_address`/`place_id`, por lo que hay que mapear al tipo existente `{ lat, lng, label }`. Se mantiene `countrycodes=ar` equivalente restringiendo a Argentina.
- `src/components/pasallave/address-autocomplete.tsx`: la UI del dropdown se puede conservar y solo cambiar la fuente de datos, o reemplazar por `PlaceAutocompleteElement` de Google. La opción más rápida es conservar la UI actual y apuntarla al nuevo `suggestAddresses`.
- `src/components/pasallave/points-map.tsx`: se reescribe por completo. El mapa de Google se carga de forma asíncrona con `loading=async` y `callback`. No se usa `mapId` ni `AdvancedMarkerElement` si se quiere evitar configuración extra; se puede usar `google.maps.Marker` con icono personalizado.
- `src/routes/buscar.tsx`: actualizar el link de direcciones y el lazy import si cambia la ruta del componente.

## Costos y requisitos previos

- Google Maps Platform requiere un proyecto de Google Cloud con facturación activa.
- Hay que habilitar al menos: Geocoding API, Places API (New) y Maps JavaScript API.
- El conector de Lovable maneja las claves; no hace falta escribirlas a mano en `.env`, pero sí hay que elegir o crear la conexión.
- Nominatim es gratuito; Google cobra por uso. Para el volumen actual de la app el costo suele ser bajo, pero conviene revisar la cuota gratuita mensual.

## Notas

- Las funciones de distancia (`haversineKm`, `formatDistance`) en `src/lib/geo.ts` no cambian; solo dependen de lat/lng.
- No se requieren cambios de base de datos: las columnas `lat`/`lng` de los puntos siguen siendo las mismas.
- El autocompletado de Google Places (New) devuelve sugerencias más precisas para direcciones argentinas y admite sesiones para reducir costos.
