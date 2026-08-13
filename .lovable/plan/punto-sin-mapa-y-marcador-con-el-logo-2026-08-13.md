# Punto sin mapa y marcador con el logo

## Por qué no se ve en el mapa

El único punto cargado ("Kiosco Full de Todo", Esmeralda 384) no tiene coordenadas guardadas: en la base, `lat` y `lng` están vacíos. El panel del mapa solo dibuja puntos con coordenadas, así que aunque la tarjeta quede seleccionada, no hay nada que ubicar y se muestra el texto "Elegí un punto para verlo en el mapa".

Desde el último cambio, al editar un punto y elegir una dirección sugerida sí se guardan las coordenadas. Falta resolver los puntos ya cargados y avisar mejor cuando falten.

## Qué se hace

1. **Completar las coordenadas de los puntos existentes**: se geocodifica la dirección actual y se guardan `lat`/`lng` para el punto ya cargado, así aparece en el mapa de `/buscar` y en el mapa de la home.
2. **Aviso claro en el panel de administrador**: en la lista de puntos, los que no tengan ubicación muestran una etiqueta "Sin ubicación en el mapa" con un botón "Ubicar" que geocodifica la dirección guardada y la persiste, sin tener que reescribirla.
3. **Aviso en `/buscar`**: si el punto seleccionado no tiene coordenadas, en vez del texto genérico se indica que ese punto todavía no tiene ubicación cargada.

## Marcador con el logo

Sí, se puede. El marcador pasa a ser el logo de pasallave sobre una "gota" blanca con sombra:

- Punto normal: logo en azul de marca sobre fondo blanco.
- Punto seleccionado: mismo pin, más grande y con borde/acento naranja.
- Tu dirección buscada: se mantiene un pin distinto (navy, sin logo) para no confundirlo con un punto.

## Detalle técnico

- `src/components/pasallave/points-map.tsx`: reemplazar `pinSvg` por un icono construido con `L.divIcon` que renderiza el SVG del logo (mismo path que `public/favicon.svg`) dentro de un contenedor circular blanco con la cola del pin; tamaños 36x46 (normal) y 44x56 (seleccionado).
- `src/routes/_authenticated/admin.puntos.tsx`: badge de "sin ubicación" y acción "Ubicar" que llama `geocodeAddress` y actualiza `kiosks.lat/lng` con la mutación existente.
- `src/routes/buscar.tsx`: mensaje del panel del mapa según si el punto seleccionado tiene coordenadas.
- Actualización de datos: un update puntual sobre `kiosks` con las coordenadas de Esmeralda 384 (CABA).
