type DetectedFace = {
  boundingBox: DOMRectReadOnly;
};

type FaceDetectorInstance = {
  detect(image: CanvasImageSource): Promise<DetectedFace[]>;
};

type FaceDetectorCtor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorInstance;

export type PhotoValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

const MIN_SHORT_SIDE = 720;
const MAX_PORTRAIT_ASPECT_RATIO = 2.0;
const MIN_AVERAGE_LUMINANCE = 48;
const MAX_AVERAGE_LUMINANCE = 235;
const MIN_LUMINANCE_CONTRAST = 16;
const MIN_EDGE_STRENGTH = 4.5;
const FACE_MIN_RATIO = 0.18;
const FACE_MAX_RATIO = 0.72;
const FACE_MAX_CENTER_OFFSET_X = 0.18;
const FACE_MAX_CENTER_OFFSET_Y = 0.22;
const FACE_EDGE_MARGIN = 0.03;

const fail = (reason: string): PhotoValidationResult => ({
  ok: false,
  reason,
});

const loadImageFromFile = async (file: File): Promise<HTMLImageElement> => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    const ready = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not read the photo."));
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
      throw new Error("Could not read the photo.");
    }

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const measureImageMetrics = (image: HTMLImageElement) => {
  const sampleWidth = 64;
  const sampleHeight = Math.max(64, Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not analyze the photo.");
  }

  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const luminance = new Float32Array(sampleWidth * sampleHeight);

  let sum = 0;
  let sumSquares = 0;
  let min = 255;
  let max = 0;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index] ?? 0;
    const green = imageData.data[index + 1] ?? 0;
    const blue = imageData.data[index + 2] ?? 0;
    const lum = 0.299 * red + 0.587 * green + 0.114 * blue;
    const luminanceIndex = index / 4;

    luminance[luminanceIndex] = lum;
    sum += lum;
    sumSquares += lum * lum;
    min = Math.min(min, lum);
    max = Math.max(max, lum);
  }

  const pixelCount = luminance.length;
  const average = sum / pixelCount;
  const variance = Math.max(0, (sumSquares / pixelCount) - (average * average));
  const contrast = Math.sqrt(variance);

  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = 0; y < sampleHeight - 1; y += 1) {
    for (let x = 0; x < sampleWidth - 1; x += 1) {
      const current = luminance[(y * sampleWidth) + x] ?? 0;
      const right = luminance[(y * sampleWidth) + x + 1] ?? 0;
      const down = luminance[((y + 1) * sampleWidth) + x] ?? 0;

      edgeSum += Math.abs(current - right);
      edgeSum += Math.abs(current - down);
      edgeCount += 2;
    }
  }

  return {
    average,
    contrast,
    edgeStrength: edgeCount > 0 ? edgeSum / edgeCount : 0,
    dynamicRange: max - min,
  };
};

const getFaceDetector = (): FaceDetectorCtor | null => {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const candidate = globalThis as typeof globalThis & {
    FaceDetector?: FaceDetectorCtor;
  };

  return candidate.FaceDetector ?? null;
};

const validateFacePlacement = (face: DetectedFace, imageWidth: number, imageHeight: number): PhotoValidationResult => {
  const { x, y, width, height } = face.boundingBox;
  const centerX = (x + (width / 2)) / imageWidth;
  const centerY = (y + (height / 2)) / imageHeight;
  const widthRatio = width / imageWidth;
  const heightRatio = height / imageHeight;

  if (widthRatio < FACE_MIN_RATIO || heightRatio < FACE_MIN_RATIO) {
    return fail("The face is too small. Move the camera closer so the face fills more of the frame.");
  }

  if (widthRatio > FACE_MAX_RATIO || heightRatio > FACE_MAX_RATIO) {
    return fail("The face is too close. Move back a little so the full head and shoulders are visible.");
  }

  if (Math.abs(centerX - 0.5) > FACE_MAX_CENTER_OFFSET_X || Math.abs(centerY - 0.5) > FACE_MAX_CENTER_OFFSET_Y) {
    return fail("Center the face in the frame and keep the full head and shoulders visible.");
  }

  if (
    x < imageWidth * FACE_EDGE_MARGIN ||
    y < imageHeight * FACE_EDGE_MARGIN ||
    (x + width) > imageWidth * (1 - FACE_EDGE_MARGIN) ||
    (y + height) > imageHeight * (1 - FACE_EDGE_MARGIN)
  ) {
    return fail("The face is too close to the edge. Please retake the photo with more space around the head and shoulders.");
  }

  return { ok: true };
};

export const validateStudentPhoto = async (file: File): Promise<PhotoValidationResult> => {
  try {
    const image = await loadImageFromFile(file);
    const shortSide = Math.min(image.naturalWidth, image.naturalHeight);
    const aspectRatio = Math.max(image.naturalWidth, image.naturalHeight) / shortSide;

    if (shortSide < MIN_SHORT_SIDE) {
      return fail("The photo is too small. Please use a clearer, higher-resolution image.");
    }

    if (aspectRatio > MAX_PORTRAIT_ASPECT_RATIO) {
      return fail("The photo is very wide. Please use a tighter crop if possible.");
    }

    const metrics = measureImageMetrics(image);

    if (metrics.average < MIN_AVERAGE_LUMINANCE) {
      return fail("The photo is too dark. Please retake it in better light.");
    }

    if (metrics.average > MAX_AVERAGE_LUMINANCE) {
      return fail("The photo is too bright. Please retake it with softer lighting.");
    }

    if (metrics.contrast < MIN_LUMINANCE_CONTRAST) {
      return fail("The photo looks too flat or blurry. Please use a sharper image.");
    }

    if (metrics.edgeStrength < MIN_EDGE_STRENGTH) {
      return fail("The photo looks blurry. Please retake it in better focus.");
    }

    const faceDetectorCtor = getFaceDetector();
    if (!faceDetectorCtor) {
      return { ok: true };
    }

    const detector = new faceDetectorCtor({
      fastMode: true,
      maxDetectedFaces: 2,
    });

    const faces = await detector.detect(image);
    if (faces.length === 0) {
      return fail("No clear face was detected. Please use a front-facing portrait photo.");
    }

    if (faces.length > 1) {
      return fail("Only one person should appear in the photo.");
    }

    return validateFacePlacement(faces[0] as DetectedFace, image.naturalWidth, image.naturalHeight);
  } catch (error) {
    return fail(
      error instanceof Error && error.message.trim() !== ""
        ? error.message
        : "Could not analyze the photo. Please try again.",
    );
  }
};
