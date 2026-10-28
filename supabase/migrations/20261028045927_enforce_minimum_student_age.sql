-- Preserve historical rows for registrar review while rejecting invalid new writes.
ALTER TABLE public.student_information
  ADD CONSTRAINT student_information_minimum_age_check
  CHECK (date_of_birth IS NULL OR date_of_birth <= (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date - INTERVAL '15 years')::date))
  NOT VALID;

ALTER TABLE public.admission
  ADD CONSTRAINT admission_minimum_age_check
  CHECK (date_of_birth IS NULL OR date_of_birth <= (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date - INTERVAL '15 years')::date))
  NOT VALID;

-- Audit only; the correct year must be confirmed rather than guessed.
-- SELECT id, first_name, middle_name, last_name, date_of_birth
-- FROM public.admission
-- WHERE date_of_birth > (((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date - INTERVAL '15 years')::date)
-- ORDER BY date_of_birth DESC, last_name, first_name;
