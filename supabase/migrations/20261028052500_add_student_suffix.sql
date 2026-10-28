ALTER TABLE public.admission
  ADD COLUMN IF NOT EXISTS suffix TEXT;

ALTER TABLE public.student_information
  ADD COLUMN IF NOT EXISTS suffix TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.admission'::regclass
      AND conname IN ('admission_suffix_allowed', 'admission_suffix_check')
  ) THEN
    ALTER TABLE public.admission
      ADD CONSTRAINT admission_suffix_check
      CHECK (suffix IS NULL OR suffix IN ('Jr.', 'Sr.', 'II', 'III', 'IV', 'V'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.student_information'::regclass
      AND conname IN ('student_information_suffix_allowed', 'student_information_suffix_check')
  ) THEN
    ALTER TABLE public.student_information
      ADD CONSTRAINT student_information_suffix_check
      CHECK (suffix IS NULL OR suffix IN ('Jr.', 'Sr.', 'II', 'III', 'IV', 'V'));
  END IF;
END
$$;

DROP INDEX IF EXISTS public.admission_normalized_full_name_idx;
CREATE INDEX admission_normalized_full_name_idx
  ON public.admission (
    lower(regexp_replace(btrim(first_name), '\s+', ' ', 'g')),
    replace(lower(regexp_replace(btrim(coalesce(middle_name, '')), '\s+', ' ', 'g')), '.', ''),
    lower(regexp_replace(btrim(last_name), '\s+', ' ', 'g')),
    lower(replace(btrim(coalesce(suffix, '')), '.', '')),
    date_of_birth
  );

DROP INDEX IF EXISTS public.student_information_normalized_full_name_idx;
CREATE INDEX student_information_normalized_full_name_idx
  ON public.student_information (
    lower(regexp_replace(btrim(first_name), '\s+', ' ', 'g')),
    replace(lower(regexp_replace(btrim(coalesce(middle_name, '')), '\s+', ' ', 'g')), '.', ''),
    lower(regexp_replace(btrim(last_name), '\s+', ' ', 'g')),
    lower(replace(btrim(coalesce(suffix, '')), '.', '')),
    date_of_birth
  );

DROP FUNCTION IF EXISTS public.registration_full_name_exists(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.registration_full_name_exists(TEXT, TEXT, TEXT, DATE);

CREATE FUNCTION public.registration_full_name_exists(
  p_first_name TEXT,
  p_middle_name TEXT,
  p_last_name TEXT,
  p_suffix TEXT,
  p_date_of_birth DATE
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input_name AS (
    SELECT
      lower(regexp_replace(btrim(coalesce(p_first_name, '')), '\s+', ' ', 'g')) AS first_name,
      replace(lower(regexp_replace(btrim(coalesce(p_middle_name, '')), '\s+', ' ', 'g')), '.', '') AS middle_name,
      lower(regexp_replace(btrim(coalesce(p_last_name, '')), '\s+', ' ', 'g')) AS last_name,
      lower(replace(btrim(coalesce(p_suffix, '')), '.', '')) AS suffix,
      p_date_of_birth AS date_of_birth
  ),
  all_names AS (
    SELECT first_name, middle_name, last_name, suffix, date_of_birth FROM public.admission
    UNION ALL
    SELECT first_name, middle_name, last_name, suffix, date_of_birth FROM public.student_information
  ),
  normalized_names AS (
    SELECT
      lower(regexp_replace(btrim(first_name), '\s+', ' ', 'g')) AS first_name,
      replace(lower(regexp_replace(btrim(coalesce(middle_name, '')), '\s+', ' ', 'g')), '.', '') AS middle_name,
      lower(regexp_replace(btrim(last_name), '\s+', ' ', 'g')) AS last_name,
      lower(replace(btrim(coalesce(suffix, '')), '.', '')) AS suffix,
      date_of_birth
    FROM all_names
  )
  SELECT CASE
    WHEN i.first_name = '' OR i.middle_name = '' OR i.last_name = '' OR i.date_of_birth IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM normalized_names n
      WHERE n.first_name = i.first_name
        AND (
          n.middle_name = i.middle_name
          OR (length(n.middle_name) = 1 AND i.middle_name LIKE n.middle_name || '%')
          OR (length(i.middle_name) = 1 AND n.middle_name LIKE i.middle_name || '%')
        )
        AND n.last_name = i.last_name
        AND n.suffix = i.suffix
        AND n.date_of_birth = i.date_of_birth
    )
  END
  FROM input_name i;
$$;

REVOKE ALL ON FUNCTION public.registration_full_name_exists(TEXT, TEXT, TEXT, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_full_name_exists(TEXT, TEXT, TEXT, TEXT, DATE) TO anon, authenticated;
