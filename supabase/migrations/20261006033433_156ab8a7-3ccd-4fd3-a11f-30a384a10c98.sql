ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS food_gst_rate numeric NOT NULL DEFAULT 5;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS manager_perms jsonb NOT NULL DEFAULT '{"menu":true,"food_tax":true,"room_rates":true,"rooms":true,"staff":true,"settings":true,"undo_checkout":true}'::jsonb;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS description text;

CREATE OR REPLACE FUNCTION public.mgr_can(_hotel uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (public.is_mgr(_hotel) AND coalesce((SELECT (manager_perms->>_perm)::boolean FROM hotels WHERE id=_hotel), true)) $$;

CREATE OR REPLACE FUNCTION public.undo_checkout(_booking uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b bookings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM bookings WHERE id = _booking FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NOT public.mgr_can(b.hotel_id, 'undo_checkout') THEN RAISE EXCEPTION 'You are not allowed to undo check-outs'; END IF;
  IF b.status <> 'checked_out' OR b.check_out < now() - interval '1 hour' THEN RAISE EXCEPTION 'Check-out can only be undone within 1 hour'; END IF;
  IF EXISTS (SELECT 1 FROM bookings WHERE room_id = b.room_id AND status = 'checked_in') THEN RAISE EXCEPTION 'Room is already occupied by another guest'; END IF;
  DELETE FROM bills WHERE booking_id = b.id;
  DELETE FROM cleaning_tasks WHERE room_id = b.room_id AND source = 'checkout' AND status <> 'done' AND created_at >= b.check_out;
  UPDATE bookings SET status = 'checked_in', check_out = NULL WHERE id = b.id;
  UPDATE rooms SET status = 'occupied' WHERE id = b.room_id;
  RETURN true;
END $$;

-- Only admins may change manager permissions
CREATE OR REPLACE FUNCTION public.guard_manager_perms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.manager_perms IS DISTINCT FROM OLD.manager_perms AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only the chain admin can change manager permissions';
  END IF;
  IF NEW.food_gst_rate IS DISTINCT FROM OLD.food_gst_rate AND NOT public.mgr_can(NEW.id,'food_tax') THEN
    RAISE EXCEPTION 'You are not allowed to change food tax';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_manager_perms ON public.hotels;
CREATE TRIGGER trg_guard_manager_perms BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.guard_manager_perms();

REVOKE ALL ON FUNCTION public.undo_checkout(uuid), public.mgr_can(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.undo_checkout(uuid), public.mgr_can(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_hotel(_hotel uuid DEFAULT NULL, _token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE hid uuid; h hotels%ROWTYPE; rno text;
BEGIN
  IF _token IS NOT NULL THEN SELECT hotel_id, number INTO hid, rno FROM rooms WHERE qr_token = _token; ELSE hid := _hotel; END IF;
  SELECT * INTO h FROM hotels WHERE id = hid AND status = 'active';
  IF h.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id', h.id, 'name', h.name, 'city', h.city, 'address', h.address, 'phone', h.phone, 'room', rno, 'food_gst_rate', h.food_gst_rate,
    'room_types', (SELECT coalesce(jsonb_agg(jsonb_build_object('type', t, 'price', p, 'count', c)),'[]') FROM (SELECT room_type t, min(price) p, count(*) c FROM rooms WHERE hotel_id = h.id GROUP BY room_type) x),
    'menu', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'category',m.category,'price',m.price,'veg',m.veg,'image_url',m.image_url,'description',m.description) ORDER BY m.category, m.name),'[]') FROM menu_items m WHERE m.hotel_id = h.id AND m.available),
    'offers', (SELECT coalesce(jsonb_agg(jsonb_build_object('title',o.title,'code',o.code,'pct',o.discount_pct)),'[]') FROM offers o WHERE o.active),
    'rating', (SELECT round(avg(rating)::numeric,1) FROM reviews v WHERE v.hotel_id = h.id),
    'reviews', (SELECT count(*) FROM reviews v WHERE v.hotel_id = h.id));
END $$;