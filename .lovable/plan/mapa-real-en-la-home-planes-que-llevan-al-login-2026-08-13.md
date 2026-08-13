# Mapa real en la home + planes que llevan al login

## 1. Mapa de puntos reales en el mockup del teléfono

Hoy el "teléfono" de la home dibuja un mapa falso (puntitos y "Café Martínez" fijo). Se reemplaza por el mapa real de OpenStreetMap con los puntos cargados en la base:

- La home pasa a cargar también los puntos públicos (misma fuente que usa la página de búsqueda).
- Dentro del marco del teléfono se renderiza el mapa real (solo en el navegador, sin romper el render del servidor).
- Los pines son los puntos reales; al tocar uno, la tarjeta inferior muestra su nombre, dirección y estado ABIERTO/CERRADO calculado con su horario.
- El botón "Dejar llave aquí" abre la búsqueda con ese punto ya preseleccionado.
- Si todavía no hay puntos con coordenadas, se mantiene el mapa decorativo actual como respaldo (nada queda vacío).

## 2. Botones de los planes al login

Cada tarjeta de plan de la home ("Empezar ahora", "Elegir plan", "Contactar ventas") pasa a ser un enlace al login, llevando el plan elegido en la URL para poder usarlo después del registro.

## 3. Punto preseleccionado se busca automáticamente

La página de búsqueda acepta un punto en la URL (`/buscar?punto=<id>`):

- Ese punto queda seleccionado, la lista se ordena mostrándolo primero y el mapa se centra en él.
- Si además tiene dirección, se usa como referencia para ordenar por cercanía.
- Si el id no existe, se muestra la búsqueda normal sin error.

## Detalles técnicos

- `src/routes/index.tsx`: loader devuelve `plans` + `kiosks` (`listPublicKiosks`); estado de punto seleccionado; `PhoneMockup` recibe `points` y callbacks.
- `src/components/pasallave/phone-mockup.tsx`: acepta props opcionales; `ClientOnly` + `lazy(() => import("points-map"))` con altura ajustada al marco; fallback al mock actual cuando no hay puntos.
- `src/components/pasallave/points-map.tsx`: se agrega prop opcional `height`/`className` para el marco del teléfono (sin cambiar su uso actual en `/buscar`).
- `src/components/pasallave/plan-card.tsx`: soporte `href` para renderizar `<Link>` en lugar de `<button>`.
- `src/routes/buscar.tsx`: `validateSearch` con `punto?: string`; inicializa `selected` desde la URL y prioriza ese punto en el orden; `kioskOpenState` ya existe para el estado abierto/cerrado.
- Sin cambios de base de datos ni de RLS: se usa el RPC público ya existente.
