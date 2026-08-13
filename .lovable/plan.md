# Mantener el punto elegido visible en el paso 2

## Qué pasa hoy

La selección **sí** se guarda: al tocar "Elegir este punto" en el paso 1 se guarda el id del punto y el botón cambia a "Punto elegido". El problema es visual: en el paso 2 la lista se muestra completa, sin orden y sin desplazarse, así que el punto elegido (por ejemplo "Kiosco Bulnes Express") queda más abajo, fuera de la vista, y parece que se perdió la selección.

## Cambios propuestos (paso 2 del asistente "Alta de llave")

1. **Aviso arriba de la lista**: si ya hay un punto elegido, mostrar una franja con "Punto elegido: <nombre>" y su distancia, para que se vea de inmediato.
2. **Orden**: el punto elegido siempre primero; después, si hay dirección con coordenadas, el resto ordenado por cercanía.
3. **Auto-scroll**: al entrar al paso 2, desplazar la lista hasta la tarjeta seleccionada (por si el usuario vuelve atrás y adelante).
4. **Marca más clara**: además del borde azul, agregar un check/etiqueta "Elegido" en la tarjeta seleccionada.

## Detalle técnico

- Archivo único: `src/components/pasallave/new-key-wizard.tsx`.
- Ordenar la lista con un `useMemo` derivado de `kiosks`, `form.kioskId` y `coords` (ya existe `haversineKm`).
- Usar un `ref` sobre el contenedor scrolleable + `scrollIntoView({ block: "nearest" })` en un `useEffect` cuando `step === 1`.
- Sin cambios de datos ni de backend.
