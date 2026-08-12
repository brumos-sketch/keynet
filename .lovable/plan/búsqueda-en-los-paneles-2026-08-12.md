# Búsqueda en los paneles

Me parece muy útil: hoy hay que recorrer las tablas a mano. Propongo un buscador simple y consistente en cada panel, que filtra en vivo mientras se escribe.

## Dónde va y qué busca

- **Admin → Llaves**: nombre de llave, propiedad, código fijo de depósito, anfitrión, punto, plan.
- **Admin → Intercambios**: referencia de reserva, código del huésped, llave, propiedad, punto, anfitrión (se combina con el filtro de estado que ya existe).
- **Admin → Puntos**: nombre, dirección, categoría, contacto.
- **Admin → Anfitriones / Usuarios**: nombre, email, teléfono.
- **Panel Anfitrión**: nombre de llave, propiedad, punto, referencia de reserva y códigos de sus estadías.
- **Panel Asociado**: nombre y dirección de sus puntos.

## Comportamiento

- Campo con ícono de lupa arriba de cada listado, con texto guía del estilo "Buscar por reserva, código o llave…".
- Filtrado inmediato del lado del cliente sobre los datos ya cargados, sin recargar.
- Insensible a mayúsculas, acentos y guiones: escribir `abc123` encuentra `ABC-123`.
- Botón para limpiar y mensaje "Sin resultados para …" cuando no hay coincidencias.
- En el panel del anfitrión, si el término coincide con una estadía, la llave correspondiente aparece con su lista de estadías desplegada.

## Detalle técnico

- Componente reutilizable `SearchField` en `src/components/pasallave/ui-bits.tsx` (input controlado + ícono + botón de limpiar).
- Helper `normalize()` y `matchesQuery(record, fields, query)` en `src/lib/pasallave.ts` para normalizar acentos/guiones.
- Cada ruta agrega un `useState` para el término y aplica el filtro con `useMemo` sobre los datos existentes de React Query. Sin cambios de base de datos ni de funciones de servidor.
