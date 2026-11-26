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
  new_ref:='PS-'||upper(replace(gen_random_uuid()::text,'-',''));
  INSERT INTO public.key_exchanges(key_id,kiosk_id,booking_ref,locker_position,deposit_code,pickup_code,return_code,status,check_in,check_out,pickup_time,guest_name)
    VALUES(k.id,k.kiosk_id,new_ref,pos,k.deposit_code,new_code,new_code,CASE WHEN pos>0 THEN 'deposited' ELSE 'waiting_deposit' END,p_check_in,p_check_out,p_pickup_time,p_guest_name) RETURNING id INTO new_id;
  INSERT INTO public.access_log(key_id,action,role,person_name) VALUES(k.id,'exchange_created','host',p_guest_name);
  RETURN jsonb_build_object('exchangeId',new_id,'bookingRef',new_ref);
END $$;
REVOKE ALL ON FUNCTION public.start_monthly_stay(uuid,date,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_monthly_stay(uuid,date,date,text,text) TO authenticated;