# Precios de planes editables desde el panel

Hoy los precios de la home ("$X") y los importes de facturación están escritos a mano en el código. La idea es que el admin los cargue una vez y se reflejen en todos lados.

## Qué se va a construir

**1. Nueva pestaña "Planes" en el panel de Admin (dentro de Facturación)**

Una tabla editable con los tres planes existentes:

| Plan | Campos editables |
|---|---|
| Pasa Una | precio, sufijo ("/ intercambio"), subtítulo, lista de beneficios, texto del botón |
| Pasa Mes | igual |
| Pasa Pro | igual (permite dejar el precio vacío = "Consultar") |

También se podrá editar el precio del día extra (hoy fijo en $1.500).

Guardado con un botón por plan y confirmación en pantalla.

**2. La home lee esos precios**

La sección "Elegí tu plan" de la landing deja de tener valores fijos y muestra lo cargado por el admin. Si todavía no se cargó nada, muestra los valores actuales como respaldo. La página sigue siendo pública y rápida (se lee en el servidor, sin login).

**3. Coherencia en el resto de la app**

Los mismos precios se usan en:
- el asistente de alta de llave (resumen de costo),
- el checkout y el cierre de facturación mensual (importes cobrados a anfitriones),
- las comisiones de puntos, que se calculan sobre esa facturación.

Los cobros ya emitidos no cambian: un cambio de precio solo afecta los períodos que se cierren después.

## Detalles técnicos

- Migración: tabla `public.plan_prices` con `plan` (clave: one_use/monthly/pro), `price_cents`/`amount` entero nullable, `price_label`, `subtitle`, `features` (text[]), `cta`, `sort_order`, timestamps + trigger de `updated_at`. Fila extra o columna de settings para `extra_day_price`.
- GRANTs: `SELECT` a `anon` y `authenticated` (precios son públicos), `ALL` a `service_role`. RLS activo: lectura pública, escritura solo `is_admin()`.
- Seed en la misma migración con los tres planes y los valores actuales (7500 / 30000 / null, día extra 1500).
- Lectura pública: server fn en `src/lib/pricing.functions.ts` con cliente publishable (sin auth), consumida por el loader de `src/routes/index.tsx` y por `PlanCard`.
- Escritura: server fn con `requireSupabaseAuth` + verificación de rol admin, usada por la nueva UI en `src/routes/_authenticated/admin.facturacion.tsx`.
- `PLAN_PRICES` y `EXTRA_DAY_PRICE` en `src/lib/pasallave.ts` quedan como valores de respaldo; `PLAN_AMOUNT` en `src/lib/pasallave.functions.ts` pasa a leerse de la tabla al generar el período.
