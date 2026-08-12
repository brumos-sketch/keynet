-- ROLES
CREATE TYPE public.app_role AS ENUM ('pending','admin','associate','host','kiosk');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  kiosk_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.my_kiosk_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT kiosk_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ASSOCIATES
CREATE TABLE public.associates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.associates TO authenticated;
GRANT ALL ON public.associates TO service_role;
ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_associate_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.associates WHERE user_id = auth.uid() LIMIT 1;
$$;

-- HOSTS
CREATE TABLE public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hosts TO authenticated;
GRANT ALL ON public.hosts TO service_role;
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_host_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.hosts WHERE user_id = auth.uid() LIMIT 1;
$$;

-- KIOSKS
CREATE TABLE public.kiosks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  positions INTEGER NOT NULL DEFAULT 50,
  category TEXT NOT NULL DEFAULT 'kiosco',
  custom_category TEXT,
  commission_percent INTEGER NOT NULL DEFAULT 20,
  associate_id UUID REFERENCES public.associates(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  access_code TEXT UNIQUE NOT NULL,
  is_24h BOOLEAN NOT NULL DEFAULT false,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosks TO authenticated;
GRANT ALL ON public.kiosks TO service_role;
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_kiosk_fk FOREIGN KEY (kiosk_id) REFERENCES public.kiosks(id) ON DELETE SET NULL;

-- KEYS
CREATE TABLE public.keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.hosts(id) ON DELETE CASCADE,
  kiosk_id UUID REFERENCES public.kiosks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  property_name TEXT,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('one_use','monthly','pro')),
  status TEXT NOT NULL DEFAULT 'active',
  locked BOOLEAN NOT NULL DEFAULT false,
  deposit_code TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.keys TO authenticated;
GRANT ALL ON public.keys TO service_role;
ALTER TABLE public.keys ENABLE ROW LEVEL SECURITY;

-- KEY EXCHANGES
CREATE TABLE public.key_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES public.keys(id) ON DELETE CASCADE,
  kiosk_id UUID REFERENCES public.kiosks(id) ON DELETE SET NULL,
  booking_ref TEXT UNIQUE NOT NULL,
  locker_position INTEGER NOT NULL,
  deposit_code TEXT NOT NULL,
  pickup_code TEXT,
  return_code TEXT,
  pickup_time TEXT,
  status TEXT NOT NULL DEFAULT 'waiting_deposit',
  check_in DATE,
  check_out DATE,
  deposited_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_exchanges TO authenticated;
GRANT ALL ON public.key_exchanges TO service_role;
ALTER TABLE public.key_exchanges ENABLE ROW LEVEL SECURITY;

