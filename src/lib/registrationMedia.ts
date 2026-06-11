import { supabase } from "@/integrations/supabase/client";

export type RegistrationMediaKind = "profile_photo" | "signature";

export type RegistrationMediaAsset = {
  media_id: string;
  registration_draft_id: string;
  media_kind: RegistrationMediaKind;
  file_name: string;
  content_type: string;
  byte_size: number;
  processing_status?: "processing" | "ready" | "error" | string;
  processing_error?: string | null;
  content_base64?: string;
  created_at?: string;
  updated_at?: string;
};

type RegistrationMediaRpcResponse = RegistrationMediaAsset | null;

const callRegistrationMediaRpc = async <T,>(
  functionName: string,
  args: Record<string, unknown>,
): Promise<T> => {
  const { data, error } = await supabase.rpc(functionName, args);

  if (error) {
    throw error;
  }

  return data as T;
};

const isMissingRpcSignatureError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return /could not find the function|function .* does not exist|no function matches/i.test(message);
};

export const fileToBase64 = async (file: Blob): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";

  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

export const buildRegistrationMediaDataUrl = (asset: Pick<RegistrationMediaAsset, "content_type" | "content_base64">) => {
  const base64 = (asset.content_base64 ?? "").replace(/\s+/g, "");
  return `data:${asset.content_type};base64,${base64}`;
};

export const storeRegistrationMediaAsset = async (input: {
  registrationDraftId: string;
  mediaKind: RegistrationMediaKind;
  fileName: string;
  contentType: string;
  contentBase64: string;
  processingStatus?: "processing" | "ready" | "error";
  processingError?: string | null;
}): Promise<RegistrationMediaAsset> => {
  const baseArgs = {
    p_registration_draft_id: input.registrationDraftId,
    p_media_kind: input.mediaKind,
    p_file_name: input.fileName,
    p_content_type: input.contentType,
    p_content_base64: input.contentBase64,
  };

  const argsWithProcessing = {
    ...baseArgs,
    p_processing_status: input.processingStatus ?? "ready",
    p_processing_error: input.processingError ?? null,
  };

  try {
    return await callRegistrationMediaRpc<RegistrationMediaAsset>("upsert_registration_media_asset", argsWithProcessing);
  } catch (error) {
    // Older database migrations only expose the 5-argument version of the RPC.
    if (!isMissingRpcSignatureError(error)) {
      throw error;
    }

    return await callRegistrationMediaRpc<RegistrationMediaAsset>("upsert_registration_media_asset", baseArgs);
  }
};

export const fetchRegistrationMediaAsset = async (mediaId: string): Promise<RegistrationMediaRpcResponse> => {
  return await callRegistrationMediaRpc<RegistrationMediaRpcResponse>("get_registration_media_asset", {
    p_media_id: mediaId,
  });
};

export const fetchRegistrationMediaAssetByDraft = async (input: {
  registrationDraftId: string;
  mediaKind: RegistrationMediaKind;
}): Promise<RegistrationMediaRpcResponse> => {
  return await callRegistrationMediaRpc<RegistrationMediaRpcResponse>("get_registration_media_asset_by_draft", {
    p_registration_draft_id: input.registrationDraftId,
    p_media_kind: input.mediaKind,
  });
};

export const deleteRegistrationMediaAsset = async (input: {
  registrationDraftId: string;
  mediaKind: RegistrationMediaKind;
}): Promise<void> => {
  await callRegistrationMediaRpc("delete_registration_media_asset", {
    p_registration_draft_id: input.registrationDraftId,
    p_media_kind: input.mediaKind,
  });
};
