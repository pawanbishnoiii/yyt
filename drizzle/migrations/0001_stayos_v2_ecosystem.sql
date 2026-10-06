
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS capacity int NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS price_double numeric, ADD COLUMN IF NOT EXISTS price_triple numeric,
  ADD COLUMN IF NOT EXISTS qr_token text NOT NULL DEFAULT encode(gen_random_bytes(9),'hex');
CREATE UNIQUE INDEX IF NOT EXISTS rooms_qr_token_key ON public.rooms(qr_token);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_kind text;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS wifi_name text, ADD COLUMN IF NOT EXISTS wifi_password text;

CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text),1,6)),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  staff_kind text NOT NULL CHECK (staff_kind IN ('cleaning','food','frontdesk','maintenance')),
  created_by uuid, used_by uuid, used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_invites TO authenticated;
GRANT ALL ON public.staff_invites TO service_role;
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites mgr" ON public.staff_invites FOR ALL TO authenticated USING (public.is_mgr(hotel_id)) WITH CHECK (public.is_mgr(hotel_id));

CREATE TABLE public.booking_occupants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id),
  full_name text NOT NULL, aadhaar text, age int, gender text, is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_occupants TO authenticated;
GRANT ALL ON public.booking_occupants TO service_role;
ALTER TABLE public.booking_occupants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "occ read" ON public.booking_occupants FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "occ mgr" ON public.booking_occupants FOR ALL TO authenticated USING (public.is_mgr(hotel_id)) WITH CHECK (public.is_mgr(hotel_id));

CREATE TABLE public.cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual', base_priority int NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pending', note text,
  assigned_to uuid, escalated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, done_at timestamptz);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_tasks TO authenticated;
GRANT ALL ON public.cleaning_tasks TO service_role;
ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct read" ON public.cleaning_tasks FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "ct insert" ON public.cleaning_tasks FOR INSERT TO authenticated WITH CHECK (public.can_hotel(hotel_id));
CREATE POLICY "ct update" ON public.cleaning_tasks FOR UPDATE TO authenticated USING (public.can_hotel(hotel_id)) WITH CHECK (public.can_hotel(hotel_id));
CREATE POLICY "ct delete" ON public.cleaning_tasks FOR DELETE TO authenticated USING (public.is_mgr(hotel_id));

CREATE TABLE public.room_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  staff_id uuid, checks jsonb NOT NULL DEFAULT '{}', ok boolean NOT NULL DEFAULT true, note text,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.room_checks TO authenticated;
GRANT ALL ON public.room_checks TO service_role;
ALTER TABLE public.room_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc read" ON public.room_checks FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "rc insert" ON public.room_checks FOR INSERT TO authenticated WITH CHECK (public.can_hotel(hotel_id) AND staff_id = auth.uid());

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL, category text NOT NULL DEFAULT 'Mains', price numeric NOT NULL DEFAULT 0,
  veg boolean NOT NULL DEFAULT true, available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu read" ON public.menu_items FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "menu update staff" ON public.menu_items FOR UPDATE TO authenticated USING (public.can_hotel(hotel_id)) WITH CHECK (public.can_hotel(hotel_id));
CREATE POLICY "menu mgr" ON public.menu_items FOR ALL TO authenticated USING (public.is_mgr(hotel_id)) WITH CHECK (public.is_mgr(hotel_id));

CREATE TABLE public.food_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL DEFAULT 'FO' || upper(substr(md5(random()::text),1,5)),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_user uuid, items jsonb NOT NULL DEFAULT '[]', total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new', note text, created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz);
GRANT SELECT, INSERT, UPDATE ON public.food_orders TO authenticated;
GRANT ALL ON public.food_orders TO service_role;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fo read" ON public.food_orders FOR SELECT TO authenticated USING (public.can_hotel(hotel_id) OR guest_user = auth.uid());
CREATE POLICY "fo insert" ON public.food_orders FOR INSERT TO authenticated WITH CHECK (public.can_hotel(hotel_id));
CREATE POLICY "fo update" ON public.food_orders FOR UPDATE TO authenticated USING (public.can_hotel(hotel_id)) WITH CHECK (public.can_hotel(hotel_id));

CREATE TABLE public.supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL, qty numeric NOT NULL DEFAULT 0, min_qty numeric NOT NULL DEFAULT 5, unit text NOT NULL DEFAULT 'pcs',
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplies TO authenticated;
GRANT ALL ON public.supplies TO service_role;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup read" ON public.supplies FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "sup update staff" ON public.supplies FOR UPDATE TO authenticated USING (public.can_hotel(hotel_id)) WITH CHECK (public.can_hotel(hotel_id));
CREATE POLICY "sup mgr" ON public.supplies FOR ALL TO authenticated USING (public.is_mgr(hotel_id)) WITH CHECK (public.is_mgr(hotel_id));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_user uuid, rating int NOT NULL CHECK (rating BETWEEN 1 AND 5), comment text,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rev read" ON public.reviews FOR SELECT TO authenticated USING (public.can_hotel(hotel_id) OR guest_user = auth.uid());

