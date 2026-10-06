ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS checkout_time time NOT NULL DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS checkout_time_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS id_upload_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS demo_loaded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_service_phone text,
  ADD COLUMN IF NOT EXISTS service_items text[] NOT NULL DEFAULT ARRAY['Food delivery','Towels','Soap','Drinking water','Room cleaning'];
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS id_doc_path text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_out_planned timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE TABLE public.bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id),
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'cash',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.bill_payments TO authenticated;
GRANT ALL ON public.bill_payments TO service_role;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hotel staff read payments" ON public.bill_payments FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "managers add payments" ON public.bill_payments FOR INSERT TO authenticated WITH CHECK (public.is_mgr(hotel_id));
CREATE POLICY "managers remove payments" ON public.bill_payments FOR DELETE TO authenticated USING (public.is_mgr(hotel_id));

CREATE OR REPLACE FUNCTION public.sync_bill_paid() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b uuid := coalesce(NEW.bill_id, OLD.bill_id);
BEGIN
  UPDATE bills SET paid = (SELECT coalesce(sum(amount),0) FROM bill_payments WHERE bill_id=b) >= total - 0.5 WHERE id=b;
  RETURN NULL;
END $$;
CREATE TRIGGER bill_payments_sync AFTER INSERT OR DELETE ON public.bill_payments FOR EACH ROW EXECUTE FUNCTION public.sync_bill_paid();

CREATE TABLE public.staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hotel_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.staff_sessions TO authenticated;
GRANT ALL ON public.staff_sessions TO service_role;
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log own session" ON public.staff_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "read own or managed sessions" ON public.staff_sessions FOR SELECT TO authenticated USING (user_id = auth.uid() OR (hotel_id IS NOT NULL AND public.is_mgr(hotel_id)));

CREATE OR REPLACE FUNCTION public.touch_session() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE profiles SET last_seen_at = now() WHERE id = auth.uid();
  IF NOT EXISTS (SELECT 1 FROM staff_sessions WHERE user_id=auth.uid() AND created_at > now() - interval '30 minutes') THEN
    INSERT INTO staff_sessions (user_id, hotel_id) VALUES (auth.uid(), public.my_hotel());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.staff_activity(_hotel uuid)
RETURNS TABLE(id uuid, full_name text, email text, mobile text, staff_kind text, last_seen_at timestamptz, opens_per_day numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p.id, p.full_name, p.email, p.mobile, p.staff_kind, p.last_seen_at,
    round((SELECT count(*) FROM staff_sessions s WHERE s.user_id=p.id AND s.created_at > now()-interval '7 days')::numeric / 7, 1)
  FROM profiles p WHERE p.hotel_id=_hotel AND public.is_mgr(_hotel) AND p.staff_kind IS NOT NULL ORDER BY p.full_name $$;

CREATE OR REPLACE FUNCTION public.save_guest(_id uuid, _first text, _last text, _mobile text, _aadhaar text, _age int, _gender text, _address text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE gid uuid;
BEGIN
  IF NOT public.is_member() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF coalesce(trim(_first),'')='' OR coalesce(trim(_mobile),'')='' THEN RAISE EXCEPTION 'Name and mobile are required'; END IF;
  IF _id IS NOT NULL THEN
    UPDATE guests SET first_name=trim(_first), last_name=coalesce(trim(_last),''), mobile=trim(_mobile), aadhaar=nullif(trim(_aadhaar),''), age=_age, gender=nullif(_gender,''), address=nullif(_address,'') WHERE id=_id RETURNING id INTO gid;
    RETURN gid;
  END IF;
  SELECT id INTO gid FROM guests WHERE mobile=trim(_mobile) LIMIT 1;
  IF gid IS NOT NULL THEN RETURN gid; END IF;
  INSERT INTO guests (first_name,last_name,mobile,aadhaar,age,gender,address) VALUES (trim(_first),coalesce(trim(_last),''),trim(_mobile),nullif(trim(_aadhaar),''),_age,nullif(_gender,''),nullif(_address,'')) RETURNING id INTO gid;
  RETURN gid;
END $$;

CREATE OR REPLACE FUNCTION public.public_available_rooms(_hotel uuid)
RETURNS TABLE(id uuid, number text, room_type text, price numeric, capacity int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT r.id, r.number, r.room_type, r.price, r.capacity FROM rooms r JOIN hotels h ON h.id=r.hotel_id
  WHERE r.hotel_id=_hotel AND h.status='active' AND r.status='available' ORDER BY r.room_type, r.number $$;
GRANT EXECUTE ON FUNCTION public.public_available_rooms(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guest_reserve(_room uuid, _check_in date, _nights int, _name text, _mobile text, _adults int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r rooms%ROWTYPE; gid uuid; code text; pct numeric := 0; total numeric; n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in to reserve'; END IF;
  IF coalesce(trim(_name),'')='' OR length(regexp_replace(coalesce(_mobile,''),'\D','','g')) < 10 THEN RAISE EXCEPTION 'Enter your name and a 10-digit mobile'; END IF;
  IF _check_in < current_date THEN RAISE EXCEPTION 'Pick today or a future date'; END IF;
  SELECT * INTO r FROM rooms WHERE id=_room FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'available' THEN RAISE EXCEPTION 'That room was just taken — pick another'; END IF;
  n := greatest(1, least(_nights, 30));
  IF coalesce(_adults,1) > r.capacity THEN RAISE EXCEPTION 'Room fits at most % guests', r.capacity; END IF;
  SELECT id INTO gid FROM guests WHERE mobile=trim(_mobile) LIMIT 1;
  IF gid IS NULL THEN
    INSERT INTO guests (first_name,last_name,mobile) VALUES (split_part(trim(_name),' ',1), coalesce(nullif(substr(trim(_name), length(split_part(trim(_name),' ',1))+2),''),''), trim(_mobile)) RETURNING id INTO gid;
    pct := 10;
  END IF;
  IF _adults = 2 THEN pct := greatest(pct, 20); END IF;
  INSERT INTO bookings (hotel_id, guest_id, room_id, nights, rate, adults, status, source, check_in, check_out_planned)
  VALUES (r.hotel_id, gid, r.id, n, round(r.price*(1-pct/100),2), coalesce(_adults,1), 'reserved', 'online', _check_in::timestamptz, (_check_in + n)::timestamptz)
  RETURNING booking_code INTO code;
  UPDATE rooms SET status='reserved' WHERE id=r.id;
  INSERT INTO alerts (hotel_id, kind, message) VALUES (r.hotel_id, 'reservation', 'New online reservation · Room ' || r.number || ' · ' || trim(_name));
  total := round(r.price*(1-pct/100)*n,2);
  RETURN jsonb_build_object('booking_code', code, 'room', r.number, 'room_type', r.room_type, 'nights', n, 'discount_pct', pct, 'total', total);
END $$;
GRANT EXECUTE ON FUNCTION public.guest_reserve(uuid,date,int,text,text,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_demo_loaded(_hotel uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE hotels SET demo_loaded=true WHERE id=_hotel AND public.is_mgr(_hotel) $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_payments;
EXCEPTION WHEN others THEN NULL; END $$;