# Fusión: traer el look y el flujo del punto de "Key Keeper" a PASALLAVE

Resultado final en **este** proyecto (PASALLAVE). Del otro proyecto se toma la capa visual completa (dashboard, cards, colores, tipografía, iconos) y lo mejor del panel de depósito/retiro del punto. La lógica de negocio de PASALLAVE (base de datos, códigos unificados, posiciones dinámicas, planes, comisiones) se conserva.

## 1. Identidad visual (adoptar todo el look)

Nuevos tokens, traducidos al formato actual (light mode, OKLCH, Tailwind v4):

- Primario: teal/verde azulado (reemplaza el azul actual). Anillo y foco en el mismo tono.
- Fondo gris muy claro azulado, cards blancas, bordes suaves.
- Estados semánticos completos: success, warning, info, destructive (hoy falta `info`).
- Radio base 12px (queda igual), cards a 12-16px.
- Tipografía: **Inter** para texto y **JetBrains Mono** para códigos y números de casillero (cargadas por `<link>` en el root, no por `@import` en CSS).
- Utilidades nuevas: `glass-card` (card con blur y sombra suave), `gradient-text`, `code-text` (mono con tracking), sombras `card` / `elevated` / `glow`, animaciones `fade-in` y `glow-pulse`.

Se mantiene **solo light mode** (sin bloque `.dark`), como está definido hoy en el proyecto.

## 2. Dashboard y cards

- Tarjetas de métricas del dashboard admin con el estilo del otro proyecto: icono coloreado arriba, número grande, etiqueta chica, entrada animada escalonada.
- Cards de contenido pasan a `glass-card` con sombra suave en lugar de bordes duros.
- Badges de estado y de plan unificados en un componente con colores semánticos (activo, depositado, retirado, vencido, completado).
- Referencias de reserva y códigos se muestran en tipografía monoespaciada.
- Mismo tratamiento en los paneles de anfitrión y asociado para que todo se vea consistente.
- Iconografía: se homogeneiza en lucide-react, con el set de iconos por métrica/estado del otro proyecto.

Los buscadores, filtros, columnas y datos actuales se conservan; solo cambia la presentación.

## 3. Depósito y retiro del punto — comparación y decisión

Cómo funciona hoy en cada uno:

| Aspecto | PASALLAVE (actual) | Key Keeper | Decisión |
|---|---|---|---|
| Posición del casillero | Se asigna al validar, según libre real | Preasignada al crear | **Queda PASALLAVE** |
| Códigos | Depósito fijo por llave + código de huésped bidireccional | Varios tipos según plan | **Queda PASALLAVE** |
| Horario del punto | Bloquea la operación fuera de horario | No existe | **Queda PASALLAVE** |
| Teclado | Teclado en pantalla | Celdas 3-3 grandes + teclado + tecla borrar/limpiar | **Se adopta Key Keeper** |
| Confirmación | Directa | Pantalla intermedia grande con acción, color e ícono, y botón "Confirmar acción" | **Se adopta Key Keeper** |
| Errores | Mensaje simple | Pantalla de error a pantalla completa + vibración del campo + "Reintentar" | **Se adopta Key Keeper** |
| Retiro anticipado | No avisa | Pantalla con cuenta regresiva "Retiro disponible a las HH:MM" | **Se adopta Key Keeper** |
| Registro | Movimientos | Además guarda quién retiró (rol y nombre) en códigos Pro | **Se adopta Key Keeper** |

Flujo resultante en `/point`:

```text
Teclado (6 dígitos, 3-3)
   -> código inválido / ya usado / fuera de horario  -> Pantalla de error -> Reintentar
   -> retiro antes de la hora habilitada             -> Cuenta regresiva
   -> válido -> Pantalla de acción (DEPOSITAR / ENTREGAR / RECIBIR)
                con la posición del casillero en grande
                -> Confirmar acción -> se aplica en la base y vuelve al teclado
```

La posición mostrada en la pantalla de acción sigue siendo la que asigna el servidor en ese momento (depósito y devolución) y la que ya ocupa la llave (retiro). La grilla de ocupación y el estado abierto/cerrado del punto se mantienen, rediseñados con los nuevos tokens.

## 4. Detalles técnicos

- Se copia y traduce `src/index.css` del otro proyecto al `@theme inline` + `:root` de `src/styles.css` (HSL -> OKLCH, sin `.dark`, sin `@import` remoto).
- Fuentes Inter y JetBrains Mono vía `links` en `head()` de `src/routes/__root.tsx`.
- Se agrega `motion` (framer-motion) para las transiciones entre pantallas del punto y la entrada de las cards.
- Componentes nuevos/actualizados en `src/components/pasallave/`: `stat-card`, `status-badge`, `plan-badge`, `booking-ref`.
- `src/routes/_authenticated/point.tsx` se reescribe como máquina de estados `keypad | result | error | countdown`, llamando a las server functions existentes (`validateCode` y confirmación) sin cambiar el contrato.
- Sin cambios de base de datos salvo, si hace falta, registrar rol y nombre de quien opera en los códigos Pro.

## 5. Verificación

- Typecheck y build.
- Recorrido con navegador: login admin (dashboard y cards nuevos), panel anfitrión, panel asociado y `/point` completo (depósito, retiro, devolución, código inválido, fuera de horario).
