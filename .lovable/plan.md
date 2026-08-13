# Panel del anfitrión: encabezado móvil, nombres únicos y tarjetas plegables

## 1. Encabezado móvil sin superposición

En pantallas chicas los íconos (perfil, campana, Pagos, Salir) quedan encima del logo. Cambios:

- El encabezado pasa a una grilla de dos columnas (`marca | acciones`) con `min-w-0` en la marca y `shrink-0` en los íconos.
- En móvil solo quedan visibles: logo, ícono de perfil (sin el nombre) y campana. "Pagos" y "Salir" se mueven a un menú desplegable (botón de tres rayitas), igual que en el panel de administrador.
- Desde `sm:` en adelante se mantiene el encabezado actual con nombre y botones de texto.

## 2. Nombre de llave único por anfitrión

- Al crear una llave se verifica, del lado del servidor, que el anfitrión no tenga otra llave con el mismo nombre (comparación sin distinguir mayúsculas ni espacios sobrantes).
- Si ya existe, la creación se rechaza con el mensaje "Ya tenés una llave con ese nombre" y el asistente lo muestra en el paso correspondiente sin perder los datos cargados.

## 3. Tarjeta de llave simplificada y plegable

Cada llave pasa a ser una fila compacta:

```text
[ Nombre de la llave · propiedad ]      [ Plan ] [ Estado ]   ˅
```

- Al tocar la fila se despliega hacia abajo el detalle actual: punto, código de depósito, bloque de estadía (referencia, código de retiro, fechas o aviso de "faltan fechas"), botones "Editar estadía", "Nueva estadía", "Ver actividad" y los códigos Pro.
- El indicador es un chevron "˅" que rota al abrirse; el detalle aparece con una transición suave.
- Solo se puede tener una llave abierta a la vez (acordeón); todas arrancan cerradas.
- La lista pasa a una sola columna para que las filas se lean como listado, tanto en móvil como en escritorio.

## Detalles técnicos

- `src/routes/_authenticated/host.tsx`: encabezado responsive con `Sheet` para el menú móvil; reemplazo de la grilla `md:grid-cols-2` por lista con `Collapsible` (shadcn) y estado `openCard`.
- `src/lib/pasallave.functions.ts` (`createKey`): consulta previa a `keys` filtrando por `host_id` y nombre normalizado antes del insert; error claro si hay coincidencia.
- Sin cambios en la base de datos.
