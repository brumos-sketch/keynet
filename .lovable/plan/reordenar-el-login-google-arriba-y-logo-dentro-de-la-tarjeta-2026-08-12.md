# Reordenar el login: Google arriba y logo dentro de la tarjeta

Ajuste visual del formulario de ingreso en `/login`, siguiendo la referencia enviada pero manteniendo la identidad actual (navy / electric / Quicksand, tarjeta `rounded-[2.5rem]`).

## Cambios

1. **Logo dentro de la tarjeta**
   - Mover el `BrandLogo` (hoy arriba, fuera de la tarjeta) al interior de la card, alineado a la izquierda junto al título.
   - Quitar el bloque superior duplicado y su subtítulo, dejando el fondo `hero-gradient` limpio.

2. **Orden del formulario (como en la referencia)**
   - Título ("Ingresar" / "Crear cuenta") + subtítulo corto.
   - Botón **Continuar con Google** en primer lugar, con el ícono de Google a la izquierda (SVG multicolor inline, no imagen externa).
   - Separador "o".
   - Campos: Nombre (solo registro), Email, Contraseña (se conserva el ojito de mostrar/ocultar).
   - Botón primario Ingresar/Registrarme en electric, ancho completo.
   - Pie: "¿No tenés cuenta? Registrate".

3. **Detalles visuales**
   - Botón de Google con borde gris suave, fondo blanco y texto navy en negrita, misma altura (h-12) y radio que el botón primario.
   - Espaciados consistentes con el resto de la app; sin cambiar colores de marca.

## Alcance técnico

- Solo se edita `src/routes/login.tsx` (reordenar JSX y agregar el ícono SVG de Google).
- Sin cambios en lógica de autenticación, roles, redirecciones ni backend.
