CREATE OR REPLACE FUNCTION public.search_kiosks_public()
 RETURNS TABLE(id uuid, name text, address text, category text, custom_category text, positions integer, is_24h boolean, schedule jsonb, lat double precision, lng double precision, free_positions integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT k.id, k.name, k.address, k.category, k.custom_category, k.positions,
         k.is_24h, k.schedule, k.lat, k.lng,
         GREATEST(
           k.positions - (
             SELECT count(*) FROM public.key_exchanges e
             WHERE e.kiosk_id = k.id
               AND e.status IN ('deposited','completed')
               AND e.locker_position > 0
           ),
           0
         )::integer
  FROM public.kiosks k
  ORDER BY k.name;
$function$;