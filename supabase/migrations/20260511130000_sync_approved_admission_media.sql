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
    profile_photo_path = NEW.profile_photo_path,
    profile_photo_file_name = NEW.profile_photo_file_name,
    signature_path = NEW.signature_path,
    signature_file_name = NEW.signature_file_name
  WHERE id = NEW.student_information_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_approved_admission_media_to_student_information ON public.admission;
CREATE TRIGGER sync_approved_admission_media_to_student_information
AFTER INSERT OR UPDATE OF student_information_id, profile_photo_path, profile_photo_file_name, signature_path, signature_file_name ON public.admission
FOR EACH ROW
EXECUTE FUNCTION public.sync_approved_admission_media_to_student_information();

UPDATE public.student_information si
SET
  profile_photo_path = a.profile_photo_path,
  profile_photo_file_name = a.profile_photo_file_name,
  signature_path = a.signature_path,
  signature_file_name = a.signature_file_name
FROM public.admission a
WHERE a.student_information_id = si.id
  AND (
    si.profile_photo_path IS DISTINCT FROM a.profile_photo_path
    OR si.profile_photo_file_name IS DISTINCT FROM a.profile_photo_file_name
    OR si.signature_path IS DISTINCT FROM a.signature_path
    OR si.signature_file_name IS DISTINCT FROM a.signature_file_name
  );
