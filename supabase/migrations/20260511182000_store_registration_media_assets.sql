CREATE TABLE IF NOT EXISTS public.registration_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_draft_id UUID NOT NULL,
  media_kind TEXT NOT NULL CHECK (media_kind IN ('profile_photo', 'signature')),
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_bytes BYTEA NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registration_draft_id, media_kind)
);

ALTER TABLE public.registration_media ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admission
  ADD COLUMN IF NOT EXISTS profile_photo_media_id UUID,
  ADD COLUMN IF NOT EXISTS signature_media_id UUID;

ALTER TABLE public.student_information
  ADD COLUMN IF NOT EXISTS profile_photo_media_id UUID,
  ADD COLUMN IF NOT EXISTS signature_media_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admission_profile_photo_media_id_fkey'
  ) THEN
    ALTER TABLE public.admission
      ADD CONSTRAINT admission_profile_photo_media_id_fkey
      FOREIGN KEY (profile_photo_media_id)
      REFERENCES public.registration_media (id)
      ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admission_signature_media_id_fkey'
  ) THEN
    ALTER TABLE public.admission
      ADD CONSTRAINT admission_signature_media_id_fkey
      FOREIGN KEY (signature_media_id)
      REFERENCES public.registration_media (id)
      ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_information_profile_photo_media_id_fkey'
  ) THEN
    ALTER TABLE public.student_information
      ADD CONSTRAINT student_information_profile_photo_media_id_fkey
      FOREIGN KEY (profile_photo_media_id)
      REFERENCES public.registration_media (id)
      ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_information_signature_media_id_fkey'
  ) THEN
    ALTER TABLE public.student_information
      ADD CONSTRAINT student_information_signature_media_id_fkey
      FOREIGN KEY (signature_media_id)
      REFERENCES public.registration_media (id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.touch_registration_media_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_registration_media_updated_at ON public.registration_media;
CREATE TRIGGER touch_registration_media_updated_at
BEFORE UPDATE ON public.registration_media
FOR EACH ROW
EXECUTE FUNCTION public.touch_registration_media_updated_at();

CREATE OR REPLACE FUNCTION public.upsert_registration_media_asset(
  p_registration_draft_id UUID,
  p_media_kind TEXT,
  p_file_name TEXT,
  p_content_type TEXT,
  p_content_base64 TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file_bytes BYTEA;
  v_row public.registration_media;
BEGIN
  IF p_registration_draft_id IS NULL THEN
    RAISE EXCEPTION 'registration_draft_id is required.';
  END IF;

  IF p_media_kind NOT IN ('profile_photo', 'signature') THEN
    RAISE EXCEPTION 'Invalid media kind.';
  END IF;

  IF btrim(COALESCE(p_file_name, '')) = '' THEN
    RAISE EXCEPTION 'File name is required.';
  END IF;

  IF btrim(COALESCE(p_content_type, '')) = '' THEN
    RAISE EXCEPTION 'Content type is required.';
  END IF;

  IF btrim(COALESCE(p_content_base64, '')) = '' THEN
    RAISE EXCEPTION 'File content is required.';
  END IF;

  v_file_bytes := decode(replace(replace(p_content_base64, E'\n', ''), E'\r', ''), 'base64');

  INSERT INTO public.registration_media (
    registration_draft_id,
    media_kind,
    file_name,
    content_type,
    file_bytes,
    byte_size
  )
  VALUES (
    p_registration_draft_id,
    p_media_kind,
    p_file_name,
    p_content_type,
    v_file_bytes,
    octet_length(v_file_bytes)
  )
  ON CONFLICT (registration_draft_id, media_kind) DO UPDATE
  SET
    file_name = EXCLUDED.file_name,
    content_type = EXCLUDED.content_type,
    file_bytes = EXCLUDED.file_bytes,
    byte_size = EXCLUDED.byte_size,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'media_id', v_row.id,
    'registration_draft_id', v_row.registration_draft_id,
    'media_kind', v_row.media_kind,
    'file_name', v_row.file_name,
    'content_type', v_row.content_type,
    'byte_size', v_row.byte_size,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_registration_media_asset(p_media_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.registration_media;
BEGIN
  SELECT *
  INTO v_row
  FROM public.registration_media
  WHERE id = p_media_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'media_id', v_row.id,
    'registration_draft_id', v_row.registration_draft_id,
    'media_kind', v_row.media_kind,
    'file_name', v_row.file_name,
    'content_type', v_row.content_type,
    'byte_size', v_row.byte_size,
    'content_base64', encode(v_row.file_bytes, 'base64'),
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_registration_media_asset(
  p_registration_draft_id UUID,
  p_media_kind TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.registration_media
  WHERE registration_draft_id = p_registration_draft_id
    AND media_kind = p_media_kind;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_registration_media_asset(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_media_asset(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_registration_media_asset(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_approved_admission_media_to_student_information()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_information_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.student_information
  SET
    profile_photo_path = COALESCE(NEW.profile_photo_path, profile_photo_path),
    profile_photo_file_name = COALESCE(NEW.profile_photo_file_name, profile_photo_file_name),
    profile_photo_media_id = COALESCE(NEW.profile_photo_media_id, profile_photo_media_id),
    signature_path = COALESCE(NEW.signature_path, signature_path),
    signature_file_name = COALESCE(NEW.signature_file_name, signature_file_name),
    signature_media_id = COALESCE(NEW.signature_media_id, signature_media_id)
  WHERE id = NEW.student_information_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_student_information_media_from_admission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_admission RECORD;
BEGIN
  SELECT
    profile_photo_path,
    profile_photo_file_name,
    profile_photo_media_id,
    signature_path,
    signature_file_name,
    signature_media_id
  INTO source_admission
  FROM public.admission
  WHERE id = NEW.id
     OR student_information_id = NEW.id
  ORDER BY
    CASE WHEN student_information_id = NEW.id THEN 0 ELSE 1 END
  LIMIT 1;

  IF FOUND THEN
    NEW.profile_photo_path := COALESCE(source_admission.profile_photo_path, NEW.profile_photo_path);
    NEW.profile_photo_file_name := COALESCE(source_admission.profile_photo_file_name, NEW.profile_photo_file_name);
    NEW.profile_photo_media_id := COALESCE(source_admission.profile_photo_media_id, NEW.profile_photo_media_id);
    NEW.signature_path := COALESCE(source_admission.signature_path, NEW.signature_path);
    NEW.signature_file_name := COALESCE(source_admission.signature_file_name, NEW.signature_file_name);
    NEW.signature_media_id := COALESCE(source_admission.signature_media_id, NEW.signature_media_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_approved_admission_media_to_student_information ON public.admission;
CREATE TRIGGER sync_approved_admission_media_to_student_information
AFTER INSERT OR UPDATE OF
  student_information_id,
  profile_photo_path,
  profile_photo_file_name,
  profile_photo_media_id,
  signature_path,
  signature_file_name,
  signature_media_id
ON public.admission
FOR EACH ROW
EXECUTE FUNCTION public.sync_approved_admission_media_to_student_information();

DROP TRIGGER IF EXISTS sync_student_information_media_from_admission ON public.student_information;
CREATE TRIGGER sync_student_information_media_from_admission
BEFORE INSERT OR UPDATE ON public.student_information
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_information_media_from_admission();

CREATE OR REPLACE FUNCTION public.sync_admission_media_from_registration_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_verification RECORD;
BEGIN
  SELECT
    NULLIF(payload->>'profile_photo_path', '') AS profile_photo_path,
    NULLIF(payload->>'profile_photo_file_name', '') AS profile_photo_file_name,
    NULLIF(payload->>'profile_photo_media_id', '')::uuid AS profile_photo_media_id,
    NULLIF(payload->>'signature_path', '') AS signature_path,
    NULLIF(payload->>'signature_file_name', '') AS signature_file_name,
    NULLIF(payload->>'signature_media_id', '')::uuid AS signature_media_id
  INTO source_verification
  FROM public.registration_verifications
  WHERE id = NEW.id
  LIMIT 1;

  IF FOUND THEN
    NEW.profile_photo_path := COALESCE(NEW.profile_photo_path, source_verification.profile_photo_path);
    NEW.profile_photo_file_name := COALESCE(NEW.profile_photo_file_name, source_verification.profile_photo_file_name);
    NEW.profile_photo_media_id := COALESCE(NEW.profile_photo_media_id, source_verification.profile_photo_media_id);
    NEW.signature_path := COALESCE(NEW.signature_path, source_verification.signature_path);
    NEW.signature_file_name := COALESCE(NEW.signature_file_name, source_verification.signature_file_name);
    NEW.signature_media_id := COALESCE(NEW.signature_media_id, source_verification.signature_media_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_student_information_media_from_registration_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_verification RECORD;
BEGIN
  SELECT
    NULLIF(payload->>'profile_photo_path', '') AS profile_photo_path,
    NULLIF(payload->>'profile_photo_file_name', '') AS profile_photo_file_name,
    NULLIF(payload->>'profile_photo_media_id', '')::uuid AS profile_photo_media_id,
    NULLIF(payload->>'signature_path', '') AS signature_path,
    NULLIF(payload->>'signature_file_name', '') AS signature_file_name,
    NULLIF(payload->>'signature_media_id', '')::uuid AS signature_media_id
  INTO source_verification
  FROM public.registration_verifications
  WHERE id = NEW.id
  LIMIT 1;

  IF FOUND THEN
    NEW.profile_photo_path := COALESCE(NEW.profile_photo_path, source_verification.profile_photo_path);
    NEW.profile_photo_file_name := COALESCE(NEW.profile_photo_file_name, source_verification.profile_photo_file_name);
    NEW.profile_photo_media_id := COALESCE(NEW.profile_photo_media_id, source_verification.profile_photo_media_id);
    NEW.signature_path := COALESCE(NEW.signature_path, source_verification.signature_path);
    NEW.signature_file_name := COALESCE(NEW.signature_file_name, source_verification.signature_file_name);
    NEW.signature_media_id := COALESCE(NEW.signature_media_id, source_verification.signature_media_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_admission_media_from_registration_verification ON public.admission;
CREATE TRIGGER sync_admission_media_from_registration_verification
BEFORE INSERT OR UPDATE ON public.admission
FOR EACH ROW
EXECUTE FUNCTION public.sync_admission_media_from_registration_verification();

DROP TRIGGER IF EXISTS sync_student_information_media_from_registration_verification ON public.student_information;
CREATE TRIGGER sync_student_information_media_from_registration_verification
BEFORE INSERT OR UPDATE ON public.student_information
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_information_media_from_registration_verification();

UPDATE public.admission a
SET
  profile_photo_path = COALESCE(NULLIF(a.profile_photo_path, ''), NULLIF(rv.payload->>'profile_photo_path', '')),
  profile_photo_file_name = COALESCE(NULLIF(a.profile_photo_file_name, ''), NULLIF(rv.payload->>'profile_photo_file_name', '')),
  profile_photo_media_id = COALESCE(a.profile_photo_media_id, NULLIF(rv.payload->>'profile_photo_media_id', '')::uuid),
  signature_path = COALESCE(NULLIF(a.signature_path, ''), NULLIF(rv.payload->>'signature_path', '')),
  signature_file_name = COALESCE(NULLIF(a.signature_file_name, ''), NULLIF(rv.payload->>'signature_file_name', '')),
  signature_media_id = COALESCE(a.signature_media_id, NULLIF(rv.payload->>'signature_media_id', '')::uuid)
FROM public.registration_verifications rv
WHERE rv.id = a.id
  AND (rv.verified_at IS NOT NULL OR rv.used_at IS NOT NULL)
  AND (
    a.profile_photo_path IS NULL OR a.profile_photo_path = ''
    OR a.profile_photo_file_name IS NULL OR a.profile_photo_file_name = ''
    OR a.profile_photo_media_id IS NULL
    OR a.signature_path IS NULL OR a.signature_path = ''
    OR a.signature_file_name IS NULL OR a.signature_file_name = ''
    OR a.signature_media_id IS NULL
  );

UPDATE public.student_information si
SET
  profile_photo_path = COALESCE(NULLIF(si.profile_photo_path, ''), NULLIF(rv.payload->>'profile_photo_path', '')),
  profile_photo_file_name = COALESCE(NULLIF(si.profile_photo_file_name, ''), NULLIF(rv.payload->>'profile_photo_file_name', '')),
  profile_photo_media_id = COALESCE(si.profile_photo_media_id, NULLIF(rv.payload->>'profile_photo_media_id', '')::uuid),
  signature_path = COALESCE(NULLIF(si.signature_path, ''), NULLIF(rv.payload->>'signature_path', '')),
  signature_file_name = COALESCE(NULLIF(si.signature_file_name, ''), NULLIF(rv.payload->>'signature_file_name', '')),
  signature_media_id = COALESCE(si.signature_media_id, NULLIF(rv.payload->>'signature_media_id', '')::uuid)
FROM public.registration_verifications rv
WHERE rv.id = si.id
  AND (rv.verified_at IS NOT NULL OR rv.used_at IS NOT NULL)
  AND (
    si.profile_photo_path IS NULL OR si.profile_photo_path = ''
    OR si.profile_photo_file_name IS NULL OR si.profile_photo_file_name = ''
    OR si.profile_photo_media_id IS NULL
    OR si.signature_path IS NULL OR si.signature_path = ''
    OR si.signature_file_name IS NULL OR si.signature_file_name = ''
    OR si.signature_media_id IS NULL
  );
