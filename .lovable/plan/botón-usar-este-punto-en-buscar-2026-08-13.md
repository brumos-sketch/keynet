# Botón "Usar este punto" en /buscar

## Objetivo

Cuando un usuario selecciona un punto en `/buscar`, debajo del mapa debe aparecer un botón de acción que lo lleve directamente a dejar la llave en ese punto, sin tener que volver a buscarlo dentro del panel.

## Comportamiento

- El botón se muestra solo cuando hay un punto seleccionado y ese punto tiene coordenadas cargadas (es decir, cuando ya se ve en el mapa).
- Texto: "Dejar llaves aquí" (primario) con un link secundario "Ver cómo llegar".
- Si el usuario **no inició sesión**: el botón lo lleva a `/login?punto=<id>`; después de autenticarse, se redirige a `/host?punto=<id>`.
- Si el usuario **ya está autenticado como anfitrión**: el botón lo lleva a `/host?punto=<id>` y se abre automáticamente el asistente de "Nueva llave" con el punto preseleccionado.
- Si el usuario está autenticado con otro rol (admin, asociado), el botón lo lleva a su panel correspondiente sin intentar abrir el wizard de anfitrión.

## Cambios técnicos

- `src/routes/buscar.tsx`: agregar botón "Dejar llaves aquí" en el panel inferior del mapa; detectar sesión con `useAuth` para decidir el destino.
- `src/routes/login.tsx`: aceptar `punto` como parámetro de búsqueda además de `plan`; conservarlo durante el flujo de Google/email y, tras un login exitoso, redirigir a `/host?punto=<id>` para usuarios con rol `host`.
- `src/routes/_authenticated/host.tsx`: leer `punto` de la URL; si existe, abrir el `NewKeyWizard` y pasarle el `kioskId` preseleccionado.
- `src/components/pasallave/new-key-wizard.tsx`: aceptar prop opcional `preselectedKioskId`; si está presente, iniciar el wizard en el paso "Plan" con el punto ya elegido (o en el paso "Punto" con el punto marcado).

## Alcance

- No se agrega nuevo flujo de reserva ni checkout: solo se acelera el alta de llave existente.
- No se modifica la base de datos ni las políticas de acceso.
