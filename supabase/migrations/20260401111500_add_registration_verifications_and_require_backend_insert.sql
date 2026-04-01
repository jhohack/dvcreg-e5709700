CREATE TABLE IF NOT EXISTS public.registration_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  payload JSONB NOT NULL,
  legacy_payload JSONB NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  resend_count INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_verifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_registration_verifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_registration_verifications_updated_at ON public.registration_verifications;
CREATE TRIGGER touch_registration_verifications_updated_at
BEFORE UPDATE ON public.registration_verifications
FOR EACH ROW
EXECUTE FUNCTION public.touch_registration_verifications_updated_at();

CREATE INDEX IF NOT EXISTS registration_verifications_email_idx
  ON public.registration_verifications (email);

CREATE INDEX IF NOT EXISTS registration_verifications_expires_at_idx
  ON public.registration_verifications (expires_at);

DROP POLICY IF EXISTS "Allow public insert" ON public.admission;
DROP POLICY IF EXISTS "Allow public insert on admission" ON public.admission;
