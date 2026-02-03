-- G31: storage bucket for client avatars

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-avatars', 'client-avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read client avatars" ON storage.objects;
CREATE POLICY "Public read client avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'client-avatars');

DROP POLICY IF EXISTS "Service role manage client avatars" ON storage.objects;
CREATE POLICY "Service role manage client avatars" ON storage.objects
  FOR ALL
  USING (auth.role() = 'service_role' AND bucket_id = 'client-avatars')
  WITH CHECK (auth.role() = 'service_role' AND bucket_id = 'client-avatars');