CREATE TABLE public.guest_links (
  user_id uuid NOT NULL, booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, booking_id));
GRANT SELECT ON public.guest_links TO authenticated;
GRANT ALL ON public.guest_links TO service_role;
ALTER TABLE public.guest_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gl own" ON public.guest_links FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Staff invite redemption
CREATE OR REPLACE FUNCTION public.redeem_staff_invite(_code text, _name text, _mobile text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); inv staff_invites%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO inv FROM staff_invites WHERE code = upper(trim(_code)) FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invite code not found'; END IF;
  IF inv.used_by IS NOT NULL THEN RAISE EXCEPTION 'Invite code already used'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'Invite code expired'; END IF;
  UPDATE staff_invites SET used_by = uid, used_at = now() WHERE id = inv.id;
  UPDATE profiles SET hotel_id = inv.hotel_id, staff_kind = inv.staff_kind, onboarded = true,
    full_name = coalesce(nullif(trim(_name),''), full_name), mobile = coalesce(nullif(trim(_mobile),''), mobile) WHERE id = uid;
  INSERT INTO user_roles (user_id, role) VALUES (uid, 'staff') ON CONFLICT DO NOTHING;
  RETURN inv.staff_kind;
END $$;

CREATE OR REPLACE FUNCTION public.check_offer(_code text)
RETURNS TABLE(id uuid, title text, discount_pct numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.title, o.discount_pct FROM offers o WHERE o.active AND upper(o.code) = upper(trim(_code)) AND public.is_member() LIMIT 1 $$;

-- Atomic 4-step booking
CREATE OR REPLACE FUNCTION public.create_booking(_guest uuid, _room uuid, _nights int, _occupants jsonb, _offer_code text, _payment_mode text, _paid boolean, _source text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r rooms%ROWTYPE; h hotels%ROWTYPE; off_id uuid; pct numeric := 0; n int; bid uuid; billid uuid; code text;
  sub numeric; disc numeric; taxable numeric; cg numeric; sg numeric; occ jsonb; i int := 0; cnt int;
BEGIN
  SELECT * INTO r FROM rooms WHERE id = _room FOR UPDATE;
  IF r.id IS NULL OR NOT public.is_mgr(r.hotel_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF r.status <> 'available' THEN RAISE EXCEPTION 'Room is not available'; END IF;
  cnt := jsonb_array_length(coalesce(_occupants,'[]'));
  IF cnt < 1 THEN RAISE EXCEPTION 'Add at least the primary guest'; END IF;
  IF cnt > r.capacity THEN RAISE EXCEPTION 'Room % allows at most % guests', r.number, r.capacity; END IF;
  SELECT * INTO h FROM hotels WHERE id = r.hotel_id;
  IF coalesce(trim(_offer_code),'') <> '' THEN
    SELECT o.id, o.discount_pct INTO off_id, pct FROM offers o WHERE o.active AND upper(o.code) = upper(trim(_offer_code));
    IF off_id IS NULL THEN RAISE EXCEPTION 'Offer code is not valid'; END IF;
  END IF;
  n := greatest(1, least(_nights, 60));
  INSERT INTO bookings (hotel_id, guest_id, room_id, offer_id, nights, rate, adults, created_by, source)
  VALUES (r.hotel_id, _guest, r.id, off_id, n, r.price, cnt, auth.uid(), coalesce(_source,'walk-in'))
  RETURNING id, booking_code INTO bid, code;
  FOR occ IN SELECT * FROM jsonb_array_elements(_occupants) LOOP
    IF coalesce(trim(occ->>'full_name'),'') = '' THEN RAISE EXCEPTION 'Every guest needs a name'; END IF;
    INSERT INTO booking_occupants (booking_id, hotel_id, full_name, aadhaar, age, gender, is_primary)
    VALUES (bid, r.hotel_id, trim(occ->>'full_name'), nullif(occ->>'aadhaar',''), nullif(occ->>'age','')::int, nullif(occ->>'gender',''), i = 0);
    i := i + 1;
  END LOOP;
  sub := round(r.price * n, 2); disc := round(sub * pct / 100, 2); taxable := sub - disc;
  cg := round(taxable * h.cgst_rate / 100, 2); sg := round(taxable * h.sgst_rate / 100, 2);
  INSERT INTO bills (booking_id, hotel_id, subtotal, extras, discount, cgst_rate, sgst_rate, cgst, sgst, total, payment_mode, paid)
  VALUES (bid, r.hotel_id, sub, 0, disc, h.cgst_rate, h.sgst_rate, cg, sg, taxable + cg + sg, coalesce(_payment_mode,'cash'), coalesce(_paid,true))
  RETURNING id INTO billid;
  UPDATE rooms SET status = 'occupied' WHERE id = r.id;
  RETURN jsonb_build_object('booking_id', bid, 'bill_id', billid, 'booking_code', code);
END $$;

-- Checkout -> cleaning task (high priority)
CREATE OR REPLACE FUNCTION public.on_booking_checkout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'checked_out' AND OLD.status IS DISTINCT FROM 'checked_out' THEN
    INSERT INTO cleaning_tasks (hotel_id, room_id, source, base_priority, note)
    VALUES (NEW.hotel_id, NEW.room_id, 'checkout', 40, 'Deep clean after check-out');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER booking_checkout_clean AFTER UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.on_booking_checkout();

-- Guest ecosystem (all access via token + linked active booking)
CREATE OR REPLACE FUNCTION public.guest_active_booking(_token text) RETURNS bookings
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.* FROM bookings b JOIN rooms r ON r.id = b.room_id JOIN guest_links gl ON gl.booking_id = b.id
  WHERE r.qr_token = _token AND b.status = 'checked_in' AND gl.user_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.guest_room_context(_token text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r rooms%ROWTYPE; h hotels%ROWTYPE; b bookings%ROWTYPE; bill numeric;
BEGIN
  SELECT * INTO r FROM rooms WHERE qr_token = _token;
  IF r.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO h FROM hotels WHERE id = r.hotel_id;
  b := public.guest_active_booking(_token);
  IF b.id IS NULL THEN
    RETURN jsonb_build_object('room', r.number, 'room_type', r.room_type, 'hotel', h.name, 'city', h.city, 'linked', false, 'is_staff', public.can_hotel(r.hotel_id) AND public.is_member(), 'room_id', CASE WHEN public.can_hotel(r.hotel_id) THEN r.id END);
  END IF;
  SELECT coalesce(sum(total),0) INTO bill FROM food_orders WHERE booking_id = b.id AND status <> 'cancelled';
  RETURN jsonb_build_object('room', r.number, 'room_type', r.room_type, 'hotel', h.name, 'city', h.city, 'phone', h.phone, 'linked', true,
    'wifi_name', h.wifi_name, 'wifi_password', h.wifi_password, 'booking_code', b.booking_code, 'check_in', b.check_in, 'nights', b.nights,
    'room_total', b.rate * b.nights, 'food_total', bill, 'is_staff', false,
    'menu', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'category',m.category,'price',m.price,'veg',m.veg) ORDER BY m.category, m.name),'[]') FROM menu_items m WHERE m.hotel_id = r.hotel_id AND m.available),
    'orders', (SELECT coalesce(jsonb_agg(jsonb_build_object('order_no',o.order_no,'status',o.status,'total',o.total,'created_at',o.created_at) ORDER BY o.created_at DESC),'[]') FROM food_orders o WHERE o.booking_id = b.id));
