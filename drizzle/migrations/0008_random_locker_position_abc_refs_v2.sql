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
    SELECT n INTO pos FROM generate_series(1,capacity) n WHERE NOT EXISTS (SELECT 1 FROM public.key_exchanges WHERE kiosk_id=p_kiosk_id AND status IN ('deposited','completed') AND locker_position=n) ORDER BY random() LIMIT 1;
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
      SELECT n INTO pos FROM generate_series(1,capacity) n WHERE NOT EXISTS (SELECT 1 FROM public.key_exchanges WHERE kiosk_id=p_kiosk_id AND status IN ('deposited','completed') AND locker_position=n) ORDER BY random() LIMIT 1;
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
        LOOP
          new_ref:=(SELECT string_agg(chr(65+floor(random()*26)::int),'') FROM generate_series(1,3))||'-'||lpad(floor(random()*1000)::int::text,3,'0');
          EXIT WHEN NOT EXISTS(SELECT 1 FROM public.key_exchanges WHERE booking_ref=new_ref);
        END LOOP;
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
CREATE OR REPLACE FUNCTION public.start_monthly_stay(p_key_id uuid, p_check_in date DEFAULT NULL, p_check_out date DEFAULT NULL, p_pickup_time text DEFAULT NULL, p_guest_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k public.keys%ROWTYPE; stored public.key_exchanges%ROWTYPE; new_id uuid; new_code text; new_ref text; pos integer:=0;
BEGIN
  SELECT * INTO k FROM public.keys WHERE id=p_key_id;
  IF NOT FOUND OR k.subscription_type<>'monthly' THEN RAISE EXCEPTION 'Llave mensual no encontrada'; END IF;
  IF NOT public.is_admin() AND (public.my_host_id() IS NULL OR public.my_host_id()<>k.host_id) THEN RAISE EXCEPTION 'No tenés permiso para esta llave'; END IF;
  PERFORM id FROM public.kiosks WHERE id=k.kiosk_id FOR UPDATE;
  SELECT * INTO k FROM public.keys WHERE id=p_key_id FOR UPDATE;
  IF k.locked THEN RAISE EXCEPTION 'La llave está bloqueada'; END IF;
  IF EXISTS(SELECT 1 FROM public.key_exchanges WHERE key_id=k.id AND status IN ('created','waiting_deposit','deposited','picked_up')) THEN RAISE EXCEPTION 'Ya hay una estadía activa para esta llave; editá su código'; END IF;
  IF p_check_in IS NOT NULL AND p_check_out IS NOT NULL AND p_check_out<p_check_in THEN RAISE EXCEPTION 'Fechas inválidas'; END IF;
  IF p_pickup_time IS NOT NULL AND p_pickup_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Horario inválido'; END IF;
  SELECT * INTO stored FROM public.key_exchanges WHERE key_id=k.id AND status='completed' AND locker_position>0 ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF stored.id IS NOT NULL THEN pos:=stored.locker_position; UPDATE public.key_exchanges SET locker_position=0 WHERE id=stored.id; END IF;
  LOOP
    new_code:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%1000000)::text,6,'0');
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.key_exchanges WHERE kiosk_id=k.kiosk_id AND (replace(pickup_code,'-','')=new_code OR replace(return_code,'-','')=new_code OR replace(deposit_code,'-','')=new_code)) AND NOT EXISTS(SELECT 1 FROM public.keys WHERE kiosk_id=k.kiosk_id AND replace(deposit_code,'-','')=new_code) AND NOT EXISTS(SELECT 1 FROM public.access_codes a JOIN public.keys ak ON a.key_id=ak.id WHERE ak.kiosk_id=k.kiosk_id AND replace(a.code,'-','')=new_code);
  END LOOP;
  LOOP
    new_ref:=(SELECT string_agg(chr(65+floor(random()*26)::int),'') FROM generate_series(1,3))||'-'||lpad(floor(random()*1000)::int::text,3,'0');
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.key_exchanges WHERE booking_ref=new_ref);
  END LOOP;
  INSERT INTO public.key_exchanges(key_id,kiosk_id,booking_ref,locker_position,deposit_code,pickup_code,return_code,status,check_in,check_out,pickup_time,guest_name)
    VALUES(k.id,k.kiosk_id,new_ref,pos,k.deposit_code,new_code,new_code,CASE WHEN pos>0 THEN 'deposited' ELSE 'waiting_deposit' END,p_check_in,p_check_out,p_pickup_time,p_guest_name) RETURNING id INTO new_id;
  INSERT INTO public.access_log(key_id,action,role,person_name) VALUES(k.id,'exchange_created','host',p_guest_name);
  RETURN jsonb_build_object('exchangeId',new_id,'bookingRef',new_ref);
END $$;
REVOKE ALL ON FUNCTION public.start_monthly_stay(uuid,date,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_monthly_stay(uuid,date,date,text,text) TO authenticated;