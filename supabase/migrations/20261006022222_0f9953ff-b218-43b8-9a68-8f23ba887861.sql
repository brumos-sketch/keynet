CREATE TABLE public.sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  plan text NOT NULL DEFAULT 'pro',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sales_leads TO authenticated;
GRANT ALL ON public.sales_leads TO service_role;
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_leads_insert_own ON public.sales_leads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY sales_leads_admin_all ON public.sales_leads FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());