END $$;

CREATE OR REPLACE FUNCTION public.guest_link_stay(_token text, _booking_code text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT b.id INTO bid FROM bookings b JOIN rooms r ON r.id = b.room_id
  WHERE r.qr_token = _token AND b.status = 'checked_in' AND upper(b.booking_code) = upper(trim(_booking_code));
  IF bid IS NULL THEN RAISE EXCEPTION 'Booking code does not match this room'; END IF;
  INSERT INTO guest_links (user_id, booking_id) VALUES (auth.uid(), bid) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.guest_request(_token text, _kind text, _note text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b bookings%ROWTYPE;
BEGIN
  b := public.guest_active_booking(_token);
  IF b.id IS NULL THEN RAISE EXCEPTION 'Link your stay first'; END IF;
  IF _kind = 'cleaning' OR _kind = 'towels' THEN
    IF EXISTS (SELECT 1 FROM cleaning_tasks WHERE room_id = b.room_id AND status <> 'done' AND source = 'guest') THEN RETURN true; END IF;
    INSERT INTO cleaning_tasks (hotel_id, room_id, source, base_priority, note)
    VALUES (b.hotel_id, b.room_id, 'guest', 30, initcap(_kind) || ' requested by guest' || coalesce(': ' || left(_note,200), ''));
  ELSE
    INSERT INTO room_issues (hotel_id, room_id, category, tag, severity, note)
    VALUES (b.hotel_id, b.room_id, coalesce(nullif(_kind,''),'Other'), 'Reported by guest', 'medium', left(_note,300));
  END IF;
  INSERT INTO alerts (hotel_id, kind, message, ref_id) SELECT b.hotel_id, 'guest', 'Room ' || number || ': guest request — ' || _kind, b.room_id FROM rooms WHERE id = b.room_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.guest_place_order(_token text, _items jsonb, _note text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b bookings%ROWTYPE; it jsonb; m menu_items%ROWTYPE; clean jsonb := '[]'; tot numeric := 0; q int; no text;
BEGIN
  b := public.guest_active_booking(_token);
  IF b.id IS NULL THEN RAISE EXCEPTION 'Link your stay first'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO m FROM menu_items WHERE id = (it->>'id')::uuid AND hotel_id = b.hotel_id AND available;
    q := greatest(1, least(coalesce((it->>'qty')::int,1), 20));
    IF m.id IS NOT NULL THEN
      clean := clean || jsonb_build_object('name', m.name, 'qty', q, 'price', m.price);
      tot := tot + m.price * q;
    END IF;
  END LOOP;
  IF tot = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  INSERT INTO food_orders (hotel_id, room_id, booking_id, guest_user, items, total, note)
  VALUES (b.hotel_id, b.room_id, b.id, auth.uid(), clean, tot, left(_note,200)) RETURNING order_no INTO no;
  RETURN no;
END $$;

CREATE OR REPLACE FUNCTION public.guest_review(_token text, _rating int, _comment text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b bookings%ROWTYPE;
BEGIN
  b := public.guest_active_booking(_token);
  IF b.id IS NULL THEN RAISE EXCEPTION 'Link your stay first'; END IF;
  INSERT INTO reviews (hotel_id, booking_id, guest_user, rating, comment) VALUES (b.hotel_id, b.id, auth.uid(), greatest(1,least(_rating,5)), left(_comment,500));
  RETURN true;
END $$;

-- Food delivered -> add to bill as service log
CREATE OR REPLACE FUNCTION public.on_food_delivered() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := now();
    INSERT INTO service_logs (hotel_id, room_id, staff_id, kind, note, amount) VALUES (NEW.hotel_id, NEW.room_id, auth.uid(), 'food', 'Order ' || NEW.order_no, NEW.total);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER food_delivered BEFORE UPDATE OF status ON public.food_orders FOR EACH ROW EXECUTE FUNCTION public.on_food_delivered();

-- Automations v2
CREATE OR REPLACE FUNCTION public.run_automations() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ist timestamp := now() AT TIME ZONE 'Asia/Kolkata';
BEGIN
  INSERT INTO alerts (hotel_id, kind, message, ref_id)
  SELECT b.hotel_id, 'overdue', 'Room ' || r.number || ' is past its check-out time', b.id
  FROM bookings b JOIN rooms r ON r.id = b.room_id
  WHERE b.status = 'checked_in' AND NOT b.flagged AND b.check_in + (b.nights || ' days')::interval < now();
  UPDATE bookings SET flagged = true WHERE status = 'checked_in' AND NOT flagged AND check_in + (nights || ' days')::interval < now();
  -- daily refresh for occupied rooms from 10:00 IST
  IF extract(hour FROM ist) >= 10 THEN
    INSERT INTO cleaning_tasks (hotel_id, room_id, source, base_priority, note)
    SELECT r.hotel_id, r.id, 'daily', 10, 'Daily room refresh' FROM rooms r
    WHERE r.status = 'occupied' AND NOT EXISTS (SELECT 1 FROM cleaning_tasks t WHERE t.room_id = r.id AND t.source = 'daily' AND (t.created_at AT TIME ZONE 'Asia/Kolkata')::date = ist::date);
  END IF;
  -- escalate tasks waiting > 2h
  INSERT INTO alerts (hotel_id, kind, message, ref_id)
  SELECT t.hotel_id, 'cleaning', 'Room ' || r.number || ' cleaning has waited over 2 hours', t.id
  FROM cleaning_tasks t JOIN rooms r ON r.id = t.room_id WHERE t.status = 'pending' AND NOT t.escalated AND t.created_at < now() - interval '2 hours';
  UPDATE cleaning_tasks SET escalated = true WHERE status = 'pending' AND NOT escalated AND created_at < now() - interval '2 hours';
  -- 18:00 IST daily-check reminder (once per day per hotel)
  IF extract(hour FROM ist) >= 18 THEN
    INSERT INTO alerts (hotel_id, kind, message)
    SELECT r.hotel_id, 'checks', count(*) || ' rooms have no condition check today'
    FROM rooms r WHERE NOT EXISTS (SELECT 1 FROM room_checks c WHERE c.room_id = r.id AND (c.created_at AT TIME ZONE 'Asia/Kolkata')::date = ist::date)
      AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.hotel_id = r.hotel_id AND a.kind = 'checks' AND (a.created_at AT TIME ZONE 'Asia/Kolkata')::date = ist::date)
    GROUP BY r.hotel_id;
  END IF;
  DELETE FROM alerts WHERE created_at < now() - interval '14 days';
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.cleaning_tasks, public.food_orders, public.room_checks;
