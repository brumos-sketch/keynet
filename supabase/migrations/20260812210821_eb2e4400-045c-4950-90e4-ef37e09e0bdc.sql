CREATE TABLE public.plan_prices (
  plan text PRIMARY KEY,
  amount integer,
  price_label text,
  subtitle text,
  features text[] NOT NULL DEFAULT '{}',
  cta text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_prices TO anon;
GRANT SELECT ON public.plan_prices TO authenticated;
GRANT ALL ON public.plan_prices TO service_role;

ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_prices_public_select ON public.plan_prices
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY plan_prices_admin_all ON public.plan_prices
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_plan_prices_updated_at
BEFORE UPDATE ON public.plan_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plan_prices (plan, amount, price_label, subtitle, features, cta, sort_order) VALUES
('one_use', 7500, '/ intercambio', 'Uso ocasional', ARRAY['1 intercambio de llave','Soporte vía App','Notificaciones en tiempo real'], 'Empezar ahora', 1),
('monthly', 30000, '/ mes', 'Anfitriones recurrentes', ARRAY['Intercambios ilimitados (1 llave)','Soporte prioritario','Historial de accesos completo'], 'Elegir plan', 2),
('pro', NULL, '/ cuenta', 'Gestión profesional', ARRAY['Gestión de múltiples llaves','Dashboard para agencias','API para integración'], 'Contactar ventas', 3),
('extra_day', 1500, '/ día', 'Día extra de guarda', ARRAY[]::text[], NULL, 4);