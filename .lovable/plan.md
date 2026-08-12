# Por qué faltan las fichas y cómo evitarlo

## Qué verifiqué

- La función automática de alta (`handle_new_user`, que crea perfil + rol + ficha de anfitrión) **existe**, pero **no hay ningún disparador conectado a la tabla de usuarios de autenticación**: hoy no se ejecuta nunca.
- Juan tiene perfil y rol, pero no tenía ficha de anfitrión (ya la creé). No pude confirmar qué creó su perfil, así que el diagnóstico exacto de ese caso queda como "a verificar".
- El alta desde el panel de administración sí crea perfil, rol y ficha por código, así que esos usuarios están bien.
- El registro público (formulario de login) sólo llama al alta de autenticación y **depende de ese disparador inexistente**.

Conclusión: sí, con cada usuario que se registre por el formulario público va a volver a pasar, hasta que lo arreglemos.

## Plan

1. **Auto-reparación al iniciar sesión**: una función de servidor que, al entrar cualquier usuario, verifique que tenga perfil, rol y —si es anfitrión o asociado— su ficha correspondiente, y la cree si falta. Esto cubre tanto registros nuevos como usuarios viejos incompletos.
2. **Reparación al asignar rol**: al cambiar el rol de un usuario desde el panel, garantizar que la ficha del nuevo rol exista (hoy ya lo hace en la mayoría de los caminos; lo dejamos explícito).
3. **Relleno de datos**: completar cualquier perfil/ficha faltante que quede en la base.
4. **Mensaje claro**: si aun así falta el perfil de anfitrión, el alta de llave debe indicar el motivo en vez de sólo "No encontramos tu perfil de anfitrión".

## Detalles técnicos

- Nueva función `ensureUserBootstrap` en `src/lib/account.functions.ts`, con `requireSupabaseAuth`, que hace upsert en `profiles`, `user_roles` (rol por defecto `host`) y en `hosts`/`associates` según el rol, usando el cliente administrador cargado dentro del handler.
- Se invoca una sola vez desde el hook de sesión (`useAuth` / `__root`) cuando hay usuario autenticado, y antes de abrir el asistente de alta de llave.
- No se tocan esquemas gestionados (`auth`), por lo que no se recrea el disparador; la reparación vive en la capa de aplicación.
