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

    let record = storedRecord

    if (record.used_at || record.verified_at) {
      if (await admissionExists(client, verificationId)) {
        return jsonResponse({ ok: true, alreadyVerified: true })
      }

      return errorResponse("This verification code has already been used.", 409)
    }

    const expiresAt = Date.parse(String(record.expires_at ?? ""))
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return errorResponse("This verification code has expired. Please request a new one.", 410)
    }

    const attemptCount = Number.parseInt(String(record.attempt_count ?? 0), 10)
    if (attemptCount >= 5) {
      return errorResponse("Too many incorrect attempts. Please request a new code.", 429)
    }

    const codeHash = String(record.code_hash ?? "")
    let isValidCode = codeHash !== "" && await verifyStoredVerificationCode(code, codeHash)

    if (!isValidCode) {
      const { data: activeRequests, error: activeRequestsError } = await client
        .from("registration_verifications")
        .select("*")
        .eq("email", String(record.email ?? ""))
        .is("used_at", null)
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10)

      if (activeRequestsError) {
        return errorResponse("Verification service error. Please try again in a moment.", 500)
      }

      for (const activeRequest of activeRequests ?? []) {
        if (activeRequest.id === record.id) {
          continue
        }

        const activeCodeHash = String(activeRequest.code_hash ?? "")
        if (activeCodeHash !== "" && await verifyStoredVerificationCode(code, activeCodeHash)) {
          record = activeRequest
          isValidCode = true
          break
        }
      }
    }

    if (!isValidCode) {
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
      verificationId,
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
      .eq("id", verificationId)

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
