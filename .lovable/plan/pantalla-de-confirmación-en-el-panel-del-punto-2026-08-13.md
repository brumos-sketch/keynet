# Pantalla de confirmación en el panel del punto

## Objetivo
Después de que el operador del punto confirma una operación válida, mostrar una pantalla de éxito con un tilde verde durante 3 segundos antes de volver automáticamente al teclado numérico.

## Cambios propuestos

1. **Extender el estado de pantalla**
   - Agregar `confirmed` al union type `Screen` en `src/routes/point.tsx`.

2. **Nuevo componente `ConfirmedScreen`**
   - Mostrar un círculo verde grande con el icono `Check` o `CheckCircle2`.
   - Texto principal: "Operación confirmada".
   - Subtítulo opcional: "Volviendo al teclado…".
   - Usar `animate-fade-in` para mantener coherencia con las demás pantallas.

3. **Cambiar el flujo de confirmación**
   - En `ResultScreen`, el botón "Confirmar acción" ya no llamará directamente a `onConfirm`.
   - En su lugar, cambiará el estado de `screen` a `{ kind: "confirmed" }`.
   - `ConfirmedScreen` recibirá `onComplete` (la función `backToKeypad` existente).

4. **Temporizador de 3 segundos**
   - Dentro de `ConfirmedScreen`, usar `useEffect` con `setTimeout(3000)` para llamar a `onComplete`.
   - Limpiar el timeout en el cleanup del efecto para evitar fugas si el usuario navega antes.

5. **Integración en `PointPanel`**
   - Renderizar `ConfirmedScreen` cuando `screen.kind === "confirmed"`.
   - Pasar `backToKeypad` como prop `onComplete`.

## Archivos a modificar
- `src/routes/point.tsx`

## No incluye
- Cambios en la lógica de validación del código.
- Cambios en estilos globales o en otros paneles.
- Sonidos ni notificaciones push.
