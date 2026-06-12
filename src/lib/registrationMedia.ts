import { supabase } from "@/integrations/supabase/client";
export type RegistrationMediaKind = "profile_photo" | "signature";

export type RegistrationMediaAsset = {
  media_id: string;
  registration_draft_id: string;
  media_kind: RegistrationMediaKind;
  file_name: string;
  content_type: string;
  byte_size: number;
  storage_path?: string;
  processing_status?: "processing" | "ready" | "error" | string;
  processing_error?: string | null;
  content_base64?: string;
  created_at?: string;
  updated_at?: string;
};

type RegistrationMediaRpcResponse = RegistrationMediaAsset | null;
const MEDIA_BUCKET = "registration-media";

const callRegistrationMediaRpc = async <T,>(
  functionName: string,
  args: Record<string, unknown>,
): Promise<T> => {
  const { data, error } = await supabase.rpc(functionName, args);

  if (error) {
    throw new Error(getRegistrationMediaErrorMessage(error));
  }

  return data as T;
};

export const getRegistrationMediaErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message.trim();
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) {
      return message;
    }
  }

  return "Could not upload the file.";
};

const isMissingRpcSignatureError = (error: unknown): boolean => {
  const message = getRegistrationMediaErrorMessage(error);
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
    if (isMissingRpcSignatureError(error)) {
      return await callRegistrationMediaRpc<RegistrationMediaAsset>("upsert_registration_media_asset", baseArgs);
    }

    throw error;
  }
};

export const getRegistrationMediaStoragePath = (
  registrationDraftId: string,
  mediaKind: RegistrationMediaKind,
): string => {
  const folder = mediaKind === "profile_photo" ? "student-photo" : "student-signature";
  return `registration-drafts/${registrationDraftId}/${folder}`;
};

export const uploadRegistrationMediaFileToStorage = async (input: {
  registrationDraftId: string;
  mediaKind: RegistrationMediaKind;
  file: File;
  contentType?: string;
  processingStatus?: "processing" | "ready" | "error";
  processingError?: string | null;
}): Promise<RegistrationMediaAsset> => {
  const storagePath = getRegistrationMediaStoragePath(input.registrationDraftId, input.mediaKind);
  const contentType = input.contentType || input.file.type || "application/octet-stream";
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, input.file, {
    cacheControl: "3600",
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(getRegistrationMediaErrorMessage(error));
  }

  const timestamp = new Date().toISOString();
  return {
    media_id: "",
    registration_draft_id: input.registrationDraftId,
    media_kind: input.mediaKind,
    file_name: input.file.name,
    content_type: contentType,
    byte_size: input.file.size,
    storage_path: storagePath,
    processing_status: input.processingStatus ?? "ready",
    processing_error: input.processingError ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };
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
