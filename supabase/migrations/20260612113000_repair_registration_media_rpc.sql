CREATE TABLE IF NOT EXISTS public.registration_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_draft_id UUID NOT NULL,
  media_kind TEXT NOT NULL CHECK (media_kind IN ('profile_photo', 'signature')),
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_bytes BYTEA NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  processing_status TEXT NOT NULL DEFAULT 'ready',
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registration_draft_id, media_kind)
);

ALTER TABLE public.registration_media
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS processing_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registration_media_processing_status_check'
  ) THEN
    ALTER TABLE public.registration_media
      ADD CONSTRAINT registration_media_processing_status_check
      CHECK (processing_status IN ('processing', 'ready', 'error'));
  END IF;
END
$$;

ALTER TABLE public.registration_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_media REPLICA IDENTITY FULL;

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

UPDATE public.registration_media
SET
  processing_status = COALESCE(NULLIF(processing_status, ''), 'ready'),
  processing_error = NULLIF(processing_error, '');

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'registration_media'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registration_media;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END
$$;

CREATE OR REPLACE FUNCTION public.upsert_registration_media_asset(
  p_registration_draft_id UUID,
  p_media_kind TEXT,
  p_file_name TEXT,
  p_content_type TEXT,
  p_content_base64 TEXT,
  p_processing_status TEXT DEFAULT 'ready',
  p_processing_error TEXT DEFAULT NULL
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

  IF p_processing_status NOT IN ('processing', 'ready', 'error') THEN
    RAISE EXCEPTION 'Invalid processing status.';
  END IF;

  v_file_bytes := decode(replace(replace(p_content_base64, E'\n', ''), E'\r', ''), 'base64');

  INSERT INTO public.registration_media (
    registration_draft_id,
    media_kind,
    file_name,
    content_type,
    file_bytes,
    byte_size,
    processing_status,
    processing_error
  )
  VALUES (
    p_registration_draft_id,
    p_media_kind,
    p_file_name,
    p_content_type,
    v_file_bytes,
    octet_length(v_file_bytes),
    p_processing_status,
    NULLIF(btrim(COALESCE(p_processing_error, '')), '')
  )
  ON CONFLICT (registration_draft_id, media_kind) DO UPDATE
  SET
    file_name = EXCLUDED.file_name,
    content_type = EXCLUDED.content_type,
    file_bytes = EXCLUDED.file_bytes,
    byte_size = EXCLUDED.byte_size,
    processing_status = EXCLUDED.processing_status,
    processing_error = EXCLUDED.processing_error,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'media_id', v_row.id,
    'registration_draft_id', v_row.registration_draft_id,
    'media_kind', v_row.media_kind,
    'file_name', v_row.file_name,
    'content_type', v_row.content_type,
    'byte_size', v_row.byte_size,
    'processing_status', v_row.processing_status,
    'processing_error', v_row.processing_error,
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
    'processing_status', v_row.processing_status,
    'processing_error', v_row.processing_error,
    'content_base64', encode(v_row.file_bytes, 'base64'),
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_registration_media_asset_by_draft(
  p_registration_draft_id UUID,
  p_media_kind TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.registration_media;
BEGIN
  IF p_registration_draft_id IS NULL THEN
    RAISE EXCEPTION 'registration_draft_id is required.';
  END IF;

  IF p_media_kind NOT IN ('profile_photo', 'signature') THEN
    RAISE EXCEPTION 'Invalid media kind.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.registration_media
  WHERE registration_draft_id = p_registration_draft_id
    AND media_kind = p_media_kind
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
    'processing_status', v_row.processing_status,
    'processing_error', v_row.processing_error,
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

GRANT EXECUTE ON FUNCTION public.upsert_registration_media_asset(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_media_asset(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_media_asset_by_draft(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_registration_media_asset(UUID, TEXT) TO anon, authenticated;
