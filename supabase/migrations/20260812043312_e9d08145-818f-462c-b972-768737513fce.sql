DROP INDEX IF EXISTS public.idx_key_exchanges_deposit_code;
DROP INDEX IF EXISTS public.idx_key_exchanges_return_code;
CREATE INDEX IF NOT EXISTS idx_key_exchanges_deposit_code ON public.key_exchanges (deposit_code);
CREATE INDEX IF NOT EXISTS idx_key_exchanges_return_code ON public.key_exchanges (return_code);