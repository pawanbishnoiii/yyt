CREATE POLICY "hotel staff upload guest ids" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guest-ids' AND public.is_mgr(((storage.foldername(name))[1])::uuid));
CREATE POLICY "hotel staff read guest ids" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'guest-ids' AND public.is_mgr(((storage.foldername(name))[1])::uuid));