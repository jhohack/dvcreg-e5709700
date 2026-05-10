import { createClient } from "npm:@supabase/supabase-js@2"
import { envValue, requireEnv } from "./env.ts"

export type VerificationRow = {
  id: string
  email: string
  payload: Record<string, unknown>
  legacy_payload: Record<string, unknown>
  code_hash: string
  expires_at: string
  attempt_count: number
  used_at: string | null
  verified_at: string | null
}

export function createServiceRoleClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function normalizedEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function generateVerificationCode(): string {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return String(values[0] % 1_000_000).padStart(6, "0")
}

function verificationPepper(): string {
  return envValue("VERIFICATION_CODE_PEPPER", "") ?? ""
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(hashBuffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
}

export async function hashVerificationCode(code: string): Promise<string> {
  return `sha256:${await sha256Hex(`${code}:${verificationPepper()}`)}`
}

export async function verifyCodeHash(code: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith("sha256:")) {
    return false
  }

  return storedHash === await hashVerificationCode(code)
}

export async function admissionExists(client: ReturnType<typeof createServiceRoleClient>, id: string): Promise<boolean> {
  const { data } = await client
    .from("admission")
    .select("id")
    .eq("id", id)
    .maybeSingle()

  return Boolean(data)
}

function isMissingAcademicColumnsError(message: string): boolean {
  return message.includes("column admission.education_level does not exist")
    || message.includes("column admission.program does not exist")
    || message.includes("column admission.level does not exist")
    || message.includes("column admission.profile_photo_path does not exist")
    || message.includes("column admission.profile_photo_file_name does not exist")
    || message.includes("column admission.signature_path does not exist")
    || message.includes("column admission.signature_file_name does not exist")
    || message.includes("could not find the 'education_level' column")
    || message.includes("could not find the 'program' column")
    || message.includes("could not find the 'level' column")
    || message.includes("could not find the 'profile_photo_path' column")
    || message.includes("could not find the 'profile_photo_file_name' column")
    || message.includes("could not find the 'signature_path' column")
    || message.includes("could not find the 'signature_file_name' column")
}

export async function insertAdmissionPayloads(
  client: ReturnType<typeof createServiceRoleClient>,
  id: string,
  payload: Record<string, unknown>,
  legacyPayload: Record<string, unknown>,
): Promise<void> {
  const primaryPayload = { ...payload, id }
  const fallbackPayload = { ...legacyPayload, id }

  const primaryInsert = await client
    .from("admission")
    .insert(primaryPayload)
    .select("id")
    .maybeSingle()

  if (!primaryInsert.error) {
    return
  }

  if ((primaryInsert.status === 409 || primaryInsert.error.code === "23505") && await admissionExists(client, id)) {
    return
  }

  if (isMissingAcademicColumnsError(primaryInsert.error.message)) {
    const fallbackInsert = await client
      .from("admission")
      .insert(fallbackPayload)
      .select("id")
      .maybeSingle()

    if (!fallbackInsert.error) {
      return
    }

    if ((fallbackInsert.status === 409 || fallbackInsert.error.code === "23505") && await admissionExists(client, id)) {
      return
    }
  }

  throw new Error("Verification succeeded, but saving the registration failed.")
}
