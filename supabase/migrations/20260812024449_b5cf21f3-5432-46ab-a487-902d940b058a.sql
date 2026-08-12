-- Índices únicos para evitar colisiones de códigos
CREATE UNIQUE INDEX IF NOT EXISTS idx_keys_deposit_code ON public.keys(deposit_code) WHERE deposit_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_key_exchanges_booking_ref ON public.key_exchanges(booking_ref);
CREATE UNIQUE INDEX IF NOT EXISTS idx_key_exchanges_deposit_code ON public.key_exchanges(deposit_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_key_exchanges_pickup_code ON public.key_exchanges(pickup_code) WHERE pickup_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_key_exchanges_return_code ON public.key_exchanges(return_code) WHERE return_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kiosks_access_code ON public.kiosks(access_code);

-- Función para marcar vencidos los intercambios de un solo uso después de 48h
CREATE OR REPLACE FUNCTION public.expire_one_use_exchanges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.key_exchanges
  SET status = 'expired'
  WHERE status IN ('waiting_deposit', 'deposited', 'picked_up', 'created')
    AND EXISTS (
      SELECT 1 FROM public.keys k
      WHERE k.id = key_exchanges.key_id
        AND k.subscription_type = 'one_use'
    )
    AND created_at < (now() - interval '48 hours');
END;
$$;
