# Rediseño de la tarjeta de llave en el panel del anfitrión

## Objetivo

Cambiar la fila plegable de cada llave en `/host` para que muestre la información en una pila vertical más amplia, evitando truncar el nombre y la dirección.

## Cambios

### 1. Layout vertical de la fila plegable

Reorganizar el `CollapsibleTrigger` de `src/routes/_authenticated/host.tsx` para que, en todos los tamaños de pantalla, se vea así:

```text
[Nombre completo de la llave]                          ˅
[Dirección completa si está disponible]
[Plan] [Estado]
```

- El nombre pasa a ocupar el ancho completo, sin `truncate`.
- Debajo se muestra la dirección (`property_name`) sin truncar si tiene valor; si no hay dirección se omite la línea o se muestra "—".
- Los badges de plan y estado se ubican en una nueva línea debajo de la dirección, alineados a la izquierda.
- El chevron "˅" queda alineado a la derecha, centrado verticalmente con respecto al bloque de texto.

### 2. Espaciado y proporciones

- Aumentar el padding interno de la tarjeta (`px-5 py-4` en todos los tamaños) para que se sienta más amplia.
- Separar el nombre, la dirección y la línea de badges con `gap-1` o `gap-1.5` para mejor legibilidad.
- Mantener el borde redondeado y la sombra actual (`glass-card`).

### 3. Comportamiento del acordeón

- Conservar el funcionamiento plegable actual: una sola llave abierta a la vez, chevron que rota al abrirse, transición suave.
- El detalle desplegado (punto, códigos, estadía, botones) se mantiene igual; solo cambia el encabezado de la tarjeta.

## Archivos a modificar

- `src/routes/_authenticated/host.tsx`: ajustar el `CollapsibleTrigger` y las clases de la tarjeta plegable.

## Fuera de alcance

- No se tocan otros paneles (admin, asociado) ni la lógica de creación/edición de llaves.
- No se modifica la base de datos ni las funciones del servidor.
