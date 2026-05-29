import { errorResponse, jsonInput, jsonResponse, corsHeaders } from "../_shared/http.ts"
import {
  admissionExists,
  createServiceRoleClient,
  insertAdmissionPayloads,
  verifyCodeHash,
} from "../_shared/verification.ts"

async function verifyStoredVerificationCode(code: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("sha256:")) {
    return await verifyCodeHash(code, storedHash)
  }

  if (storedHash.startsWith("$2")) {
    const { compareSync } = await import("npm:bcryptjs@2.4.3")
    return compareSync(code, storedHash)
  }

  return false
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405)
  }

  try {
    const input = await jsonInput(request)
    const verificationId = String(input.verificationId ?? "").trim()
    const code = String(input.code ?? "").replace(/\D+/g, "")

    if (verificationId === "" || !/^[0-9]{6}$/.test(code)) {
      return errorResponse("Enter the 6-digit verification code.", 422)
    }

    const client = createServiceRoleClient()
    const { data: storedRecord, error } = await client
      .from("registration_verifications")
      .select("*")
      .eq("id", verificationId)
      .maybeSingle()

    if (error) {
      return errorResponse("Verification service error. Please try again in a moment.", 500)
    }

    if (!storedRecord) {
      return errorResponse("Verification request not found. Please request a new code.", 404)
    }

    if (storedRecord.used_at || storedRecord.verified_at) {
      if (await admissionExists(client, verificationId)) {
        return jsonResponse({ ok: true, alreadyVerified: true })
      }
    }

    const isUsableRequest = (requestRecord: typeof storedRecord): boolean => {
      if (requestRecord.used_at || requestRecord.verified_at) {
        return false
      }

      const candidateExpiresAt = Date.parse(String(requestRecord.expires_at ?? ""))
      if (!Number.isFinite(candidateExpiresAt) || candidateExpiresAt < Date.now()) {
        return false
      }

      return Number.parseInt(String(requestRecord.attempt_count ?? 0), 10) < 5
    }

    const storedCodeHash = String(storedRecord.code_hash ?? "")
    let record = isUsableRequest(storedRecord) && storedCodeHash !== "" && await verifyStoredVerificationCode(code, storedCodeHash)
      ? storedRecord
      : null

    if (!record) {
      const { data: activeRequests, error: activeRequestsError } = await client
        .from("registration_verifications")
        .select("*")
        .eq("email", String(storedRecord.email ?? ""))
        .is("used_at", null)
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10)

      if (activeRequestsError) {
        return errorResponse("Verification service error. Please try again in a moment.", 500)
      }

      for (const activeRequest of activeRequests ?? []) {
        if (activeRequest.id === storedRecord.id || !isUsableRequest(activeRequest)) {
          continue
        }

        const activeCodeHash = String(activeRequest.code_hash ?? "")
        if (activeCodeHash !== "" && await verifyStoredVerificationCode(code, activeCodeHash)) {
          record = activeRequest
          break
        }
      }
    }

    if (!record) {
      if (storedRecord.used_at || storedRecord.verified_at) {
        return errorResponse("This verification code has already been used.", 409)
      }

      const expiresAt = Date.parse(String(storedRecord.expires_at ?? ""))
      if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        return errorResponse("This verification code has expired. Please request a new one.", 410)
      }

      const attemptCount = Number.parseInt(String(storedRecord.attempt_count ?? 0), 10)
      if (attemptCount >= 5) {
        return errorResponse("Too many incorrect attempts. Please request a new code.", 429)
      }

      const { error: updateError } = await client
        .from("registration_verifications")
        .update({
          attempt_count: attemptCount + 1,
        })
        .eq("id", verificationId)

      if (updateError) {
        return errorResponse("Verification service error. Please try again in a moment.", 500)
      }

      return errorResponse("Incorrect verification code.", 422, {
        remainingAttempts: Math.max(0, 4 - attemptCount),
      })
    }

    const payload = record.payload
    const legacyPayload = record.legacy_payload

    if (
      !payload || typeof payload !== "object" || Array.isArray(payload) ||
      !legacyPayload || typeof legacyPayload !== "object" || Array.isArray(legacyPayload)
    ) {
      return errorResponse("Stored verification data is invalid. Please submit the form again.", 500)
    }

    await insertAdmissionPayloads(
      client,
      record.id,
      payload as Record<string, unknown>,
      legacyPayload as Record<string, unknown>,
    )

    const stamp = new Date().toISOString()
    await client
      .from("registration_verifications")
      .update({
        verified_at: stamp,
        used_at: stamp,
      })
      .eq("id", record.id)

    return jsonResponse({
      ok: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "This full name is already registered.") {
      return errorResponse(error.message, 409)
    }

    return errorResponse(
      error instanceof Error ? error.message : "Verification service error. Please try again in a moment.",
      500,
    )
  }
})
