CREATE TABLE IF NOT EXISTS public.admission (
  LIKE public.student_information INCLUDING ALL
);

ALTER TABLE public.admission ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admission'
      AND policyname = 'Allow public insert'
  ) THEN
    CREATE POLICY "Allow public insert"
      ON public.admission
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admission'
      AND policyname = 'Allow authenticated read'
  ) THEN
    CREATE POLICY "Allow authenticated read"
      ON public.admission
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

INSERT INTO public.admission
SELECT *
FROM public.student_information
ON CONFLICT (id) DO NOTHING;
