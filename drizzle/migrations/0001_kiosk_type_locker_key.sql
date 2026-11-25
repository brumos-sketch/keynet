ALTER TABLE public.kiosks ADD COLUMN IF NOT EXISTS point_type text NOT NULL DEFAULT 'point';
ALTER TABLE public.kiosks ADD CONSTRAINT kiosks_point_type_check CHECK (point_type IN ('point','locker'));
ALTER TABLE public.kiosks ADD COLUMN IF NOT EXISTS api_key_hash text;
ALTER TABLE public.kiosks ADD COLUMN IF NOT EXISTS api_key_prefix text;
CREATE UNIQUE INDEX IF NOT EXISTS kiosks_api_key_hash_key ON public.kiosks (api_key_hash) WHERE api_key_hash IS NOT NULL;