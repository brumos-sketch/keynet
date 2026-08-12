# Códigos unificados + rediseño del pase

## Modelo de códigos (nuevo)

Hoy el sistema genera códigos distintos según el plan (uno de depósito por intercambio en Un uso, código fijo solo en Mensual, código de acceso en Pro). Se unifica:

1. **Código de depósito fijo por llave** — todas las llaves (Un uso, Mensual y Pro) reciben un código único y permanente al darlas de alta. Es del anfitrión y no cambia entre estadías.
2. **Código de retiro bidireccional** — cada estadía genera un único código que el huésped usa tanto para **retirar** como para **devolver** la llave. Se elimina el código de devolución separado.
3. **Pro** mantiene sus códigos de acceso adicionales (limpieza, mantenimiento, etc.), pero el flujo huésped usa el mismo esquema de los puntos 1 y 2.

## Estados de los movimientos

Secuencia única para todos los planes:

```text
esperando depósito  --(código de depósito, anfitrión)-->  depositada
depositada          --(código de retiro, huésped)-->      retirada
retirada            --(mismo código de retiro)-->         devuelta
devuelta            --(código de depósito otra vez)-->    depositada (nueva vuelta)
```

- Cada transición registra su marca de tiempo, queda en el historial de accesos y dispara la notificación al anfitrión.
- La posición del casillero se libera cuando la estadía queda devuelta.
- Un uso: la estadía sigue venciendo a las 48 h si no se completa; Mensual y Pro pueden repetir el ciclo con el mismo código de depósito.

## Pase de abordar

- Un solo código grande y protagónico: el **código de retiro/devolución**, con la aclaración de que sirve para las dos cosas.
- El código de depósito del anfitrión **no** se muestra al huésped.
- Sin mapa incrustado: solo el enlace "Ver en el mapa" junto a la dirección del punto.
- Se mantienen los 3 pasos actuales, el horario de retiro condicional y los tres idiomas (ES/EN/PT).

## Detalle técnico

- Migración: asignar `deposit_code` único a las llaves Un uso existentes; dejar de usar `return_code` (se completa con el mismo valor que `pickup_code` para compatibilidad).
- `createKey`: generar siempre el código fijo de depósito.
- `createExchange`: usar `keys.deposit_code` como código de depósito en todos los planes y un único código bidireccional en `pickup_code`.
- `validateCode`: resolver primero por código fijo de llave (depósito) y luego por código de estadía, aplicando la máquina de estados de arriba, incluido el reciclado depositada → retirada → devuelta → depositada.
- Paneles (anfitrión, punto, admin): mostrar el código de depósito fijo en la ficha de la llave y un solo código por estadía, con etiquetas de estado actualizadas.
