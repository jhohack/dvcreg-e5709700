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

function normalizeNamePart(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase()
}

function normalizeMiddleNamePart(value: unknown): string {
  return normalizeNamePart(value).replaceAll(".", "")
}

function middleNameMatches(storedMiddleName: string, inputMiddleName: string): boolean {
  return storedMiddleName === inputMiddleName ||
    (storedMiddleName.length === 1 && inputMiddleName.startsWith(storedMiddleName)) ||
    (inputMiddleName.length === 1 && storedMiddleName.startsWith(inputMiddleName))
}

function normalizeBirthdate(value: unknown): string {
  const raw = String(value ?? "").trim()
  if (!raw) {
    return ""
  }

  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : raw
}

export async function admissionFullNameExists(
  client: ReturnType<typeof createServiceRoleClient>,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const firstName = normalizeNamePart(payload.first_name)
  const middleName = normalizeMiddleNamePart(payload.middle_name)
  const lastName = normalizeNamePart(payload.last_name)
  const birthdate = normalizeBirthdate(payload.date_of_birth)

  if (!firstName || !middleName || !lastName || !birthdate) {
    return false
  }

  const fullNameExistsInTable = async (table: "admission" | "student_information") => {
    const { data, error } = await client
      .from(table)
      .select("id, first_name, middle_name, last_name, date_of_birth")
      .ilike("first_name", firstName)
      .ilike("last_name", lastName)
      .eq("date_of_birth", birthdate)
      .limit(25)

    if (error) {
      throw new Error("Could not check for an existing registration. Please try again.")
    }

    return (data ?? []).some((row) =>
      normalizeNamePart(row.first_name) === firstName &&
      middleNameMatches(normalizeMiddleNamePart(row.middle_name), middleName) &&
      normalizeNamePart(row.last_name) === lastName &&
      normalizeBirthdate(row.date_of_birth) === birthdate
    )
  }

  return await fullNameExistsInTable("admission") || await fullNameExistsInTable("student_information")
}

function isMissingAcademicColumnsError(message: string): boolean {
  return message.includes("column admission.education_level does not exist")
    || message.includes("column admission.program does not exist")
    || message.includes("column admission.level does not exist")
    || message.includes("column admission.profile_photo_path does not exist")
    || message.includes("column admission.profile_photo_file_name does not exist")
    || message.includes("column admission.profile_photo_media_id does not exist")
    || message.includes("column admission.signature_path does not exist")
    || message.includes("column admission.signature_file_name does not exist")
    || message.includes("column admission.signature_media_id does not exist")
    || message.includes("could not find the 'education_level' column")
    || message.includes("could not find the 'program' column")
    || message.includes("could not find the 'level' column")
    || message.includes("could not find the 'profile_photo_path' column")
    || message.includes("could not find the 'profile_photo_file_name' column")
    || message.includes("could not find the 'profile_photo_media_id' column")
    || message.includes("could not find the 'signature_path' column")
    || message.includes("could not find the 'signature_file_name' column")
    || message.includes("could not find the 'signature_media_id' column")
}

function isDuplicateFullNameError(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" && (error.message ?? "").includes("admission_unique_normalized_full_name_idx")
}

export async function insertAdmissionPayloads(
  client: ReturnType<typeof createServiceRoleClient>,
  id: string,
  payload: Record<string, unknown>,
  legacyPayload: Record<string, unknown>,
): Promise<void> {
  const primaryPayload = { ...payload, id }
  const fallbackPayload = { ...legacyPayload, id }

  if (await admissionFullNameExists(client, primaryPayload)) {
    throw new Error("This full name is already registered.")
  }

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

  if (isDuplicateFullNameError(primaryInsert.error)) {
    throw new Error("This full name is already registered.")
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

    if (isDuplicateFullNameError(fallbackInsert.error)) {
      throw new Error("This full name is already registered.")
    }
  }

  throw new Error("Verification succeeded, but saving the registration failed.")
}
