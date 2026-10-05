ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS preferences text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS stay_notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'walk-in';

CREATE TABLE public.room_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  category text NOT NULL,
  tag text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  note text,
  resolved boolean NOT NULL DEFAULT false,
  reported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_issues TO authenticated;
GRANT ALL ON public.room_issues TO service_role;
ALTER TABLE public.room_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issues read" ON public.room_issues FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));
CREATE POLICY "issues insert" ON public.room_issues FOR INSERT TO authenticated WITH CHECK (public.can_hotel(hotel_id) AND reported_by = auth.uid());
CREATE POLICY "issues update" ON public.room_issues FOR UPDATE TO authenticated USING (public.can_hotel(hotel_id)) WITH CHECK (public.can_hotel(hotel_id));
CREATE POLICY "issues delete" ON public.room_issues FOR DELETE TO authenticated USING (public.is_mgr(hotel_id));

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts read" ON public.alerts FOR SELECT TO authenticated USING (public.can_hotel(hotel_id));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_issues;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.run_automations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO alerts (hotel_id, kind, message, ref_id)
  SELECT b.hotel_id, 'overdue', 'Room ' || r.number || ' is past its check-out time', b.id
  FROM bookings b JOIN rooms r ON r.id = b.room_id
  WHERE b.status = 'checked_in' AND NOT b.flagged AND b.check_in + (b.nights || ' days')::interval < now();
  UPDATE bookings SET flagged = true
  WHERE status = 'checked_in' AND NOT flagged AND check_in + (nights || ' days')::interval < now();
  INSERT INTO alerts (hotel_id, kind, message, ref_id)
  SELECT r.hotel_id, 'cleaning', 'Room ' || r.number || ' has been waiting for cleaning over 2 hours', r.id
  FROM rooms r
  WHERE r.status = 'cleaning'
    AND (SELECT max(check_out) FROM bookings WHERE room_id = r.id) < now() - interval '2 hours'
    AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.ref_id = r.id AND a.kind = 'cleaning' AND a.created_at > now() - interval '6 hours');
  DELETE FROM alerts WHERE created_at < now() - interval '14 days';
END $$;
REVOKE EXECUTE ON FUNCTION public.run_automations() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  PERFORM cron.schedule('hourly-automations', '0 * * * *', 'SELECT public.run_automations()');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.quick_checkin(_guest uuid, _room uuid, _nights integer)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r rooms%ROWTYPE; code text;
BEGIN
  SELECT * INTO r FROM rooms WHERE id = _room FOR UPDATE;
  IF r.id IS NULL OR NOT public.is_mgr(r.hotel_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF r.status <> 'available' THEN RAISE EXCEPTION 'room not available'; END IF;
  IF EXISTS (SELECT 1 FROM bookings WHERE guest_id = _guest AND status = 'checked_in') THEN RAISE EXCEPTION 'guest already checked in'; END IF;
  INSERT INTO bookings (hotel_id, guest_id, room_id, nights, rate, created_by)
  VALUES (r.hotel_id, _guest, r.id, greatest(1,least(_nights,60)), r.price, auth.uid()) RETURNING booking_code INTO code;
  UPDATE rooms SET status = 'occupied' WHERE id = r.id;
  RETURN code;
END $function$;

CREATE OR REPLACE FUNCTION public.seed_demo(_hotel uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i int; rid uuid; gid uuid; bid uuid; types text[] := ARRAY['Standard','Deluxe','Suite'];
  fn text[] := ARRAY['Aarav','Priya','Rohan','Ananya','Vikram','Sneha','Karan','Meera'];
  ln text[] := ARRAY['Sharma','Patel','Mehta','Iyer','Singh','Reddy','Kapoor','Nair'];
  ints text[] := ARRAY['Food','Spa','Gym'];
  prefs text[] := ARRAY['Quiet room','High floor','Extra pillows','Vegan meals'];
  srcs text[] := ARRAY['online','walk-in','corporate','ota'];
BEGIN
  IF NOT public.is_mgr(_hotel) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF (SELECT count(*) FROM rooms WHERE hotel_id = _hotel) < 12 THEN
    FOR i IN 1..12 LOOP
      INSERT INTO rooms (hotel_id, number, room_type, price)
      VALUES (_hotel, (300 + i)::text, types[1 + (i % 3)], (ARRAY[1499,2499,4999])[1 + (i % 3)]);
    END LOOP;
  END IF;
  FOR i IN 1..8 LOOP
    INSERT INTO guests (first_name, last_name, age, gender, mobile, aadhaar, address, interests, preferences)
    VALUES (fn[i], ln[i], 24 + i*3, CASE WHEN i % 2 = 0 THEN 'Female' ELSE 'Male' END,
            '98765' || lpad((43200 + i + floor(random()*1000)::int)::text, 5, '0'), '4321' || lpad((87650000 + i + floor(random()*10000)::int)::text, 8, '0'),
            'MG Road, Bengaluru', ints[1:1 + (i % 3)], prefs[1:1 + (i % 4)])
    RETURNING id INTO gid;
    SELECT id INTO rid FROM rooms WHERE hotel_id = _hotel AND status = 'available' ORDER BY random() LIMIT 1;
    IF rid IS NULL THEN CONTINUE; END IF;
    IF i <= 4 THEN
      INSERT INTO bookings (hotel_id, guest_id, room_id, nights, rate, created_by, source, check_in)
      SELECT _hotel, gid, rid, 2, price, auth.uid(), srcs[i], now() - (i || ' hours')::interval FROM rooms WHERE id = rid;
      UPDATE rooms SET status = 'occupied' WHERE id = rid;
    ELSE
      INSERT INTO bookings (hotel_id, guest_id, room_id, nights, rate, created_by, status, source, check_in, check_out)
      SELECT _hotel, gid, rid, 1, price, auth.uid(), 'checked_out', srcs[1 + i % 4],
             now() - ((i*3) || ' days')::interval, now() - ((i*3 - 1) || ' days')::interval FROM rooms WHERE id = rid
      RETURNING id INTO bid;
      INSERT INTO bills (booking_id, hotel_id, subtotal, cgst_rate, sgst_rate, cgst, sgst, total, created_at)
      SELECT bid, _hotel, rate, 6, 6, round(rate*0.06,2), round(rate*0.06,2), round(rate*1.12,2), now() - ((i*3 - 1) || ' days')::interval FROM bookings WHERE id = bid;
    END IF;
  END LOOP;
  INSERT INTO room_issues (hotel_id, room_id, category, tag, severity, reported_by)
  SELECT _hotel, r.id, c.cat, c.tag, c.sev, auth.uid()
  FROM (SELECT id, row_number() OVER () rn FROM rooms WHERE hotel_id = _hotel LIMIT 6) r
  JOIN (VALUES (1,'AC','Low cooling','high'),(2,'AC','No remote','low'),(3,'Wi-Fi','Slow speed','medium'),
               (4,'Wi-Fi','Low range','low'),(5,'Washroom','Dirty washroom','high'),(6,'TV','No signal','medium')) c(n,cat,tag,sev) ON c.n = r.rn;
END $$;
REVOKE EXECUTE ON FUNCTION public.seed_demo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_demo(uuid) TO authenticated;