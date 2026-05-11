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
    signature_path = COALESCE(NEW.signature_path, signature_path),
    signature_file_name = COALESCE(NEW.signature_file_name, signature_file_name)
  WHERE id = NEW.student_information_id
    AND (
      profile_photo_path IS DISTINCT FROM COALESCE(NEW.profile_photo_path, profile_photo_path)
      OR profile_photo_file_name IS DISTINCT FROM COALESCE(NEW.profile_photo_file_name, profile_photo_file_name)
      OR signature_path IS DISTINCT FROM COALESCE(NEW.signature_path, signature_path)
      OR signature_file_name IS DISTINCT FROM COALESCE(NEW.signature_file_name, signature_file_name)
    );

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
    signature_path,
    signature_file_name
  INTO source_admission
  FROM public.admission
  WHERE id = NEW.id
     OR student_information_id = NEW.id
  ORDER BY (id = NEW.id) DESC
  LIMIT 1;

  IF FOUND THEN
    NEW.profile_photo_path := COALESCE(source_admission.profile_photo_path, NEW.profile_photo_path);
    NEW.profile_photo_file_name := COALESCE(source_admission.profile_photo_file_name, NEW.profile_photo_file_name);
    NEW.signature_path := COALESCE(source_admission.signature_path, NEW.signature_path);
    NEW.signature_file_name := COALESCE(source_admission.signature_file_name, NEW.signature_file_name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_approved_admission_media_to_student_information ON public.admission;
CREATE TRIGGER sync_approved_admission_media_to_student_information
AFTER INSERT OR UPDATE OF student_information_id, profile_photo_path, profile_photo_file_name, signature_path, signature_file_name ON public.admission
FOR EACH ROW
EXECUTE FUNCTION public.sync_approved_admission_media_to_student_information();

DROP TRIGGER IF EXISTS sync_student_information_media_from_admission ON public.student_information;
CREATE TRIGGER sync_student_information_media_from_admission
BEFORE INSERT OR UPDATE ON public.student_information
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_information_media_from_admission();

UPDATE public.student_information si
SET
  profile_photo_path = COALESCE(a.profile_photo_path, si.profile_photo_path),
  profile_photo_file_name = COALESCE(a.profile_photo_file_name, si.profile_photo_file_name),
  signature_path = COALESCE(a.signature_path, si.signature_path),
  signature_file_name = COALESCE(a.signature_file_name, si.signature_file_name)
FROM public.admission a
WHERE (a.student_information_id = si.id OR a.id = si.id)
  AND (
    si.profile_photo_path IS DISTINCT FROM COALESCE(a.profile_photo_path, si.profile_photo_path)
    OR si.profile_photo_file_name IS DISTINCT FROM COALESCE(a.profile_photo_file_name, si.profile_photo_file_name)
    OR si.signature_path IS DISTINCT FROM COALESCE(a.signature_path, si.signature_path)
    OR si.signature_file_name IS DISTINCT FROM COALESCE(a.signature_file_name, si.signature_file_name)
  );
