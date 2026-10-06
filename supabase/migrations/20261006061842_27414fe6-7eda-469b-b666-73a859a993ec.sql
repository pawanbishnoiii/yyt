CREATE OR REPLACE FUNCTION public.guest_auto_link(_token text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT b.id INTO bid FROM bookings b JOIN rooms r ON r.id=b.room_id WHERE r.qr_token=_token AND b.status='checked_in' LIMIT 1;
  IF bid IS NULL THEN RETURN false; END IF;
  INSERT INTO guest_links (user_id, booking_id) VALUES (auth.uid(), bid) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.guest_auto_link(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guest_auto_link(text) TO authenticated;