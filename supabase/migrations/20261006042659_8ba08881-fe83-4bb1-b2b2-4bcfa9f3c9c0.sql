CREATE OR REPLACE FUNCTION public.set_manager_permissions(_hotel uuid, _permissions jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE clean jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hotels WHERE id = _hotel) THEN
    RAISE EXCEPTION 'Hotel not found';
  END IF;
  clean := jsonb_build_object(
    'bookings', COALESCE((_permissions->>'bookings')::boolean, false),
    'checkout', COALESCE((_permissions->>'checkout')::boolean, false),
    'undo_checkout', COALESCE((_permissions->>'undo_checkout')::boolean, false),
    'room_rates', COALESCE((_permissions->>'room_rates')::boolean, false),
    'rooms', COALESCE((_permissions->>'rooms')::boolean, false),
    'menu', COALESCE((_permissions->>'menu')::boolean, false),
    'food_tax', COALESCE((_permissions->>'food_tax')::boolean, false),
    'staff', COALESCE((_permissions->>'staff')::boolean, false),
    'reviews', COALESCE((_permissions->>'reviews')::boolean, false),
    'reports', COALESCE((_permissions->>'reports')::boolean, false),
    'settings', COALESCE((_permissions->>'settings')::boolean, false)
  );
  UPDATE public.hotels SET manager_perms = clean WHERE id = _hotel;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hotel update not allowed'; END IF;
  RETURN clean;
END;
$$;
REVOKE ALL ON FUNCTION public.set_manager_permissions(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_manager_permissions(uuid, jsonb) TO authenticated, service_role;