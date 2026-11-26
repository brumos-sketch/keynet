ALTER TABLE public.key_exchanges ADD COLUMN reusable boolean NOT NULL DEFAULT false, ADD COLUMN guest_name text, ADD COLUMN pickup_until text;

CREATE OR REPLACE FUNCTION public.validate_monthly_code(p_kiosk_id uuid, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k public.keys%ROWTYPE;
  e public.key_exchanges%ROWTYPE;
  stored public.key_exchanges%ROWTYPE;
  capacity integer;
  pos integer;
  new_code text;
  new_ref text;
  local_now timestamp := timezone('America/Argentina/Buenos_Aires', now());
  result_action text;
BEGIN
  SELECT * INTO k FROM public.keys
  WHERE kiosk_id=p_kiosk_id AND subscription_type='monthly'
    AND (replace(deposit_code,'-','')=p_code OR id IN (
      SELECT key_id FROM public.key_exchanges WHERE kiosk_id=p_kiosk_id
      AND (replace(pickup_code,'-','')=p_code OR replace(return_code,'-','')=p_code OR replace(deposit_code,'-','')=p_code)))
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT positions INTO capacity FROM public.kiosks WHERE id=p_kiosk_id FOR UPDATE;
  SELECT * INTO k FROM public.keys WHERE id=k.id FOR UPDATE;
  IF k.locked THEN RAISE EXCEPTION 'La llave está bloqueada'; END IF;
  SELECT * INTO stored FROM public.key_exchanges WHERE key_id=k.id AND status IN ('deposited','completed') AND locker_position>0 ORDER BY created_at DESC LIMIT 1;
  IF replace(k.deposit_code,'-','')=p_code THEN
    IF stored.id IS NOT NULL THEN RAISE EXCEPTION 'La llave ya se encuentra depositada en el locker (casillero %)', stored.locker_position; END IF;
    SELECT * INTO e FROM public.key_exchanges WHERE key_id=k.id AND status IN ('created','waiting_deposit','deposited','picked_up') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF e.status='picked_up' THEN RAISE EXCEPTION 'La llave está en poder del huésped'; END IF;
    IF e.id IS NULL THEN RAISE EXCEPTION 'No hay una estadía esperando depósito para esta llave'; END IF;
    SELECT n INTO pos FROM generate_series(1,capacity) n WHERE NOT EXISTS (SELECT 1 FROM public.key_exchanges WHERE kiosk_id=p_kiosk_id AND status IN ('deposited','completed') AND locker_position=n) ORDER BY n LIMIT 1;
    IF pos IS NULL THEN RAISE EXCEPTION 'No hay posiciones libres'; END IF;
    UPDATE public.key_exchanges SET status='deposited', deposited_at=now(), locker_position=pos WHERE id=e.id;
    result_action := 'deposited';
  ELSE
    SELECT * INTO e FROM public.key_exchanges WHERE key_id=k.id AND (replace(pickup_code,'-','')=p_code OR replace(return_code,'-','')=p_code) ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF e.id IS NULL THEN RAISE EXCEPTION 'Código no encontrado o no válido'; END IF;
    IF e.status='deposited' THEN
      IF e.check_in IS NOT NULL AND local_now::date<e.check_in THEN RAISE EXCEPTION 'El código aún no es válido'; END IF;
      IF e.check_out IS NOT NULL AND local_now::date>e.check_out THEN RAISE EXCEPTION 'El código expiró'; END IF;
      IF nullif(e.pickup_time,'') IS NOT NULL AND local_now::time<e.pickup_time::time THEN RAISE EXCEPTION 'El código aún no es válido en este horario'; END IF;
      IF nullif(e.pickup_until,'') IS NOT NULL AND local_now::time>e.pickup_until::time THEN RAISE EXCEPTION 'El código ya no es válido en este horario'; END IF;
      pos:=e.locker_position;
      IF pos<=0 THEN RAISE EXCEPTION 'No hay llave depositada para retirar'; END IF;
      UPDATE public.key_exchanges SET status='picked_up', picked_up_at=now(), locker_position=0 WHERE id=e.id;
      result_action:='picked_up';
    ELSIF e.status='picked_up' THEN
      SELECT n INTO pos FROM generate_series(1,capacity) n WHERE NOT EXISTS (SELECT 1 FROM public.key_exchanges WHERE kiosk_id=p_kiosk_id AND status IN ('deposited','completed') AND locker_position=n) ORDER BY n LIMIT 1;
      IF pos IS NULL THEN RAISE EXCEPTION 'No hay posiciones libres'; END IF;
      IF e.reusable THEN
        UPDATE public.key_exchanges SET status='deposited', returned_at=now(), locker_position=pos WHERE id=e.id;
      ELSE
        UPDATE public.key_exchanges SET status='completed', returned_at=now(), locker_position=0 WHERE id=e.id;
        LOOP
          new_code:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%1000000)::text,6,'0');
          EXIT WHEN NOT EXISTS (SELECT 1 FROM public.key_exchanges WHERE kiosk_id=p_kiosk_id AND (replace(pickup_code,'-','')=new_code OR replace(return_code,'-','')=new_code OR replace(deposit_code,'-','')=new_code))
            AND NOT EXISTS (SELECT 1 FROM public.keys WHERE kiosk_id=p_kiosk_id AND replace(deposit_code,'-','')=new_code)
            AND NOT EXISTS (SELECT 1 FROM public.access_codes a JOIN public.keys ak ON ak.id=a.key_id WHERE ak.kiosk_id=p_kiosk_id AND replace(a.code,'-','')=new_code);
        END LOOP;
        new_ref:='PS-'||upper(replace(gen_random_uuid()::text,'-',''));
        INSERT INTO public.key_exchanges (key_id,kiosk_id,booking_ref,locker_position,deposit_code,pickup_code,return_code,status,reusable)
          VALUES(k.id,p_kiosk_id,new_ref,pos,k.deposit_code,new_code,new_code,'deposited',false);
      END IF;
      result_action:='completed';
    ELSIF e.status IN ('created','waiting_deposit') THEN
      RAISE EXCEPTION 'La llave todavía no fue depositada en el punto';
    ELSE
      RAISE EXCEPTION 'Este código ya no está vigente';
    END IF;
  END IF;
  INSERT INTO public.access_log(key_id,action,role,person_name) VALUES(k.id,result_action,'guest',e.guest_name);
  RETURN jsonb_build_object('action',result_action,'position',pos,'bookingRef',e.booking_ref,'keyId',k.id);
END $$;
REVOKE ALL ON FUNCTION public.validate_monthly_code(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_monthly_code(uuid,text) TO service_role;