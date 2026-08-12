# Asignar la posición del casillero recién en el depósito

Tenés razón: hoy la posición se reserva cuando el anfitrión crea la estadía, mucho antes de que la llave llegue al punto. Eso bloquea casilleros que están físicamente libres y puede dar "No hay posiciones libres" aunque el punto esté vacío.

## Cómo debería funcionar

1. Al crear la estadía (o la llave mensual/pro), el intercambio nace **sin posición asignada** y en estado "esperando depósito".
2. Cuando el encargado del punto ingresa el código de depósito, recién ahí el sistema elige una posición libre real y la confirma en pantalla ("Guardá la llave en el casillero N").
3. La posición queda ocupada mientras la llave está en el punto (depositada). Cuando el huésped retira, el casillero vuelve a quedar libre para otra llave; en la devolución se asigna de nuevo una posición libre en ese momento.
4. Al completarse o expirar el intercambio, la posición se libera.

## Qué cambia en cada pantalla

- **Panel del anfitrión**: mientras esté esperando depósito, la posición se muestra como "Sin asignar" en lugar de un número.
- **Panel del punto (`/point`)**: la grilla de casilleros marca como ocupados solo los que realmente tienen una llave dentro; al validar un depósito o una devolución se destaca la posición asignada.
- **Panel de admin (intercambios, puntos, inicio)**: misma regla, "—" cuando todavía no hay posición.
- **Boarding pass del huésped**: sin cambios (nunca muestra la posición).

## Detalle técnico

- `createExchange` y la creación de llaves mensuales dejan de llamar a `reservePosition`; insertan `locker_position: 0` (sin asignar).
- `reservePosition` pasa a considerar ocupadas solo las posiciones de intercambios en estado `deposited` (llave físicamente en el punto), no las de `created`/`waiting_deposit`/`picked_up`.
- En `validateCode`, la asignación ocurre en las ramas de depósito y de devolución: se reserva la posición y se guarda junto con el cambio de estado (`deposited` / `completed` → liberar).
- Cálculo de ocupación y "posiciones libres" en `/point`, `admin.puntos` y la función pública `search_kiosks_public` se alinean al mismo criterio (solo `deposited`).
- La UI usa `locker_position > 0` para decidir entre mostrar el número o "Sin asignar".
