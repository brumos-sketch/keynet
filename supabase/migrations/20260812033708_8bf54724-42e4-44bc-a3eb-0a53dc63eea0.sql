ALTER TABLE public.kiosks
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

UPDATE public.kiosks SET lat = -34.5955, lng = -58.4074 WHERE lat IS NULL AND address ILIKE '%Palermo%';
UPDATE public.kiosks SET lat = -34.5889, lng = -58.3927 WHERE lat IS NULL AND address ILIKE '%Recoleta%';

CREATE OR REPLACE FUNCTION public.search_kiosks_public()
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  category text,
  custom_category text,
  positions integer,
  is_24h boolean,
  schedule jsonb,
  lat double precision,
  lng double precision,
  free_positions integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT k.id, k.name, k.address, k.category, k.custom_category, k.positions,
         k.is_24h, k.schedule, k.lat, k.lng,
         GREATEST(
           k.positions - (
             SELECT count(*) FROM public.key_exchanges e
             WHERE e.kiosk_id = k.id
               AND e.status IN ('created','waiting_deposit','deposited','picked_up')
           ),
           0
         )::integer
  FROM public.kiosks k
  ORDER BY k.name;
$$;

REVOKE ALL ON FUNCTION public.search_kiosks_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_kiosks_public() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.boarding_pass(_ref text)
RETURNS TABLE (
  booking_ref text,
  status text,
  locker_position integer,
  deposit_code text,
  pickup_code text,
  pickup_time text,
  check_in date,
  check_out date,
  key_name text,
  property_name text,
  kiosk_name text,
  kiosk_address text,
  kiosk_is_24h boolean,
  kiosk_schedule jsonb,
  kiosk_lat double precision,
  kiosk_lng double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.booking_ref, e.status, e.locker_position, e.deposit_code, e.pickup_code,
         e.pickup_time, e.check_in, e.check_out,
         k.name, k.property_name,
         ki.name, ki.address, ki.is_24h, ki.schedule, ki.lat, ki.lng
  FROM public.key_exchanges e
  LEFT JOIN public.keys k ON k.id = e.key_id
  LEFT JOIN public.kiosks ki ON ki.id = e.kiosk_id
  WHERE upper(replace(e.booking_ref, '-', '')) = upper(replace(trim(_ref), '-', ''))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.boarding_pass(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.boarding_pass(text) TO anon, authenticated, service_role;