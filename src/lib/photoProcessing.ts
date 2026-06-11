const configuredApiBase = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

const PHOTO_CLEANUP_MAX_SIDE = 1024;
const PHOTO_CLEANUP_JPEG_QUALITY = 0.84;
const photoCleanupServiceUnavailableMessage = "Photo cleanup service is unavailable right now. Please try again in a moment.";

export const buildProcessedPhotoFileName = (originalFileName: string) => {
  const trimmedName = originalFileName.trim();
  const lastDotIndex = trimmedName.lastIndexOf(".");
  const baseName = lastDotIndex > 0 ? trimmedName.slice(0, lastDotIndex) : trimmedName;

  return `${baseName || "student-photo"}-white.jpg`;
};

const postBinaryToPhpApi = async (path: string, body: Blob): Promise<Blob> => {
  let response: Response;

  try {
    response = await fetch(`${configuredApiBase}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": body.type || "application/octet-stream",
      },
      body,
    });
  } catch {
    throw new Error(photoCleanupServiceUnavailableMessage);
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text().catch(() => "");
    const data = contentType.includes("application/json") && text
      ? (() => {
          try {
            return JSON.parse(text) as { message?: unknown };
          } catch {
            return null;
          }
        })()
      : null;

    const message = typeof data?.message === "string" && data.message.trim()
      ? data.message.trim()
      : text.trim() || "Could not clean the photo background.";

    throw new Error(message);
  }

  return await response.blob();
};

const renderBlobOnWhiteCanvas = async (blob: Blob): Promise<Blob> => {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not process the cleaned photo."));
      element.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare the cleaned photo.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error("Could not render the cleaned photo."));
      }, "image/jpeg", 0.97);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

type LoadedPhotoSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

const loadImageFromBlob = async (blob: Blob): Promise<LoadedPhotoSource> => {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall back to the HTML image path below.
    }
  }

  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = "async";

    const ready = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not prepare the photo for cleanup."));
    });

    image.src = objectUrl;

    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        await ready;
      }
    } else {
      await ready;
    }

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("Could not prepare the photo for cleanup.");
    }

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const preparePhotoForCleanup = async (file: File): Promise<File> => {
  const image = await loadImageFromBlob(file);
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const longestSide = Math.max(sourceWidth, sourceHeight);
  const scale = Math.min(1, PHOTO_CLEANUP_MAX_SIDE / longestSide);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    image.close?.();
    throw new Error("Could not prepare the photo for cleanup.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image.source, 0, 0, width, height);

  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error("Could not prepare the photo for cleanup."));
      }, "image/jpeg", PHOTO_CLEANUP_JPEG_QUALITY);
    });

    if (blob.size >= file.size && file.type === "image/jpeg") {
      return file;
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, "") || file.name, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    image.close?.();
  }
};

const removePhotoBackgroundInBrowser = async (file: File): Promise<File> => {
  const { removeBackground } = await import("@imgly/background-removal");
  const cleanedBlob = await removeBackground(file, {
    model: "isnet_fp16",
    output: {
      format: "image/png",
      type: "foreground",
    },
  });

  const flattenedBlob = await renderBlobOnWhiteCanvas(cleanedBlob);
  return new File([flattenedBlob], buildProcessedPhotoFileName(file.name), {
    type: "image/jpeg",
  });
};

export const processPhotoBackground = async (file: File): Promise<File> => {
  const cleanupInput = await preparePhotoForCleanup(file);

  if (configuredApiBase) {
    try {
      const cleanedBlob = await postBinaryToPhpApi("remove-photo-background.php", cleanupInput);
      return new File([cleanedBlob], buildProcessedPhotoFileName(file.name), {
        type: "image/jpeg",
      });
    } catch (error) {
      console.warn("Server photo cleanup failed. Falling back to browser cleanup.", error);
    }
  }

  try {
    return await removePhotoBackgroundInBrowser(cleanupInput);
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.trim() !== ""
        ? error.message
        : photoCleanupServiceUnavailableMessage,
    );
  }
};
