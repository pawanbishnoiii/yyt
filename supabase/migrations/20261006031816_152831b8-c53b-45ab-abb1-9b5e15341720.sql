ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE OR REPLACE FUNCTION public.public_hotels()
RETURNS TABLE(id uuid, name text, city text, address text, phone text, min_price numeric, rooms int, rating numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.name, h.city, h.address, h.phone,
    (SELECT min(price) FROM rooms r WHERE r.hotel_id = h.id),
    (SELECT count(*)::int FROM rooms r WHERE r.hotel_id = h.id),
    (SELECT round(avg(rating)::numeric,1) FROM reviews v WHERE v.hotel_id = h.id)
  FROM hotels h WHERE h.status = 'active' ORDER BY h.name $$;

CREATE OR REPLACE FUNCTION public.public_hotel(_hotel uuid DEFAULT NULL, _token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE hid uuid; h hotels%ROWTYPE; rno text;
BEGIN
  IF _token IS NOT NULL THEN SELECT hotel_id, number INTO hid, rno FROM rooms WHERE qr_token = _token; ELSE hid := _hotel; END IF;
  SELECT * INTO h FROM hotels WHERE id = hid AND status = 'active';
  IF h.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id', h.id, 'name', h.name, 'city', h.city, 'address', h.address, 'phone', h.phone, 'room', rno,
    'room_types', (SELECT coalesce(jsonb_agg(jsonb_build_object('type', t, 'price', p, 'count', c)),'[]') FROM (SELECT room_type t, min(price) p, count(*) c FROM rooms WHERE hotel_id = h.id GROUP BY room_type) x),
    'menu', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'category',m.category,'price',m.price,'veg',m.veg) ORDER BY m.category, m.name),'[]') FROM menu_items m WHERE m.hotel_id = h.id AND m.available),
    'offers', (SELECT coalesce(jsonb_agg(jsonb_build_object('title',o.title,'code',o.code,'pct',o.discount_pct)),'[]') FROM offers o WHERE o.active),
    'rating', (SELECT round(avg(rating)::numeric,1) FROM reviews v WHERE v.hotel_id = h.id),
    'reviews', (SELECT count(*) FROM reviews v WHERE v.hotel_id = h.id));
END $$;

CREATE OR REPLACE FUNCTION public.assign_manager(_hotel uuid, _email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT id INTO uid FROM profiles WHERE lower(email) = lower(trim(_email));
  IF uid IS NULL THEN RAISE EXCEPTION 'No user with that email has signed up yet'; END IF;
  UPDATE profiles SET hotel_id = _hotel, onboarded = true WHERE id = uid;
  INSERT INTO user_roles (user_id, role) VALUES (uid, 'manager') ON CONFLICT DO NOTHING;
  UPDATE hotels SET owner_id = uid WHERE id = _hotel;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.chain_overview()
RETURNS TABLE(id uuid, name text, city text, status text, rooms int, occupied int, revenue numeric, rating numeric, manager text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.name, h.city, h.status,
    (SELECT count(*)::int FROM rooms r WHERE r.hotel_id = h.id),
    (SELECT count(*)::int FROM rooms r WHERE r.hotel_id = h.id AND r.status = 'occupied'),
    (SELECT coalesce(sum(total),0) FROM bills b WHERE b.hotel_id = h.id AND b.created_at > now() - interval '30 days'),
    (SELECT round(avg(rating)::numeric,1) FROM reviews v WHERE v.hotel_id = h.id),
    (SELECT coalesce(p.full_name, p.email) FROM profiles p WHERE p.id = h.owner_id)
  FROM hotels h WHERE public.has_role(auth.uid(), 'admin') ORDER BY h.name $$;

REVOKE ALL ON FUNCTION public.assign_manager(uuid,text) FROM anon, public;
REVOKE ALL ON FUNCTION public.chain_overview() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.assign_manager(uuid,text), public.chain_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_hotels(), public.public_hotel(uuid,text), public.guest_room_context(text) TO anon, authenticated;