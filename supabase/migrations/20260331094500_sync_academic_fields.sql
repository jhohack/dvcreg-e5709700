ALTER TABLE IF EXISTS public.student_information
  ADD COLUMN IF NOT EXISTS education_level TEXT,
  ADD COLUMN IF NOT EXISTS program TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT;

ALTER TABLE IF EXISTS public.admission
  ADD COLUMN IF NOT EXISTS education_level TEXT,
  ADD COLUMN IF NOT EXISTS program TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT;

CREATE OR REPLACE FUNCTION public.normalize_education_level_code(raw_value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(raw_value, '')))
    WHEN '' THEN NULL
    WHEN 'college' THEN 'college'
    WHEN 'shs' THEN 'shs'
    WHEN 'senior high school' THEN 'shs'
    ELSE lower(trim(raw_value))
  END
$$;

CREATE OR REPLACE FUNCTION public.normalize_education_level_label(raw_value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE public.normalize_education_level_code(raw_value)
    WHEN 'college' THEN 'College'
    WHEN 'shs' THEN 'Senior High School'
    ELSE NULLIF(trim(raw_value), '')
  END
$$;

CREATE OR REPLACE FUNCTION public.sync_academic_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_education_level TEXT;
  resolved_program TEXT;
  resolved_level TEXT;
BEGIN
  resolved_education_level := COALESCE(
    public.normalize_education_level_code(NEW.education_level),
    public.normalize_education_level_code(NEW.department)
  );
  resolved_program := COALESCE(NULLIF(btrim(NEW.program), ''), NULLIF(btrim(NEW.course), ''), NULLIF(btrim(NEW.shs_track), ''));
  resolved_level := COALESCE(NULLIF(btrim(NEW.level), ''), NULLIF(btrim(NEW.year_level), ''));

  NEW.education_level := resolved_education_level;
  NEW.program := resolved_program;
  NEW.level := resolved_level;
  NEW.department := public.normalize_education_level_label(resolved_education_level);
  NEW.year_level := resolved_level;

  IF resolved_education_level = 'college' THEN
    NEW.course := resolved_program;
    NEW.shs_track := NULL;
  ELSIF resolved_education_level = 'shs' THEN
    NEW.course := NULL;
    NEW.shs_track := resolved_program;
  ELSIF resolved_program IS NOT NULL THEN
    NEW.course := COALESCE(NULLIF(btrim(NEW.course), ''), resolved_program);
    NEW.shs_track := COALESCE(NULLIF(btrim(NEW.shs_track), ''), resolved_program);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_student_information_academic_fields ON public.student_information;
CREATE TRIGGER sync_student_information_academic_fields
BEFORE INSERT OR UPDATE ON public.student_information
FOR EACH ROW
EXECUTE FUNCTION public.sync_academic_fields();

DROP TRIGGER IF EXISTS sync_admission_academic_fields ON public.admission;
CREATE TRIGGER sync_admission_academic_fields
BEFORE INSERT OR UPDATE ON public.admission
FOR EACH ROW
EXECUTE FUNCTION public.sync_academic_fields();

UPDATE public.student_information
SET
  education_level = COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)),
  program = COALESCE(NULLIF(btrim(program), ''), NULLIF(btrim(course), ''), NULLIF(btrim(shs_track), '')),
  level = COALESCE(NULLIF(btrim(level), ''), NULLIF(btrim(year_level), '')),
  department = public.normalize_education_level_label(COALESCE(education_level, department)),
  year_level = COALESCE(NULLIF(btrim(level), ''), NULLIF(btrim(year_level), '')),
  course = CASE
    WHEN COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)) = 'college'
      THEN COALESCE(NULLIF(btrim(program), ''), NULLIF(btrim(course), ''), NULLIF(btrim(shs_track), ''))
    WHEN COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)) = 'shs'
      THEN NULL
    ELSE course
  END,
  shs_track = CASE
    WHEN COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)) = 'shs'
      THEN COALESCE(NULLIF(btrim(program), ''), NULLIF(btrim(course), ''), NULLIF(btrim(shs_track), ''))
    WHEN COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)) = 'college'
      THEN NULL
    ELSE shs_track
  END;

UPDATE public.admission
SET
  education_level = COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)),
  program = COALESCE(NULLIF(btrim(program), ''), NULLIF(btrim(course), ''), NULLIF(btrim(shs_track), '')),
  level = COALESCE(NULLIF(btrim(level), ''), NULLIF(btrim(year_level), '')),
  department = public.normalize_education_level_label(COALESCE(education_level, department)),
  year_level = COALESCE(NULLIF(btrim(level), ''), NULLIF(btrim(year_level), '')),
  course = CASE
    WHEN COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)) = 'college'
      THEN COALESCE(NULLIF(btrim(program), ''), NULLIF(btrim(course), ''), NULLIF(btrim(shs_track), ''))
    WHEN COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)) = 'shs'
      THEN NULL
    ELSE course
  END,
  shs_track = CASE
    WHEN COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)) = 'shs'
      THEN COALESCE(NULLIF(btrim(program), ''), NULLIF(btrim(course), ''), NULLIF(btrim(shs_track), ''))
    WHEN COALESCE(public.normalize_education_level_code(education_level), public.normalize_education_level_code(department)) = 'college'
      THEN NULL
    ELSE shs_track
  END;
