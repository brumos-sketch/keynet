ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true;