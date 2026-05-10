ALTER TABLE public.admission
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_file_name TEXT,
  ADD COLUMN IF NOT EXISTS signature_path TEXT,
  ADD COLUMN IF NOT EXISTS signature_file_name TEXT;

ALTER TABLE public.student_information
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_file_name TEXT,
  ADD COLUMN IF NOT EXISTS signature_path TEXT,
  ADD COLUMN IF NOT EXISTS signature_file_name TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('registration-media', 'registration-media', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

DROP POLICY IF EXISTS "Allow public registration media uploads" ON storage.objects;
CREATE POLICY "Allow public registration media uploads"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'registration-media'
    AND split_part(name, '/', 1) = 'registration-drafts'
    AND split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
    AND split_part(name, '/', 3) IN ('student-photo', 'student-signature')
  );

DROP POLICY IF EXISTS "Allow public registration media read access" ON storage.objects;
CREATE POLICY "Allow public registration media read access"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'registration-media'
    AND split_part(name, '/', 1) = 'registration-drafts'
    AND split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
    AND split_part(name, '/', 3) IN ('student-photo', 'student-signature')
  );

DROP POLICY IF EXISTS "Allow public registration media updates" ON storage.objects;
CREATE POLICY "Allow public registration media updates"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'registration-media'
    AND split_part(name, '/', 1) = 'registration-drafts'
    AND split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
    AND split_part(name, '/', 3) IN ('student-photo', 'student-signature')
  )
  WITH CHECK (
    bucket_id = 'registration-media'
    AND split_part(name, '/', 1) = 'registration-drafts'
    AND split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
    AND split_part(name, '/', 3) IN ('student-photo', 'student-signature')
  );
