# Plan: adoptar pasallave.com como frontend oficial

Objetivo: convertir fielmente el HTML/CSS de pasallave.com en componentes React y aplicar ese mismo sistema visual a toda la app (landing, login, paneles admin/anfitrión/asociado/punto, búsqueda pública y pase de abordar).

## 1. Tokens y estilos globales

Actualizar `src/styles.css` para reflejar la identidad de pasallave.com:

- Paleta:
  - navy: `#1A237E` (fondos oscuros, títulos, footer)
  - electric: `#2979FF` (CTAs, acentos, links)
  - orange-brand: `#FF6D00` (detalles, badge "PUNTO SEGURO")
  - superficies: blanco `#FFFFFF`, gris claro `#F8FAFC` / `#F1F5F9`, texto `#1F2937`
- Tipografía: cambiar a `Quicksand` (Google Fonts) en todos los pesos 400-700.
- Radios: pasar de `rounded-[10px]`/`rounded-[16px]` a `rounded-full`, `rounded-[2.5rem]` y `rounded-[3rem]` según el componente.
- Sombras: sombras suaves tipo `0 25px 50px -12px rgba(0,0,0,0.15)` y `shadow-lg shadow-blue-200`.
- Utilidades: conservar `glass-card` pero ajustarla a la nueva paleta; agregar `.bg-navy`, `.text-navy`, `.bg-electric`, `.text-electric`, `.bg-orange-brand`, `.border-electric`, `.hero-gradient`.

## 2. Componentes compartidos de marca

Crear/reemplazar en `src/components/pasallave/`:

- `BrandLogo`: isotipo "p-llave" (círculo con borde electric, punto naranja, muescas) + wordmark "asallave".
- `MarketingNav`: navbar fija con blur, links a secciones ancla (`#como-funciona`, `#planes`, `#puntos`) y CTA "Soy anfitrión".
- `MarketingFooter`: grid de 4 columnas con logo, Empresa, Soporte, Legal y redes.
- `PlanCard`: tarjeta de plan con `rounded-[2.5rem]`, hover `translateY(-8px)`, badge "Recomendado".
- `FeatureStep`: ícono en caja `rounded-3xl` con hover a electric.
- `StickerMockup`: recreación del sticker "Punto Pasallave".
- `PhoneMockup`: mockup del mapa con pins y bottom sheet (reutilizable en hero).

## 3. Landing page (`src/routes/index.tsx`)

Reemplazar la landing actual por la estructura exacta de pasallave.com:

1. Nav de marca.
2. Hero: gradiente claro, título "Intercambiá llaves sin coordinar horarios", subtítulo, CTA "Encontrar punto cercano", badges Seguro/Flexible/Cercano, mockup del teléfono.
3. Cómo funciona: 3 pasos (Dejá la llave / Compartí el código / Check-in listo).
4. Planes: pasa una / pasa mes (recomendado) / pasa pro.
5. Banner identificación física: fondo navy, sticker y chips Confianza/Visibilidad.
6. Footer de marca.

Mantener meta tags y JSON-LD existentes, adaptando títulos/descripciones.

## 4. Páginas públicas

- `src/routes/buscar.tsx`: aplicar tipografía, colores y radios de la marca; mantener funcionalidad de búsqueda, mapa y lista de espera.
- `src/routes/pase.$ref.tsx`: rediseñar el pase con la paleta navy/electric, mantener multilenguaje y datos dinámicos.

## 5. Login

- `src/routes/login.tsx`: fondo claro/gradiente, card con `rounded-[2.5rem]`, tipografía Quicksand, conservar ojito de contraseña, Google OAuth y redirección por rol.

## 6. Paneles internos

Aplicar la misma paleta y componentes a todos los paneles sin perder funcionalidad:

- `src/routes/_authenticated/admin.tsx` y `admin.index.tsx`: sidebar/header con navy/electric, tarjetas de métricas redondeadas, gráficos con colores actualizados.
- `src/routes/_authenticated/host.tsx`: lista de llaves, intercambios, diálogos y botones con la nueva estética.
- `src/routes/_authenticated/associate.tsx`: comisiones y puntos con cards redondeadas y colores de marca.
- `src/routes/_authenticated/point.tsx`: kiosk/punto con teclado grande, estados de resultado/error/countdown, ocupación de casilleros; adaptar a la nueva paleta manteniendo la máquina de estados.

## 7. Componentes UI base

Actualizar `src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`, etc., para que usen los tokens navy/electric por defecto sin romper usos existentes.

## 8. Verificación

- Build sin errores (`vite build`).
- Revisar visualmente landing, login, admin, host, associate, point, buscar y pase.
- Confirmar que el ojito del login sigue funcionando.
- Confirmar que flujos de autenticación y redirección por rol no se rompen.
