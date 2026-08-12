-- Restringir la función de vencimiento a solo roles de servicio/admin (no se expone a usuarios autenticados directamente)
REVOKE EXECUTE ON FUNCTION public.expire_one_use_exchanges() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_one_use_exchanges() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_one_use_exchanges() FROM anon;

-- Asegurar que el rol de service role pueda ejecutarla
GRANT EXECUTE ON FUNCTION public.expire_one_use_exchanges() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_one_use_exchanges() TO postgres;
