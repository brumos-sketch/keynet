# Editar/eliminar llaves, llave en intercambios y plan Pro fijo

## 1. Editar y eliminar llaves (panel del anfitrión)

- Dentro de la tarjeta desplegable de cada llave se agregan dos acciones: **Editar llave** y **Eliminar llave**.
- Editar permite cambiar nombre, dirección y punto asociado. El nombre sigue validándose como único dentro del anfitrión.
- Eliminar solo está disponible si la llave no está depositada en un punto: se bloquea cuando existe algún intercambio en estado "depositado" o "retirado". En ese caso el botón queda deshabilitado con la aclaración "La llave está depositada en un punto".
- Al eliminar se borran también sus intercambios y códigos de acceso asociados, con diálogo de confirmación previo.

## 2. Columna "Llave" en intercambios

- En la tabla de Intercambios del panel del anfitrión se agrega una columna con el nombre de la llave, entre "Reserva" y "Punto".
- El panel de administrador ya muestra esa columna, así que no cambia.

## 3. Plan Pro fijo al crear llave

- Si el anfitrión tiene un acuerdo Pro activo, el paso "Plan" del alta de llave muestra Pro ya seleccionado, con "Un uso" y "Pasa Mes" en gris y sin poder elegirse.
- Se agrega una leyenda: "Tu cuenta tiene acuerdo Pro activo".
- El plan enviado al crear la llave es siempre `pro` en ese caso.

## Detalles técnicos

- `src/lib/pasallave.functions.ts`
  - Nueva `updateKey` (requireSupabaseAuth): valida host propietario o admin, acepta `name`, `propertyName`, `kioskId`; reusa la validación de nombre único excluyendo la propia llave.
  - Nueva `deleteKey`: verifica propiedad, rechaza si hay intercambios en `deposited`/`picked_up`, borra `access_codes`, `key_exchanges` y la llave.
  - `hostOverview` devuelve además el acuerdo Pro activo del anfitrión (`pro_agreements` con `status = 'active'`).
- `src/routes/_authenticated/host.tsx`: diálogo "Editar llave", confirmación de borrado, columna "Llave" en la tabla de intercambios (usando el mapa de llaves ya cargado).
- `src/components/pasallave/new-key-wizard.tsx`: nueva prop `forcePlan` (o lectura del overview) que fija `pro`, deshabilita los otros botones y aplica estilo grisado.
- Sin cambios de base de datos.
