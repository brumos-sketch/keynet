# Ajustes visuales y de texto en la tarjeta de embarque

## Objetivo
Refinar el pase de abordar (`/pase/$ref`) para que muestre la marca PASALLAVE, use el nombre "Tarjeta de embarque" en español, aclare dónde retirar la llave y agregue acciones de copiar/compartir al final.

## Cambios

### 1. Nombre en español
- En `src/routes/pase.$ref.tsx`, cambiar `T.es.label` de `"Pase de abordar"` a `"Tarjeta de embarque"`.
- Las traducciones en inglés y portugués se mantienen.

### 2. Marca en la cabecera
- Incluir el logo de PASALLAVE y el wordmark en la parte superior de la tarjeta, usando los componentes existentes `BrandLogo` / `Brand` de `src/components/pasallave/brand-logo.tsx` y `ui-bits.tsx`.
- Ubicarlo dentro del header de la tarjeta, sin romper el diseño responsive actual.
- Quitar el selector manual de idioma: el idioma se detecta automáticamente desde el navegador/sistema (`navigator.language`), y si no hay traducción disponible se muestra en inglés.

### 3. Etiqueta del punto
- Reemplazar el texto `t.point` en español de `"Punto asociado"` a `"Donde retirar las llaves:"`.
- Mantener la presentación en mayúsculas pequeñas (`uppercase`) como está.
- En inglés y portugués se dejan textos equivalentes coherentes (por ejemplo: `"Where to pick up the keys:"` / `"Onde retirar as chaves:"`).

### 4. Paso 2
- Cambiar `T.es.s2` a `"Mostrá tu código al empleado del punto."`.
- Ajustar inglés y portugués con traducciones equivalentes.

### 5. Acciones de copiar y compartir
- Agregar al final de la tarjeta una fila con dos botones/iconos:
  - **Copiar código**: copia el `pickup_code` al portapapeles (`navigator.clipboard.writeText`) y muestra un breve feedback visual.
  - **Compartir**: usa la API nativa `navigator.share` cuando esté disponible; si no, cae de nuevo a copiar el enlace/código.
- Agregar claves de traducción para "Copiar código", "Compartir", "Copiado", etc., en `es`, `en` y `pt`.
- Asegurar que el botón no aparezca si no hay código generado.

## Archivos afectados
- `src/routes/pase.$ref.tsx`

## Sin cambios de base de datos
