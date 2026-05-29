import { errorResponse, jsonInput, jsonResponse, corsHeaders } from "../_shared/http.ts"
import {
  admissionFullNameExists,
  createServiceRoleClient,
} from "../_shared/verification.ts"

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405)
  }

  try {
    const input = await jsonInput(request)
    const payload = {
      first_name: input.firstName,
      middle_name: input.middleName,
      last_name: input.lastName,
      date_of_birth: input.dateOfBirth,
    }

    return jsonResponse({
      ok: true,
      exists: await admissionFullNameExists(createServiceRoleClient(), payload),
    })
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Could not check for an existing registration. Please try again.",
      500,
    )
  }
})
