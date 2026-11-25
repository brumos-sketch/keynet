ALTER TABLE public.locker_enrollments ADD COLUMN device_type text NOT NULL DEFAULT 'locker' CHECK (device_type IN ('locker', 'point'));
CREATE OR REPLACE FUNCTION public.claim_locker_enrollment(_kiosk_id uuid, _claim_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.locker_enrollments; k public.kiosks;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo el administrador puede vincular dispositivos'; END IF;
 SELECT * INTO k FROM public.kiosks WHERE id = _kiosk_id FOR UPDATE;
 IF k.id IS NULL THEN RAISE EXCEPTION 'Punto no encontrado'; END IF;
 IF NOT public.locker_enrollment_limit('claim:' || auth.uid()::text, 10, 600) THEN RAISE EXCEPTION 'Demasiados intentos. Esperá diez minutos'; END IF;
 SELECT * INTO e FROM public.locker_enrollments WHERE claim_code = _claim_code FOR UPDATE;
 IF e.id IS NULL OR e.expires_at <= now() OR e.kiosk_id IS NOT NULL THEN RETURN NULL; END IF;
 IF e.device_type <> k.point_type THEN RAISE EXCEPTION 'El código no corresponde al tipo de punto'; END IF;
 UPDATE public.locker_enrollments SET expires_at = now() WHERE kiosk_id = _kiosk_id AND id <> e.id AND expires_at > now();
 UPDATE public.locker_enrollments SET kiosk_id = _kiosk_id, approved_by = auth.uid(), approved_at = now() WHERE id = e.id;
 RETURN e.id;
END $$;
REVOKE ALL ON FUNCTION public.claim_locker_enrollment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_locker_enrollment(uuid, text) TO authenticated;
CREATE OR REPLACE FUNCTION public.deliver_locker_enrollment(_id uuid, _secret_hash text, _key_hash text, _prefix text, _ack boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.locker_enrollments; k public.kiosks; target uuid;
BEGIN
 SELECT kiosk_id INTO target FROM public.locker_enrollments WHERE id = _id AND device_secret_hash = _secret_hash;
 IF target IS NOT NULL THEN SELECT * INTO k FROM public.kiosks WHERE id = target FOR UPDATE; END IF;
 SELECT * INTO e FROM public.locker_enrollments WHERE id = _id AND device_secret_hash = _secret_hash FOR UPDATE;
 IF e.id IS NULL THEN RETURN 'invalid'; END IF;
 IF e.expires_at <= now() THEN RETURN 'expired'; END IF;
 IF e.acknowledged_at IS NOT NULL THEN RETURN 'acknowledged'; END IF;
 IF e.kiosk_id IS NULL THEN RETURN 'pending'; END IF;
 IF k.id IS NULL OR k.point_type <> e.device_type THEN RETURN 'revoked'; END IF;
 IF e.issued_key_hash IS NOT NULL AND (k.api_key_hash IS DISTINCT FROM e.issued_key_hash OR e.issued_key_hash <> _key_hash) THEN RETURN 'revoked'; END IF;
 IF _ack THEN
  IF e.issued_key_hash IS NULL THEN RETURN 'pending'; END IF;
  UPDATE public.locker_enrollments SET acknowledged_at = now() WHERE id = e.id;
  RETURN 'acknowledged';
 END IF;
 IF e.issued_key_hash IS NULL THEN
  UPDATE public.kiosks SET api_key_hash = _key_hash, api_key_prefix = _prefix WHERE id = e.kiosk_id;
  UPDATE public.locker_enrollments SET issued_key_hash = _key_hash WHERE id = e.id;
 END IF;
 RETURN 'ready';
END $$;
REVOKE ALL ON FUNCTION public.deliver_locker_enrollment(uuid, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deliver_locker_enrollment(uuid, text, text, text, boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.revoke_point_device(_kiosk_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo el administrador puede desvincular dispositivos'; END IF;
 PERFORM id FROM public.kiosks WHERE id = _kiosk_id FOR UPDATE;
 UPDATE public.kiosks SET api_key_hash = NULL, api_key_prefix = NULL, last_seen_at = NULL WHERE id = _kiosk_id;
 UPDATE public.locker_enrollments SET expires_at = now() WHERE kiosk_id = _kiosk_id AND expires_at > now();
END $$;
REVOKE ALL ON FUNCTION public.revoke_point_device(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_point_device(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.invalidate_changed_point_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.point_type IS DISTINCT FROM OLD.point_type THEN
  NEW.api_key_hash := NULL; NEW.api_key_prefix := NULL; NEW.last_seen_at := NULL;
  UPDATE public.locker_enrollments SET expires_at = now() WHERE kiosk_id = OLD.id AND expires_at > now();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER invalidate_changed_point_type BEFORE UPDATE OF point_type ON public.kiosks FOR EACH ROW EXECUTE FUNCTION public.invalidate_changed_point_type();