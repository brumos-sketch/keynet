CREATE TABLE public.locker_enrollments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 claim_code text NOT NULL UNIQUE,
 device_secret_hash text NOT NULL,
 kiosk_id uuid REFERENCES public.kiosks(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
 created_at timestamptz NOT NULL DEFAULT now(),
 approved_by uuid,
 approved_at timestamptz,
 issued_key_hash text,
 acknowledged_at timestamptz
);
GRANT ALL ON public.locker_enrollments TO service_role;
ALTER TABLE public.locker_enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX locker_enrollments_kiosk_idx ON public.locker_enrollments(kiosk_id);

CREATE OR REPLACE FUNCTION public.locker_enrollment_limit(_key text, _limit integer, _seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
 INSERT INTO public.security_throttle AS t (key, failures, locked_until, updated_at)
 VALUES (_key, 1, now() + make_interval(secs => _seconds), now())
 ON CONFLICT (key) DO UPDATE SET
 failures = CASE WHEN t.locked_until <= now() THEN 1 ELSE t.failures + 1 END,
 locked_until = CASE WHEN t.locked_until <= now() THEN now() + make_interval(secs => _seconds) ELSE t.locked_until END,
 updated_at = now()
 RETURNING failures INTO n;
 RETURN n <= _limit;
END $$;
REVOKE ALL ON FUNCTION public.locker_enrollment_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.locker_enrollment_limit(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_locker_enrollment(_kiosk_id uuid, _claim_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.locker_enrollments; k public.kiosks;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo el administrador puede vincular dispositivos'; END IF;
 SELECT * INTO k FROM public.kiosks WHERE id = _kiosk_id FOR UPDATE;
 IF k.id IS NULL OR k.point_type <> 'locker' THEN RAISE EXCEPTION 'Seleccioná un locker automático'; END IF;
 SELECT * INTO e FROM public.locker_enrollments WHERE claim_code = _claim_code FOR UPDATE;
 IF e.id IS NULL OR e.expires_at <= now() OR e.kiosk_id IS NOT NULL THEN RAISE EXCEPTION 'Código inválido, vencido o ya vinculado'; END IF;
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
 IF k.id IS NULL OR k.point_type <> 'locker' THEN RETURN 'revoked'; END IF;
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