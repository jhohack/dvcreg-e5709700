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
    'content_base64', encode(v_row.file_bytes, 'base64'),
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_registration_media_asset_by_draft(UUID, TEXT) TO anon, authenticated;
