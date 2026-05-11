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
    NULLIF(payload->>'signature_path', '') AS signature_path,
    NULLIF(payload->>'signature_file_name', '') AS signature_file_name
  INTO source_verification
  FROM public.registration_verifications
  WHERE id = NEW.id
  LIMIT 1;

  IF FOUND THEN
    NEW.profile_photo_path := COALESCE(NULLIF(NEW.profile_photo_path, ''), source_verification.profile_photo_path);
    NEW.profile_photo_file_name := COALESCE(NULLIF(NEW.profile_photo_file_name, ''), source_verification.profile_photo_file_name);
    NEW.signature_path := COALESCE(NULLIF(NEW.signature_path, ''), source_verification.signature_path);
    NEW.signature_file_name := COALESCE(NULLIF(NEW.signature_file_name, ''), source_verification.signature_file_name);
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
    NULLIF(payload->>'signature_path', '') AS signature_path,
    NULLIF(payload->>'signature_file_name', '') AS signature_file_name
  INTO source_verification
  FROM public.registration_verifications
  WHERE id = NEW.id
  LIMIT 1;

  IF FOUND THEN
    NEW.profile_photo_path := COALESCE(NULLIF(NEW.profile_photo_path, ''), source_verification.profile_photo_path);
    NEW.profile_photo_file_name := COALESCE(NULLIF(NEW.profile_photo_file_name, ''), source_verification.profile_photo_file_name);
    NEW.signature_path := COALESCE(NULLIF(NEW.signature_path, ''), source_verification.signature_path);
    NEW.signature_file_name := COALESCE(NULLIF(NEW.signature_file_name, ''), source_verification.signature_file_name);
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
  signature_path = COALESCE(NULLIF(a.signature_path, ''), NULLIF(rv.payload->>'signature_path', '')),
  signature_file_name = COALESCE(NULLIF(a.signature_file_name, ''), NULLIF(rv.payload->>'signature_file_name', ''))
FROM public.registration_verifications rv
WHERE rv.id = a.id
  AND (rv.verified_at IS NOT NULL OR rv.used_at IS NOT NULL)
  AND (
    a.profile_photo_path IS NULL OR a.profile_photo_path = ''
    OR a.profile_photo_file_name IS NULL OR a.profile_photo_file_name = ''
    OR a.signature_path IS NULL OR a.signature_path = ''
    OR a.signature_file_name IS NULL OR a.signature_file_name = ''
  );

UPDATE public.student_information si
SET
  profile_photo_path = COALESCE(NULLIF(si.profile_photo_path, ''), NULLIF(rv.payload->>'profile_photo_path', '')),
  profile_photo_file_name = COALESCE(NULLIF(si.profile_photo_file_name, ''), NULLIF(rv.payload->>'profile_photo_file_name', '')),
  signature_path = COALESCE(NULLIF(si.signature_path, ''), NULLIF(rv.payload->>'signature_path', '')),
  signature_file_name = COALESCE(NULLIF(si.signature_file_name, ''), NULLIF(rv.payload->>'signature_file_name', ''))
FROM public.registration_verifications rv
WHERE rv.id = si.id
  AND (rv.verified_at IS NOT NULL OR rv.used_at IS NOT NULL)
  AND (
    si.profile_photo_path IS NULL OR si.profile_photo_path = ''
    OR si.profile_photo_file_name IS NULL OR si.profile_photo_file_name = ''
    OR si.signature_path IS NULL OR si.signature_path = ''
    OR si.signature_file_name IS NULL OR si.signature_file_name = ''
  );
