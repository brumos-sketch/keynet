# Ocupación visible en cada punto

Cada tarjeta de punto ya muestra "ocupados/total" (por ejemplo 3/12). Le sumamos el porcentaje y una barra de progreso con color según qué tan lleno esté.

## Qué se ve

- Junto al contador actual, el porcentaje de ocupación: `3/12 · 25%`.
- Debajo del encabezado de la tarjeta, una barra de progreso que se llena según la ocupación.
- Texto auxiliar: "X libres de Y posiciones".

## Colores por nivel

| Ocupación | Color |
| --- | --- |
| 0-49% | Verde (disponible) |
| 50-74% | Amarillo (moderado) |
| 75-89% | Naranja (casi lleno) |
| 90-100% | Rojo (crítico) |

El mismo color se aplica a la barra, al porcentaje y al chip del contador, para reconocer el estado de un vistazo.

## Detalles técnicos

- Archivo: `src/routes/_authenticated/admin.puntos.tsx`. Ya se calcula `occupancy` (posiciones activas por punto) en el query existente; no hace falta tocar base de datos ni consultas.
- Se agrega un helper local `occupancyTone(percent)` que devuelve las clases de color (verde/amarillo/naranja/rojo) usando tokens del design system.
- Barra: `div` contenedor con fondo gris claro y `div` interno con `width: %` y transición, en lugar de sumar dependencias.
- `percent = Math.round(taken.length / positions * 100)`, con guarda para `positions = 0`.
- Se mantiene la grilla de casilleros numerados tal como está.
