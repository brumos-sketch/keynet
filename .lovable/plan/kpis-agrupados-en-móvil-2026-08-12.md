# KPIs agrupados en móvil

Reorganizar las tarjetas KPI del dashboard admin para que en pantallas chicas se vean como en la referencia: bloque agrupado con una grilla 2x2 de tarjetas compactas (icono arriba a la izquierda, número grande a la derecha, etiqueta debajo).

## Cambios

1. `src/components/pasallave/stat-card.tsx`
   - Nuevo layout compacto en móvil: fila superior con el icono (chip de color) a la izquierda y el número grande alineado a la derecha; etiqueta debajo en minúscula/gris.
   - En `sm:` y superior se mantiene el estilo vertical actual.
   - Padding y tipografía reducidos en móvil para que entren 2 por fila sin desbordes (`min-w-0`, `truncate` en la etiqueta).

2. `src/routes/_authenticated/admin.index.tsx`
   - Cambiar la grilla de KPIs a `grid-cols-2` en móvil (hoy es 1 columna hasta `sm`), manteniendo `lg:grid-cols-3 xl:grid-cols-6`.
   - Agrupar las 6 tarjetas en un contenedor tipo panel suave en móvil (fondo sutil + padding + gap chico), que desaparece en desktop.

3. Verificación con captura móvil (390px) del dashboard.

## Notas técnicas

Solo cambios de presentación; no se toca lógica de datos ni consultas. Se usan tokens semánticos existentes (`glass-card`, colores de acento) para respetar modo claro/oscuro.
