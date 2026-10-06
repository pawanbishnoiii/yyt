UPDATE public.hotels
SET manager_perms = jsonb_build_object(
  'bookings', COALESCE((manager_perms->>'bookings')::boolean, true),
  'checkout', COALESCE((manager_perms->>'checkout')::boolean, true),
  'undo_checkout', COALESCE((manager_perms->>'undo_checkout')::boolean, true),
  'room_rates', COALESCE((manager_perms->>'room_rates')::boolean, true),
  'rooms', COALESCE((manager_perms->>'rooms')::boolean, true),
  'menu', COALESCE((manager_perms->>'menu')::boolean, true),
  'food_tax', COALESCE((manager_perms->>'food_tax')::boolean, true),
  'staff', COALESCE((manager_perms->>'staff')::boolean, true),
  'reviews', COALESCE((manager_perms->>'reviews')::boolean, true),
  'reports', COALESCE((manager_perms->>'reports')::boolean, true),
  'settings', COALESCE((manager_perms->>'settings')::boolean, true)
);

ALTER TABLE public.hotels
  ALTER COLUMN manager_perms SET DEFAULT '{"bookings":true,"checkout":true,"undo_checkout":true,"room_rates":true,"rooms":true,"menu":true,"food_tax":true,"staff":true,"reviews":true,"reports":true,"settings":true}'::jsonb;

CREATE OR REPLACE FUNCTION public.set_manager_permissions(_hotel uuid, _permissions jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  RETURN clean;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_manager_permissions(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_manager_permissions(uuid, jsonb) TO service_role;

CREATE POLICY "Public can view menu images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'menu-images');

CREATE POLICY "Managers can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.mgr_can(((storage.foldername(name))[1])::uuid, 'menu')
);

CREATE POLICY "Managers can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.mgr_can(((storage.foldername(name))[1])::uuid, 'menu')
)
WITH CHECK (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.mgr_can(((storage.foldername(name))[1])::uuid, 'menu')
);

CREATE POLICY "Managers can delete menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.mgr_can(((storage.foldername(name))[1])::uuid, 'menu')
);