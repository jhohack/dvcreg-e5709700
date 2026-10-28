-- Compatibility for already-deployed clients. New clients use the five-argument
-- suffix-aware overload created by 20261028052500_add_student_suffix.sql.
CREATE OR REPLACE FUNCTION public.registration_full_name_exists(
  p_first_name TEXT,
  p_middle_name TEXT,
  p_last_name TEXT,
  p_date_of_birth DATE
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.registration_full_name_exists(
    p_first_name,
    p_middle_name,
    p_last_name,
    '',
    p_date_of_birth
  );
$$;

CREATE OR REPLACE FUNCTION public.registration_full_name_exists(
  p_first_name TEXT,
  p_middle_name TEXT,
  p_last_name TEXT
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
      lower(regexp_replace(btrim(coalesce(p_last_name, '')), '\s+', ' ', 'g')) AS last_name
  ),
  all_names AS (
    SELECT first_name, middle_name, last_name FROM public.admission
    UNION ALL
    SELECT first_name, middle_name, last_name FROM public.student_information
  )
  SELECT CASE
    WHEN i.first_name = '' OR i.middle_name = '' OR i.last_name = '' THEN false
    ELSE EXISTS (
      SELECT 1
      FROM all_names n
      WHERE lower(regexp_replace(btrim(n.first_name), '\s+', ' ', 'g')) = i.first_name
        AND (
          replace(lower(regexp_replace(btrim(coalesce(n.middle_name, '')), '\s+', ' ', 'g')), '.', '') = i.middle_name
          OR (
            length(replace(lower(regexp_replace(btrim(coalesce(n.middle_name, '')), '\s+', ' ', 'g')), '.', '')) = 1
            AND i.middle_name LIKE replace(lower(regexp_replace(btrim(coalesce(n.middle_name, '')), '\s+', ' ', 'g')), '.', '') || '%'
          )
          OR (
            length(i.middle_name) = 1
            AND replace(lower(regexp_replace(btrim(coalesce(n.middle_name, '')), '\s+', ' ', 'g')), '.', '') LIKE i.middle_name || '%'
          )
        )
        AND lower(regexp_replace(btrim(n.last_name), '\s+', ' ', 'g')) = i.last_name
    )
  END
  FROM input_name i;
$$;

REVOKE ALL ON FUNCTION public.registration_full_name_exists(TEXT, TEXT, TEXT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registration_full_name_exists(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_full_name_exists(TEXT, TEXT, TEXT, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registration_full_name_exists(TEXT, TEXT, TEXT) TO anon, authenticated;
