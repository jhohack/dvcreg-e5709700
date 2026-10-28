ALTER TABLE public.admission
  ADD COLUMN IF NOT EXISTS permanent_street_address text,
  ADD COLUMN IF NOT EXISTS permanent_barangay text,
  ADD COLUMN IF NOT EXISTS permanent_city_municipality text,
  ADD COLUMN IF NOT EXISTS permanent_province text,
  ADD COLUMN IF NOT EXISTS permanent_postal_code text,
  ADD COLUMN IF NOT EXISTS current_street_address text,
  ADD COLUMN IF NOT EXISTS current_barangay text,
  ADD COLUMN IF NOT EXISTS current_city_municipality text,
  ADD COLUMN IF NOT EXISTS current_province text,
  ADD COLUMN IF NOT EXISTS current_postal_code text;

ALTER TABLE public.student_information
  ADD COLUMN IF NOT EXISTS permanent_street_address text,
  ADD COLUMN IF NOT EXISTS permanent_barangay text,
  ADD COLUMN IF NOT EXISTS permanent_city_municipality text,
  ADD COLUMN IF NOT EXISTS permanent_province text,
  ADD COLUMN IF NOT EXISTS permanent_postal_code text,
  ADD COLUMN IF NOT EXISTS current_street_address text,
  ADD COLUMN IF NOT EXISTS current_barangay text,
  ADD COLUMN IF NOT EXISTS current_city_municipality text,
  ADD COLUMN IF NOT EXISTS current_province text,
  ADD COLUMN IF NOT EXISTS current_postal_code text;

CREATE OR REPLACE FUNCTION public.format_structured_student_address(
  street_address_input text,
  barangay_input text,
  city_municipality_input text,
  province_input text,
  postal_code_input text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT array_to_string(
    array_remove(
      ARRAY[
        NULLIF(regexp_replace(btrim(COALESCE(street_address_input, '')), '\s+', ' ', 'g'), ''),
        CASE
          WHEN NULLIF(btrim(COALESCE(barangay_input, '')), '') IS NULL THEN NULL
          ELSE 'Barangay ' || regexp_replace(
            regexp_replace(btrim(barangay_input), '^barangay\s+', '', 'i'),
            '\s+', ' ', 'g'
          )
        END,
        NULLIF(regexp_replace(btrim(COALESCE(city_municipality_input, '')), '\s+', ' ', 'g'), ''),
        NULLIF(regexp_replace(btrim(COALESCE(province_input, '')), '\s+', ' ', 'g'), ''),
        NULLIF(regexp_replace(btrim(COALESCE(postal_code_input, '')), '\s+', ' ', 'g'), '')
      ],
      NULL
    ),
    ', '
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_structured_student_addresses()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(
    NULLIF(btrim(NEW.permanent_street_address), ''),
    NULLIF(btrim(NEW.permanent_barangay), ''),
    NULLIF(btrim(NEW.permanent_city_municipality), ''),
    NULLIF(btrim(NEW.permanent_province), ''),
    NULLIF(btrim(NEW.permanent_postal_code), '')
  ) IS NOT NULL THEN
    NEW.address := public.format_structured_student_address(
      NEW.permanent_street_address,
      NEW.permanent_barangay,
      NEW.permanent_city_municipality,
      NEW.permanent_province,
      NEW.permanent_postal_code
    );
  END IF;

  IF COALESCE(
    NULLIF(btrim(NEW.current_street_address), ''),
    NULLIF(btrim(NEW.current_barangay), ''),
    NULLIF(btrim(NEW.current_city_municipality), ''),
    NULLIF(btrim(NEW.current_province), ''),
    NULLIF(btrim(NEW.current_postal_code), '')
  ) IS NOT NULL THEN
    NEW.current_address := public.format_structured_student_address(
      NEW.current_street_address,
      NEW.current_barangay,
      NEW.current_city_municipality,
      NEW.current_province,
      NEW.current_postal_code
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.copy_admission_structured_addresses_to_student()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admission AS a WHERE a.id = NEW.id) THEN
    SELECT
    a.permanent_street_address,
    a.permanent_barangay,
    a.permanent_city_municipality,
    a.permanent_province,
    a.permanent_postal_code,
    a.current_street_address,
    a.current_barangay,
    a.current_city_municipality,
    a.current_province,
    a.current_postal_code
  INTO
    NEW.permanent_street_address,
    NEW.permanent_barangay,
    NEW.permanent_city_municipality,
    NEW.permanent_province,
    NEW.permanent_postal_code,
    NEW.current_street_address,
    NEW.current_barangay,
    NEW.current_city_municipality,
    NEW.current_province,
    NEW.current_postal_code
  FROM public.admission AS a
    WHERE a.id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.copy_routed_student_structured_addresses_to_admission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.admission
  SET
    permanent_street_address = NEW.permanent_street_address,
    permanent_barangay = NEW.permanent_barangay,
    permanent_city_municipality = NEW.permanent_city_municipality,
    permanent_province = NEW.permanent_province,
    permanent_postal_code = NEW.permanent_postal_code,
    current_street_address = NEW.current_street_address,
    current_barangay = NEW.current_barangay,
    current_city_municipality = NEW.current_city_municipality,
    current_province = NEW.current_province,
    current_postal_code = NEW.current_postal_code
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_admission_structured_addresses ON public.admission;
CREATE TRIGGER normalize_admission_structured_addresses
BEFORE INSERT OR UPDATE ON public.admission
FOR EACH ROW EXECUTE FUNCTION public.normalize_structured_student_addresses();

DROP TRIGGER IF EXISTS copy_admission_structured_addresses_to_student ON public.student_information;
CREATE TRIGGER copy_admission_structured_addresses_to_student
BEFORE INSERT ON public.student_information
FOR EACH ROW EXECUTE FUNCTION public.copy_admission_structured_addresses_to_student();

DROP TRIGGER IF EXISTS normalize_student_structured_addresses ON public.student_information;
CREATE TRIGGER normalize_student_structured_addresses
BEFORE INSERT OR UPDATE ON public.student_information
FOR EACH ROW EXECUTE FUNCTION public.normalize_structured_student_addresses();

-- Runs after trg_route_student_information_insert_to_admission alphabetically.
-- For approved admissions there is no matching admission row to update, so this is a no-op.
DROP TRIGGER IF EXISTS zz_copy_routed_student_structured_addresses ON public.student_information;
CREATE TRIGGER zz_copy_routed_student_structured_addresses
AFTER INSERT ON public.student_information
FOR EACH ROW EXECUTE FUNCTION public.copy_routed_student_structured_addresses_to_admission();

COMMENT ON COLUMN public.admission.address IS
  'Compatibility display address. Structured permanent address columns are authoritative when populated.';
COMMENT ON COLUMN public.admission.current_address IS
  'Compatibility display address. Structured current address columns are authoritative when populated.';
COMMENT ON COLUMN public.student_information.address IS
  'Compatibility display address. Structured permanent address columns are authoritative when populated.';
COMMENT ON COLUMN public.student_information.current_address IS
  'Compatibility display address. Structured current address columns are authoritative when populated.';
