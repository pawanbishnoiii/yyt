CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TYPE public.app_role AS ENUM ('admin','manager','staff');

CREATE TABLE public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, city text, address text, phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL, kind text NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text, email text,
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
CREATE TABLE public.business_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text NOT NULL DEFAULT 'NeonStay Hotels',
  gst_number text, address text, upi_id text,
  cgst_rate numeric NOT NULL DEFAULT 6, sgst_rate numeric NOT NULL DEFAULT 6,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.business_settings (id) VALUES (1);

CREATE TABLE public.onboarding_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE, label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options text[], required boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true, sort int NOT NULL DEFAULT 0
);
INSERT INTO public.onboarding_fields (key,label,field_type,required,sort,options) VALUES
('email','Email','email',false,1,NULL),
('nationality','Nationality','text',false,2,NULL),
('purpose','Purpose of visit','select',false,3,ARRAY['Business','Leisure','Family','Other']),
('vehicle','Vehicle number','text',false,4,NULL);

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  number text NOT NULL, room_type text NOT NULL DEFAULT 'Standard',
  price numeric NOT NULL DEFAULT 1000,
  status text NOT NULL DEFAULT 'available',
  barcode text NOT NULL UNIQUE DEFAULT ('RM' || upper(substr(md5(random()::text),1,10))),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, number)
);
CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_code text NOT NULL UNIQUE DEFAULT ('GST' || upper(substr(md5(random()::text),1,8))),
  first_name text NOT NULL, last_name text NOT NULL,
  age int, gender text, mobile text NOT NULL UNIQUE, aadhaar text UNIQUE,
  address text, interests text[] NOT NULL DEFAULT '{}',
  extra jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, code text NOT NULL UNIQUE,
  discount_pct numeric NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE DEFAULT ('BK' || upper(substr(md5(random()::text),1,8))),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  nights int NOT NULL DEFAULT 1, rate numeric NOT NULL,
  adults int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'checked_in',
  check_in timestamptz NOT NULL DEFAULT now(), check_out timestamptz,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no text NOT NULL UNIQUE DEFAULT ('INV' || to_char(now(),'YYMMDD') || upper(substr(md5(random()::text),1,5))),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  subtotal numeric NOT NULL, extras numeric NOT NULL DEFAULT 0, discount numeric NOT NULL DEFAULT 0,
  cgst_rate numeric NOT NULL, sgst_rate numeric NOT NULL,
  cgst numeric NOT NULL, sgst numeric NOT NULL, total numeric NOT NULL,
  payment_mode text NOT NULL DEFAULT 'cash', paid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.service_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  staff_id uuid, kind text NOT NULL, note text, amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL, row_counts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotels, public.departments, public.profiles, public.user_roles, public.business_settings, public.onboarding_fields, public.rooms, public.guests, public.offers, public.bookings, public.bills, public.service_logs TO authenticated;
GRANT SELECT ON public.backups TO authenticated;
GRANT ALL ON public.hotels, public.departments, public.profiles, public.user_roles, public.business_settings, public.onboarding_fields, public.rooms, public.guests, public.offers, public.bookings, public.bills, public.service_logs, public.backups TO service_role;

-- helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION public.my_hotel()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hotel_id FROM public.profiles WHERE id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) $$;
CREATE OR REPLACE FUNCTION public.can_hotel(_hotel uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR _hotel = public.my_hotel() $$;
CREATE OR REPLACE FUNCTION public.is_mgr(_hotel uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'manager') AND _hotel = public.my_hotel()) $$;

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotels read" ON public.hotels FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "hotels admin" ON public.hotels FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "dept read" ON public.departments FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "dept mgr" ON public.departments FOR ALL TO authenticated USING (public.is_mgr(hotel_id)) WITH CHECK (public.is_mgr(hotel_id));

CREATE POLICY "profile own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR (hotel_id IS NOT NULL AND public.is_mgr(hotel_id)));
CREATE POLICY "profile admin" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profile self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND hotel_id IS NOT DISTINCT FROM public.my_hotel());

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "roles admin" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "settings read" ON public.business_settings FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "settings admin" ON public.business_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "fields read" ON public.onboarding_fields FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "fields admin" ON public.onboarding_fields FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "rooms read" ON public.rooms FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "rooms mgr" ON public.rooms FOR ALL TO authenticated USING (public.is_mgr(hotel_id)) WITH CHECK (public.is_mgr(hotel_id));
CREATE POLICY "rooms staff status" ON public.rooms FOR UPDATE TO authenticated USING (hotel_id = public.my_hotel()) WITH CHECK (hotel_id = public.my_hotel());

CREATE POLICY "guests read" ON public.guests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "guests write" ON public.guests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "guests update" ON public.guests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) WITH CHECK (true);
CREATE POLICY "guests delete" ON public.guests FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "offers read" ON public.offers FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "offers admin" ON public.offers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "bookings read" ON public.bookings FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "bookings mgr" ON public.bookings FOR ALL TO authenticated USING (public.is_mgr(hotel_id)) WITH CHECK (public.is_mgr(hotel_id));

CREATE POLICY "bills read" ON public.bills FOR SELECT TO authenticated USING (public.is_mgr(hotel_id));
CREATE POLICY "bills mgr" ON public.bills FOR ALL TO authenticated USING (public.is_mgr(hotel_id)) WITH CHECK (public.is_mgr(hotel_id));

CREATE POLICY "svc read" ON public.service_logs FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "svc insert" ON public.service_logs FOR INSERT TO authenticated WITH CHECK (public.can_hotel(hotel_id) AND staff_id = auth.uid());

CREATE POLICY "backups admin" ON public.backups FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- new user: profile; first ever user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- guest lookup that hides other hotels' history
CREATE OR REPLACE FUNCTION public.guest_visits(_guest uuid)
RETURNS TABLE(booking_code text, hotel_name text, room_number text, check_in timestamptz, check_out timestamptz, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.booking_code, h.name, r.number, b.check_in, b.check_out, b.status
  FROM public.bookings b JOIN public.hotels h ON h.id=b.hotel_id JOIN public.rooms r ON r.id=b.room_id
  WHERE b.guest_id=_guest AND public.can_hotel(b.hotel_id)
  ORDER BY b.check_in DESC $$;

-- backup
CREATE OR REPLACE FUNCTION public.run_backup()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bid uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.backups (payload, row_counts) VALUES (
    jsonb_build_object(
      'hotels',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.hotels t),
      'rooms',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.rooms t),
      'guests',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.guests t),
      'bookings',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.bookings t),
      'bills',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.bills t),
      'offers',(SELECT coalesce(jsonb_agg(t),'[]') FROM public.offers t),
      'settings',(SELECT to_jsonb(t) FROM public.business_settings t LIMIT 1)),
    jsonb_build_object(
      'hotels',(SELECT count(*) FROM public.hotels),'rooms',(SELECT count(*) FROM public.rooms),
      'guests',(SELECT count(*) FROM public.guests),'bookings',(SELECT count(*) FROM public.bookings),
      'bills',(SELECT count(*) FROM public.bills))
  ) RETURNING id INTO bid;
  DELETE FROM public.backups WHERE created_at < now() - interval '30 days';
  RETURN bid;
END $$;
REVOKE EXECUTE ON FUNCTION public.run_backup() FROM anon;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms, public.bookings, public.service_logs;