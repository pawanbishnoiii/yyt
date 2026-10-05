ALTER TABLE public.hotels
  ADD COLUMN gst_number text, ADD COLUMN state text, ADD COLUMN pincode text,
  ADD COLUMN cgst_rate numeric NOT NULL DEFAULT 6, ADD COLUMN sgst_rate numeric NOT NULL DEFAULT 6,
  ADD COLUMN upi_id text, ADD COLUMN owner_id uuid;
ALTER TABLE public.profiles ADD COLUMN mobile text, ADD COLUMN onboarded boolean NOT NULL DEFAULT false;

-- managers can update their own hotel settings
CREATE POLICY "hotels mgr update" ON public.hotels FOR UPDATE TO authenticated
  USING (public.is_mgr(id)) WITH CHECK (public.is_mgr(id));

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _manager_name text, _mobile text, _business_name text, _address text, _pincode text, _state text,
  _gst text, _cgst numeric, _sgst numeric, _upi text,
  _branch_name text, _city text, _branch_address text, _phone text,
  _room_type text, _start_no int, _room_count int, _price numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); hid uuid; i int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid AND onboarded) THEN RAISE EXCEPTION 'already onboarded'; END IF;
  IF coalesce(trim(_branch_name),'') = '' OR coalesce(trim(_manager_name),'') = '' THEN RAISE EXCEPTION 'missing fields'; END IF;
  IF _room_count < 0 OR _room_count > 200 THEN RAISE EXCEPTION 'room count 0-200'; END IF;
  INSERT INTO hotels (name, city, address, phone, gst_number, state, pincode, cgst_rate, sgst_rate, upi_id, owner_id)
  VALUES (trim(_branch_name), _city, coalesce(nullif(_branch_address,''), _address), _phone, nullif(upper(_gst),''), _state, _pincode,
          coalesce(_cgst,6), coalesce(_sgst,6), nullif(_upi,''), uid)
  RETURNING id INTO hid;
  INSERT INTO departments (hotel_id, name, kind) VALUES
    (hid,'Housekeeping','cleaning'),(hid,'Kitchen & Food','food'),(hid,'Front Desk','other'),(hid,'Maintenance','other');
  FOR i IN 0..(_room_count-1) LOOP
    INSERT INTO rooms (hotel_id, number, room_type, price) VALUES (hid, (_start_no + i)::text, coalesce(_room_type,'Standard'), coalesce(_price,1000));
  END LOOP;
  UPDATE profiles SET full_name = trim(_manager_name), mobile = _mobile, hotel_id = hid, onboarded = true WHERE id = uid;
  IF NOT public.has_role(uid,'admin') THEN
    INSERT INTO user_roles (user_id, role) VALUES (uid,'manager') ON CONFLICT DO NOTHING;
  END IF;
  IF coalesce(trim(_business_name),'') <> '' AND public.has_role(uid,'admin') THEN
    UPDATE business_settings SET business_name = trim(_business_name) WHERE id = 1;
  END IF;
  RETURN hid;
END $$;

CREATE OR REPLACE FUNCTION public.quick_checkin(_guest uuid, _room uuid, _nights int)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r rooms%ROWTYPE; code text;
BEGIN
  SELECT * INTO r FROM rooms WHERE id = _room FOR UPDATE;
  IF r.id IS NULL OR NOT public.is_mgr(r.hotel_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF r.status <> 'available' THEN RAISE EXCEPTION 'room not available'; END IF;
  INSERT INTO bookings (hotel_id, guest_id, room_id, nights, rate, created_by)
  VALUES (r.hotel_id, _guest, r.id, greatest(1,_nights), r.price, auth.uid()) RETURNING booking_code INTO code;
  UPDATE rooms SET status = 'occupied' WHERE id = r.id;
  RETURN code;
END $$;

REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text,text,text,text,text,text,text,numeric,numeric,text,text,text,text,text,text,int,int,numeric), public.quick_checkin(uuid,uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text,text,text,text,text,text,text,numeric,numeric,text,text,text,text,text,text,int,int,numeric), public.quick_checkin(uuid,uuid,int) TO authenticated;

-- existing admin profile counts as onboarded
UPDATE public.profiles p SET onboarded = true WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id);
-- members need to read own hotel even with no role yet? onboarding users have no role; they don't need reads.