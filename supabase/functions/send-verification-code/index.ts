import { errorResponse, jsonInput, jsonResponse, corsHeaders } from "../_shared/http.ts"
import { intEnv } from "../_shared/env.ts"
import {
  admissionFullNameExists,
  createServiceRoleClient,
  generateVerificationCode,
  hashVerificationCode,
  normalizedEmail,
  validEmail,
} from "../_shared/verification.ts"
import { sendEmail } from "../_shared/smtp.ts"

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405)
  }

  try {
    const input = await jsonInput(request)
    const email = normalizedEmail(String(input.email ?? ""))
    const payload = input.payload
    const legacyPayload = input.legacyPayload

    if (!validEmail(email)) {
      return errorResponse("Please enter a valid email address.", 422)
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload) || !legacyPayload || typeof legacyPayload !== "object" || Array.isArray(legacyPayload)) {
      return errorResponse("Missing registration payload.", 422)
    }

    const ttlMinutes = Math.max(1, intEnv("MAIL_CODE_TTL_MINUTES", 10))
    const verificationCode = generateVerificationCode()
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()
    const client = createServiceRoleClient()

    if (await admissionFullNameExists(client, payload as Record<string, unknown>)) {
      return errorResponse("A registration with the same first name, middle name, and last name already exists.", 409)
    }

    await client
      .from("registration_verifications")
      .update({ expires_at: new Date().toISOString() })
      .eq("email", email)
      .is("used_at", null)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())

    const { data: created, error } = await client
      .from("registration_verifications")
      .insert({
        email,
        payload: { ...payload, email },
        legacy_payload: { ...legacyPayload, email },
        code_hash: await hashVerificationCode(verificationCode),
        expires_at: expiresAt,
      })
      .select("id")
      .single()

    if (error || !created?.id) {
      return errorResponse("Could not start email verification. Please try again.", 500)
    }

    try {
      await sendEmail({
        recipientEmail: email,
        subject: "Your DVC registration verification code",
        htmlBody: `<p>Your verification code is:</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${verificationCode}</p><p>This code will expire in ${ttlMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`,
        textBody: `Your DVC registration verification code is ${verificationCode}. It expires in ${ttlMinutes} minutes.`,
      })
    } catch (sendError) {
      await client.from("registration_verifications").delete().eq("id", created.id)
      return errorResponse(sendError instanceof Error ? sendError.message : "Failed to send the verification email. Please try again.", 500)
    }

    return jsonResponse({
      ok: true,
      verificationId: created.id,
      expiresAt,
      email,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Verification service error. Please try again in a moment.", 500)
  }
})
