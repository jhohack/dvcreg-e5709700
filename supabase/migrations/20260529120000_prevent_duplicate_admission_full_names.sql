CREATE INDEX IF NOT EXISTS admission_normalized_full_name_idx
  ON public.admission (
    lower(regexp_replace(btrim(first_name), '\s+', ' ', 'g')),
    replace(lower(regexp_replace(btrim(coalesce(middle_name, '')), '\s+', ' ', 'g')), '.', ''),
    lower(regexp_replace(btrim(last_name), '\s+', ' ', 'g')),
    date_of_birth
  );

CREATE INDEX IF NOT EXISTS student_information_normalized_full_name_idx
  ON public.student_information (
    lower(regexp_replace(btrim(first_name), '\s+', ' ', 'g')),
    replace(lower(regexp_replace(btrim(coalesce(middle_name, '')), '\s+', ' ', 'g')), '.', ''),
    lower(regexp_replace(btrim(last_name), '\s+', ' ', 'g')),
    date_of_birth
  );

CREATE OR REPLACE FUNCTION public.registration_full_name_exists(
  p_first_name TEXT,
  p_middle_name TEXT,
  p_last_name TEXT,
  p_date_of_birth DATE
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input_name AS (
    SELECT
      lower(regexp_replace(btrim(coalesce(p_first_name, '')), '\s+', ' ', 'g')) AS first_name,
      replace(lower(regexp_replace(btrim(coalesce(p_middle_name, '')), '\s+', ' ', 'g')), '.', '') AS middle_name,
      lower(regexp_replace(btrim(coalesce(p_last_name, '')), '\s+', ' ', 'g')) AS last_name,
      p_date_of_birth AS date_of_birth
  ),
  admission_names AS (
    SELECT
      lower(regexp_replace(btrim(first_name), '\s+', ' ', 'g')) AS first_name,
      replace(lower(regexp_replace(btrim(coalesce(middle_name, '')), '\s+', ' ', 'g')), '.', '') AS middle_name,
      lower(regexp_replace(btrim(last_name), '\s+', ' ', 'g')) AS last_name,
      date_of_birth
    FROM public.admission
  ),
  student_names AS (
    SELECT
      lower(regexp_replace(btrim(first_name), '\s+', ' ', 'g')) AS first_name,
      replace(lower(regexp_replace(btrim(coalesce(middle_name, '')), '\s+', ' ', 'g')), '.', '') AS middle_name,
      lower(regexp_replace(btrim(last_name), '\s+', ' ', 'g')) AS last_name,
      date_of_birth
    FROM public.student_information
  )
  SELECT CASE
    WHEN first_name = '' OR middle_name = '' OR last_name = '' OR date_of_birth IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM admission_names a, input_name i
      WHERE a.first_name = i.first_name
        AND (
          a.middle_name = i.middle_name
          OR (length(a.middle_name) = 1 AND i.middle_name LIKE a.middle_name || '%')
          OR (length(i.middle_name) = 1 AND a.middle_name LIKE i.middle_name || '%')
        )
        AND a.last_name = i.last_name
        AND a.date_of_birth = i.date_of_birth
    )
    OR EXISTS (
      SELECT 1
      FROM student_names s, input_name i
      WHERE s.first_name = i.first_name
        AND (
          s.middle_name = i.middle_name
          OR (length(s.middle_name) = 1 AND i.middle_name LIKE s.middle_name || '%')
          OR (length(i.middle_name) = 1 AND s.middle_name LIKE i.middle_name || '%')
        )
        AND s.last_name = i.last_name
        AND s.date_of_birth = i.date_of_birth
    )
  END
  FROM input_name;
$$;

GRANT EXECUTE ON FUNCTION public.registration_full_name_exists(TEXT, TEXT, TEXT, DATE) TO anon, authenticated;