-- ACCESS CODES
CREATE TABLE public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES public.keys(id) ON DELETE CASCADE,
  exchange_id UUID REFERENCES public.key_exchanges(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  role TEXT,
  person_name TEXT,
  has_validity BOOLEAN NOT NULL DEFAULT false,
  valid_from DATE, valid_to DATE, time_from TIME, time_to TIME,
  reusable BOOLEAN NOT NULL DEFAULT true,
  scope TEXT,
  uses_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- ACCESS LOG
CREATE TABLE public.access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES public.keys(id) ON DELETE CASCADE,
  code_id UUID,
  action TEXT,
  role TEXT,
  person_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_log TO authenticated;
GRANT ALL ON public.access_log TO service_role;
ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.hosts(id) ON DELETE CASCADE,
  type TEXT, message TEXT, booking_ref TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- BILLING
CREATE TABLE public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.hosts(id) ON DELETE CASCADE,
  period TEXT, plan TEXT, keys_count INTEGER,
  exchanges_count INTEGER, amount INTEGER,
  extra_days INTEGER NOT NULL DEFAULT 0,
  extra_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing TO authenticated;
GRANT ALL ON public.billing TO service_role;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;

-- POINT COMMISSIONS
CREATE TABLE public.point_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_id UUID REFERENCES public.kiosks(id) ON DELETE CASCADE,
  period TEXT, plans_revenue INTEGER,
  commission_percent INTEGER, total INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.point_commissions TO authenticated;
GRANT ALL ON public.point_commissions TO service_role;
ALTER TABLE public.point_commissions ENABLE ROW LEVEL SECURITY;

-- PRO AGREEMENTS
CREATE TABLE public.pro_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES public.hosts(id) ON DELETE CASCADE,
  monthly_price INTEGER, keys_included INTEGER,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_agreements TO authenticated;
GRANT ALL ON public.pro_agreements TO service_role;
ALTER TABLE public.pro_agreements ENABLE ROW LEVEL SECURITY;

-- WAITLIST
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL, email TEXT NOT NULL,
  name TEXT, phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "associates_admin_all" ON public.associates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "associates_select_own" ON public.associates FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "hosts_admin_all" ON public.hosts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "hosts_select_own" ON public.hosts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hosts_update_own" ON public.hosts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "kiosks_admin_all" ON public.kiosks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "kiosks_select_associate" ON public.kiosks FOR SELECT TO authenticated USING (associate_id = public.my_associate_id());
CREATE POLICY "kiosks_select_kiosk_user" ON public.kiosks FOR SELECT TO authenticated USING (id = public.my_kiosk_id());
CREATE POLICY "kiosks_select_host" ON public.kiosks FOR SELECT TO authenticated USING (public.my_host_id() IS NOT NULL);

CREATE POLICY "keys_admin_all" ON public.keys FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "keys_host_all" ON public.keys FOR ALL TO authenticated USING (host_id = public.my_host_id()) WITH CHECK (host_id = public.my_host_id());
CREATE POLICY "keys_kiosk_select" ON public.keys FOR SELECT TO authenticated USING (kiosk_id = public.my_kiosk_id());

CREATE POLICY "exchanges_admin_all" ON public.key_exchanges FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "exchanges_host_all" ON public.key_exchanges FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.keys k WHERE k.id = key_id AND k.host_id = public.my_host_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.keys k WHERE k.id = key_id AND k.host_id = public.my_host_id()));
CREATE POLICY "exchanges_kiosk_select" ON public.key_exchanges FOR SELECT TO authenticated USING (kiosk_id = public.my_kiosk_id());
CREATE POLICY "exchanges_kiosk_update" ON public.key_exchanges FOR UPDATE TO authenticated USING (kiosk_id = public.my_kiosk_id()) WITH CHECK (kiosk_id = public.my_kiosk_id());

CREATE POLICY "access_codes_admin_all" ON public.access_codes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "access_codes_host_all" ON public.access_codes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.keys k WHERE k.id = key_id AND k.host_id = public.my_host_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.keys k WHERE k.id = key_id AND k.host_id = public.my_host_id()));
CREATE POLICY "access_codes_kiosk_select" ON public.access_codes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.keys k WHERE k.id = key_id AND k.kiosk_id = public.my_kiosk_id()));

CREATE POLICY "access_log_admin_all" ON public.access_log FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "access_log_host_select" ON public.access_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.keys k WHERE k.id = key_id AND k.host_id = public.my_host_id()));
CREATE POLICY "access_log_kiosk_insert" ON public.access_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.keys k WHERE k.id = key_id AND k.kiosk_id = public.my_kiosk_id()));

CREATE POLICY "notifications_admin_all" ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "notifications_host_all" ON public.notifications FOR ALL TO authenticated USING (host_id = public.my_host_id()) WITH CHECK (host_id = public.my_host_id());

CREATE POLICY "billing_admin_all" ON public.billing FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "billing_host_select" ON public.billing FOR SELECT TO authenticated USING (host_id = public.my_host_id());

CREATE POLICY "commissions_admin_all" ON public.point_commissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "commissions_associate_select" ON public.point_commissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kiosks kk WHERE kk.id = kiosk_id AND kk.associate_id = public.my_associate_id()));

CREATE POLICY "pro_admin_all" ON public.pro_agreements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pro_host_select" ON public.pro_agreements FOR SELECT TO authenticated USING (host_id = public.my_host_id());

CREATE POLICY "waitlist_insert_any" ON public.waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "waitlist_admin_all" ON public.waitlist FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  INSERT INTO public.profiles (id, email, name) VALUES (NEW.id, NEW.email, v_name)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'host')
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.hosts (user_id, name, email) VALUES (NEW.id, v_name, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();