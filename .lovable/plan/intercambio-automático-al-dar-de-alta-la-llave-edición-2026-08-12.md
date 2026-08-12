# Intercambio automático al dar de alta la llave + edición

## Idea

Buena idea, y ordena el flujo: hoy solo el plan Mensual crea un movimiento automático; Un uso y Pro obligan al anfitrión a crear la estadía aparte. Unificarlo hace que toda llave nazca con su intercambio listo (códigos ya visibles) y que las fechas se completen después, cuando se sepan.

## Comportamiento nuevo

1. Al dar de alta una llave (Un uso, Mensual y Pro) se genera automáticamente un intercambio:
   - referencia de reserva,
   - código de depósito fijo de la llave,
   - código de retiro/devolución bidireccional,
   - sin fechas ni horario, sin posición de casillero (se asigna al depositar),
   - estado "esperando depósito".
2. La confirmación del alta muestra la referencia y el enlace al pase de abordar.
3. El intercambio se puede editar después desde el panel del anfitrión (y desde admin): check-in, check-out, horario de retiro y nombre del huésped.
4. La edición solo se permite mientras la estadía no esté retirada/devuelta/vencida; después queda de solo lectura.
5. El plazo de 48 h de "Un uso" se sigue contando desde la creación del intercambio, igual que hoy.

## Panel del anfitrión

- En cada llave, la estadía activa aparece con sus códigos y un botón "Editar estadía" que abre el mismo formulario de fechas/horario.
- "Nueva estadía" sigue disponible para crear la siguiente vuelta cuando la anterior está cerrada.
- Si la estadía todavía no tiene fechas, se marca con un aviso suave "Faltan fechas" para invitar a completarlas.

## Detalles técnicos

- `src/lib/pasallave.functions.ts`
  - `createKey`: extraer la creación del intercambio a un helper y ejecutarlo para los tres planes (hoy solo `monthly`), reutilizando el `deposit_code` fijo de la llave y un `pickup_code`/`return_code` bidireccional; estado `waiting_deposit`; devolver también `exchangeId` y `bookingRef`.
  - Pro mantiene además su `access_codes` de huésped.
  - Nueva función `updateExchange` (con `requireSupabaseAuth`): valida host propietario o admin, acepta `checkIn`, `checkOut`, `pickupTime`, `guestName`, rechaza estados no editables y registra la edición en `access_log`.
- `src/routes/_authenticated/host.tsx`: reutilizar el diálogo actual de estadía en modo edición (precargado) y llamar a `updateExchange`.
- `src/routes/_authenticated/admin.intercambios.tsx`: botón "Editar" en el detalle con los mismos campos.
- `src/components/pasallave/new-key-wizard.tsx`: pantalla final con la referencia generada y acceso al pase.
- Sin cambios de base de datos: `key_exchanges` ya tiene todas las columnas.
