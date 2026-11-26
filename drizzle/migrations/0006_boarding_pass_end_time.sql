CREATE OR REPLACE FUNCTION public.boarding_pass_validity(_ref text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('pickup_until',v.until_time) FROM (
 SELECT e.pickup_until AS until_time FROM public.key_exchanges e WHERE upper(replace(e.booking_ref,'-',''))=upper(replace(trim(_ref),'-',''))
 UNION ALL
 SELECT CASE WHEN ac.has_validity THEN ac.time_to::text ELSE NULL END FROM public.access_codes ac WHERE ac.id::text=trim(_ref)
 ) v LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.boarding_pass_validity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.boarding_pass_validity(text) TO anon,authenticated,service_role;