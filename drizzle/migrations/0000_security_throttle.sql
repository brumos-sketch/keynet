CREATE TABLE public.security_throttle (
  key text PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_throttle TO service_role;
ALTER TABLE public.security_throttle ENABLE ROW LEVEL SECURITY;