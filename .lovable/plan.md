# Vista previa del enlace con el logo de Pasallave

## Objetivo
Reemplazar la imagen de vista previa (Open Graph / tarjeta social) actual por una tarjeta que muestre el logo y la marca Pasallave, para que al compartir el enlace se vea el isotipo en lugar de una preview genérica o vacía.

## Estado actual
- El logo está cargado como asset CDN en `src/assets/logo-pasallave.svg.asset.json`.
- `src/routes/__root.tsx` define metadatos por defecto pero no incluye `og:image` ni `twitter:image`.
- `src/routes/index.tsx` tiene `og:title`, `og:description` y `canonical`, pero apunta a `https://pasallave.lovable.app/` en lugar del dominio publicado real (`https://keynet.lovable.app`).
- El sitio ya está publicado en `https://keynet.lovable.app`.

## Pasos a implementar

### 1. Generar una imagen Open Graph optimizada
- Crear una imagen PNG de 1200×630 px (formato estándar para `summary_large_image`) usando el logo SVG existente.
- Componerla con el fondo de marca (navy `#1A237E` + degradado sutil o toques eléctricos `#2979FF`) y, opcionalmente, el tagline "Intercambio de llaves sin coordinar horarios".
- Convertir el SVG a PNG y montar la tarjeta con ImageMagick para que el texto quede nítido.

### 2. Subir la imagen como asset estable
- Usar `lovable-assets create` para subir el PNG resultante y obtener su URL CDN persistente.
- Guardar el puntero `.asset.json` en `src/assets/`.

### 3. Agregar metadatos de imagen en la raíz
- En `src/routes/__root.tsx` agregar dentro de `head().meta`:
  - `property: "og:image"` con URL absoluta del asset.
  - `property: "og:image:width"` → `1200`.
  - `property: "og:image:height"` → `630`.
  - `property: "og:image:type"` → `image/png`.
  - `property: "og:image:alt"` → descripción corta de Pasallave.
  - `name: "twitter:image"` con la misma URL absoluta.
  - `name: "twitter:image:alt"`.
- La URL absoluta se construirá a partir del dominio publicado real (`https://keynet.lovable.app`) + la ruta del asset CDN.

### 4. Corregir el dominio canónico en el inicio
- En `src/routes/index.tsx` actualizar `canonical` y `og:url` a `https://keynet.lovable.app/` para que coincidan con el dominio publicado.
- Ajustar también `og:title` y `og:description` si es necesario para que sean consistentes con la imagen.

### 5. Verificación
- Revisar el HTML renderizado en `/` y confirmar que los tags `og:image` y `twitter:image` aparecen con URL absoluta.
- Acceder directamente a la URL del asset para confirmar que se sirve correctamente.
- Aclarar al usuario que las plataformas sociales cachean la preview, por lo que puede tardar en actualizarse y que se puede forzar el refresco desde los debuggers de Facebook/Twitter/LinkedIn.

## Nota sobre indexación
Publicar no garantiza que Google indexe inmediatamente. Para acelerarlo conviene:
- Verificar el dominio en Google Search Console.
- Enviar el sitemap (`/sitemap.xml` si existe o generarlo).
- Mantener `robots.txt` permitiendo rastreo (ya está OK).
- Evitar `noindex` global.

Esa parte se puede abordar en un plan aparte si el usuario lo solicita.
