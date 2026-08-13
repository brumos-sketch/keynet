# Tipografía en móvil + badge "Edit with Lovable"

## Qué está pasando con la fuente

La app carga Quicksand desde Google Fonts con un `<link>` externo. Navegadores con bloqueo de terceros (Brave, que es el del screenshot, y también Firefox estricto, modo ahorro de datos o extensiones) **bloquean `fonts.googleapis.com`**, así que el texto cae al tipo de letra del sistema (Roboto en Android). Por eso en tu teléfono se ve distinto que en la compu.

## Solución: auto-hospedar la tipografía

1. Descargar los archivos `.woff2` de Quicksand (400, 500, 600, 700) y JetBrains Mono (400, 500, 700).
2. Publicarlos como assets del proyecto y declararlos con `@font-face` (con `font-display: swap`) en `src/styles.css`.
3. Quitar el `<link>` a Google Fonts y los `preconnect` de `src/routes/__root.tsx`.
4. Agregar un `<link rel="preload">` a los 2 pesos más usados para que el primer render no parpadee.

Resultado: la fuente viaja desde el mismo dominio, así que ningún bloqueador de terceros la corta y se ve igual en todos los dispositivos.

### Detalle técnico
- `@font-face` va al inicio de `src/styles.css` (después de los `@import`), antes de `@theme`.
- `--font-sans` y `--font-mono` no cambian de valor, sólo cambia el origen de los archivos.
- Se mantiene la cadena de fallback actual por si un peso falla.

## Sobre el badge "Edit with Lovable"

Sí, es una etiqueta que Lovable agrega a los sitios publicados y **se puede ocultar**: está disponible con un plan pago, desde los ajustes de publicación del proyecto. No requiere cambios de código; si querés, una vez que tengas el plan lo desactivo yo desde la configuración del proyecto.
