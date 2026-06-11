import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Camera, CheckCircle2, Copy, ExternalLink, Image as ImageIcon, Info, Upload, RefreshCcw, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import MediaUploadCard from "@/components/registration/MediaUploadCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildRegistrationMediaDataUrl,
  fetchRegistrationMediaAssetByDraft,
  type RegistrationMediaAsset,
} from "@/lib/registrationMedia";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_MEDIA_SIZE_BYTES = 5 * 1024 * 1024;
const CLEANUP_ESTIMATE_MS = 3000;
const CLEANUP_PROGRESS_MIN = 18;
const CLEANUP_PROGRESS_MAX = 92;
const REMOTE_PROCESSING_TIMEOUT_MS = 20000;

const photoRequirementItems = [
  {
    title: "Face centered",
    description: "Show the full face and shoulders.",
  },
  {
    title: "Good lighting",
    description: "Avoid dark shadows and glare.",
  },
  {
    title: "Plain background",
    description: "A simple wall works best.",
  },
  {
    title: "No filters",
    description: "No hats, sunglasses, or heavy edits.",
  },
] as const;

const photoQuickChecks = [
  "Clear face",
  "Face forward",
  "White background",
  "No edits",
] as const;

const photoExamples = [
  { label: "Male reference", src: "/photo-example-1.jpg", alt: "Male formal 2x2 student photo reference" },
  { label: "Female reference", src: "/photo-example-2.jpg", alt: "Female formal 2x2 student photo reference" },
] as const;

type PhotoUploadDialogProps = {
  previewUrl: string | null;
  fileName: string | null;
  registrationDraftId: string;
  uploading?: boolean;
  error?: string | null;
  onUploadFile: (file: File) => Promise<boolean>;
  onRemotePhotoReady: (asset: RegistrationMediaAsset) => void;
  onClear: () => void;
};

const PhotoUploadDialog = ({
  previewUrl,
  fileName,
  registrationDraftId,
  uploading = false,
  error = null,
  onUploadFile,
  onRemotePhotoReady,
  onClear,
}: PhotoUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"choice" | "file" | "live" | "remote">("choice");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cleanupCountdown, setCleanupCountdown] = useState<number>(3);
  const [cleanupProgress, setCleanupProgress] = useState(0);
  const [cleanupPastEstimate, setCleanupPastEstimate] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraWarmupPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const cameraSessionActiveRef = useRef(false);
  const lastRemoteMediaIdRef = useRef<string | null>(null);
  const remoteStartedAtRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const busy = uploading || submitting || cameraBusy;
  const faceDetectionSupported = typeof window !== "undefined" && "FaceDetector" in window;
  const remoteUploadUrl = typeof window === "undefined"
    ? ""
    : `${window.location.origin}/mobile-photo-upload?draft=${encodeURIComponent(registrationDraftId)}`;
  const remotePhotoQuery = useQuery({
    queryKey: ["registration-remote-photo", registrationDraftId],
    queryFn: () => fetchRegistrationMediaAssetByDraft({
      registrationDraftId,
      mediaKind: "profile_photo",
    }),
    enabled: open && tab === "remote" && Boolean(registrationDraftId),
    refetchInterval: open && tab === "remote" ? 15000 : false,
    staleTime: 0,
  });
  const { refetch: refetchRemotePhotoQuery } = remotePhotoQuery;

  useEffect(() => {
    if (!open || tab !== "remote" || !registrationDraftId) {
      return;
    }

    const channel = supabase
      .channel(`registration-media-${registrationDraftId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "registration_media",
          filter: `registration_draft_id=eq.${registrationDraftId}`,
        },
        () => {
          void refetchRemotePhotoQuery();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, refetchRemotePhotoQuery, registrationDraftId, tab]);

  const stopCameraStream = () => {
    cameraSessionActiveRef.current = false;

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.pause();
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    cameraWarmupPromiseRef.current = null;
    setCameraReady(false);
  };

  const attachStreamToVideo = useCallback((stream: MediaStream) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    videoElement.srcObject = stream;
    void videoElement.play().catch(() => undefined);
    setCameraReady(true);
  }, []);

  const startCameraStream = useCallback(async (showError = false) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      if (showError) {
        setCameraError("Camera access is not available in this browser.");
      }
      return null;
    }

    if (streamRef.current) {
      attachStreamToVideo(streamRef.current);
      return streamRef.current;
    }

    if (cameraWarmupPromiseRef.current) {
      return cameraWarmupPromiseRef.current;
    }

    cameraSessionActiveRef.current = true;
    setCameraBusy(true);
    setCameraError(null);

    const request = navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 640 },
        frameRate: { ideal: 15, max: 24 },
      },
      audio: false,
    });

    const pendingRequest = request.then(
      (stream) => {
        if (!cameraSessionActiveRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return null;
        }

        streamRef.current = stream;
        attachStreamToVideo(stream);
        return stream;
      },
      () => {
        if (cameraSessionActiveRef.current) {
          setCameraError("We could not access the camera. Please allow camera permission or use file upload instead.");
        }

        return null;
      },
    );
    cameraWarmupPromiseRef.current = pendingRequest;

    try {
      return await pendingRequest;
    } finally {
      if (cameraWarmupPromiseRef.current === pendingRequest) {
        cameraWarmupPromiseRef.current = null;
      }
      setCameraBusy(false);
    }
  }, [attachStreamToVideo]);

  useEffect(() => {
    if (!open) {
      stopCameraStream();
      return;
    }

    setCameraError(null);
    setCapturedPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return null;
    });
    setCapturedFile(null);
    setTab("choice");

    return () => {
      stopCameraStream();
    };
  }, [open, startCameraStream]);

  useEffect(() => {
    if (!open || tab !== "live") {
      return;
    }

    if (streamRef.current) {
      attachStreamToVideo(streamRef.current);
      return;
    }

    void startCameraStream(true);
  }, [open, tab, attachStreamToVideo, startCameraStream]);

  useEffect(() => {
    if (open && tab === "remote") {
      remoteStartedAtRef.current = Date.now();
      lastRemoteMediaIdRef.current = null;
      return;
    }

    remoteStartedAtRef.current = null;
  }, [open, tab]);

  useEffect(() => {
    if (!open || tab !== "remote" || !remoteUploadUrl) {
      setQrCodeUrl(null);
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(remoteUploadUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
    }).then(
      (dataUrl) => {
        if (!cancelled) {
          setQrCodeUrl(dataUrl);
        }
      },
      () => {
        if (!cancelled) {
          setQrCodeUrl(null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [open, remoteUploadUrl, tab]);

  useEffect(() => {
    const remoteAsset = remotePhotoQuery.data;
    if (!remoteAsset?.media_id || remoteAsset.media_id === lastRemoteMediaIdRef.current) {
      return;
    }

    const remoteUpdatedAt = new Date(remoteAsset.updated_at ?? remoteAsset.created_at ?? "").getTime();
    const remoteStartedAt = remoteStartedAtRef.current;
    if (remoteStartedAt && Number.isFinite(remoteUpdatedAt) && remoteUpdatedAt < remoteStartedAt - 1000) {
      return;
    }

    if ((remoteAsset.processing_status ?? "ready") !== "ready") {
      return;
    }

    lastRemoteMediaIdRef.current = remoteAsset.media_id;
    onRemotePhotoReady(remoteAsset);
    setOpen(false);
    toast.success("Photo received from the other device.");
  }, [onRemotePhotoReady, remotePhotoQuery.data]);

  useEffect(() => {
    if (!open || tab !== "remote") {
      return;
    }

    const remoteAsset = remotePhotoQuery.data;
    if (!remoteAsset?.media_id || (remoteAsset.processing_status ?? "ready") === "ready") {
      return;
    }

    const startedAt = new Date(remoteAsset.updated_at ?? remoteAsset.created_at ?? "").getTime();
    if (!Number.isFinite(startedAt)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (lastRemoteMediaIdRef.current === remoteAsset.media_id) {
        return;
      }

      lastRemoteMediaIdRef.current = remoteAsset.media_id;
      onRemotePhotoReady(remoteAsset);
      setOpen(false);
      toast.info("The uploaded version was attached because background cleanup took longer than expected.");
    }, Math.max(0, REMOTE_PROCESSING_TIMEOUT_MS - (Date.now() - startedAt)));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, onRemotePhotoReady, remotePhotoQuery.data, tab]);

  useEffect(() => {
    return () => {
      if (capturedPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
    };
  }, [capturedPreviewUrl]);

  useEffect(() => {
    if (!submitting) {
      setCleanupCountdown(3);
      setCleanupProgress(0);
      setCleanupPastEstimate(false);
      return;
    }

    const startedAt = window.performance.now();

    const intervalId = window.setInterval(() => {
      const elapsedMs = window.performance.now() - startedAt;
      const remainingMs = Math.max(0, CLEANUP_ESTIMATE_MS - elapsedMs);
      const nextCountdown = Math.max(0, Math.ceil(remainingMs / 1000));

      setCleanupCountdown(nextCountdown);
      setCleanupPastEstimate(elapsedMs >= CLEANUP_ESTIMATE_MS);

      const progress = elapsedMs < CLEANUP_ESTIMATE_MS
        ? CLEANUP_PROGRESS_MIN + ((elapsedMs / CLEANUP_ESTIMATE_MS) * (CLEANUP_PROGRESS_MAX - CLEANUP_PROGRESS_MIN))
        : 88 + Math.sin(elapsedMs / 180) * 2;

      setCleanupProgress(Math.min(CLEANUP_PROGRESS_MAX, Math.max(CLEANUP_PROGRESS_MIN, progress)));
    }, 120);

    return () => window.clearInterval(intervalId);
  }, [submitting]);

  const cleanupStatusText = cleanupPastEstimate
    ? "Still cleaning... this usually finishes in a moment."
    : `Estimated time left: ${cleanupCountdown}s`;

  const clearCaptured = () => {
    if (capturedPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedPreviewUrl(null);
    setCapturedFile(null);
  };

  const resetCamera = () => {
    clearCaptured();
    setCameraError(null);
  };

  const validateMediaFile = (file: File) => {
    if (!ACCEPTED_MEDIA_TYPES.has(file.type)) {
      return "Photo must be a JPG, PNG, or WEBP image.";
    }

    if (file.size > MAX_MEDIA_SIZE_BYTES) {
      return "Photo must be 5 MB or smaller.";
    }

    return null;
  };

  const submitFile = async (file: File) => {
    const validationError = validateMediaFile(file);
    if (validationError) {
      setCameraError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onUploadFile(file);
      if (ok) {
        setOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) {
      return;
    }

    await submitFile(file);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setCameraError("Camera preview is not ready yet.");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 400);
        const onFrame = () => {
          window.clearTimeout(timeout);
          resolve();
        };

        if ("requestVideoFrameCallback" in video) {
          (video as HTMLVideoElement & {
            requestVideoFrameCallback: (callback: () => void) => number;
          }).requestVideoFrameCallback(() => onFrame());
          return;
        }

        window.requestAnimationFrame(onFrame);
      });
    }

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is still loading. Please try again in a moment.");
      return;
    }

    setSubmitting(true);
    try {
      const size = Math.min(video.videoWidth, video.videoHeight);
      const sx = Math.max(0, (video.videoWidth - size) / 2);
      const sy = Math.max(0, (video.videoHeight - size) / 2);

      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create the capture canvas.");
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/jpeg", 0.95);
      });

      if (!blob) {
        throw new Error("Could not capture the photo.");
      }

      const file = new File([blob], `student-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(blob);
      clearCaptured();
      setCapturedPreviewUrl(previewUrl);
      setCapturedFile(file);
      setCameraReady(true);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Could not capture the photo.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCapturedPhoto = async () => {
    if (!capturedFile) {
      setCameraError("Capture a photo before using it.");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onUploadFile(capturedFile);
      if (ok) {
        clearCaptured();
        setOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dialogTitle = previewUrl ? "Replace Student Photo" : "Upload Student Photo";

  const handlePrimaryAction = () => {
    setOpen(true);
  };

  const copyRemoteUploadLink = async () => {
    if (!remoteUploadUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(remoteUploadUrl);
      toast.success("Upload link copied.");
    } catch {
      toast.error("Could not copy the upload link.");
    }
  };

  return (
    <>
      <MediaUploadCard
        title="Student Photo"
        description="Upload a clear student photo."
        actionLabel="Upload Photo"
        actionHint="Choose a file or open the camera. The app will clean the background automatically."
        previewUrl={previewUrl}
        fileName={fileName}
        uploading={uploading}
        error={error}
        previewAspectClassName="aspect-square"
        icon={<Camera className="h-5 w-5" />}
        onAction={handlePrimaryAction}
        onClear={onClear}
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setTab("choice");
            setCameraError(null);
            clearCaptured();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-7xl overflow-y-auto">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  Required
                </Badge>
                <DialogTitle className="text-2xl">{dialogTitle}</DialogTitle>
              </div>
            </div>
            <DialogDescription className="max-w-2xl">
              Upload a clear student photo. The app will check it, clean the background, and save a white-background copy.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive" className="border-2 border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Blurry, filtered, or badly cropped photos will be rejected.
            </AlertDescription>
          </Alert>

          {!faceDetectionSupported && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Browser note</p>
                <p>
                  Face placement checks are most accurate in Chrome or Edge on desktop.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">Quick checklist</h3>
                  <Badge variant="secondary">Ready for upload</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {photoRequirementItems.map((item, index) => (
                    <div key={item.title} className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {index + 1}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="text-sm leading-5 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {photoQuickChecks.map((item) => (
                  <Badge key={item} variant="outline" className="bg-muted/40 text-foreground">
                    {item}
                  </Badge>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Example photos</h4>
                  <Badge variant="secondary">Reference</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {photoExamples.map((example) => (
                    <div key={example.label} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                      <div className="aspect-square bg-white">
                        <img src={example.src} alt={example.alt} className="h-full w-full object-contain" />
                      </div>
                      <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
                        <p className="text-sm font-medium text-foreground">{example.label}</p>
                        <Badge variant="secondary">Sample</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                The app will place the photo on a clean white background automatically.
              </p>
            </div>

            <div className="space-y-4">
              <Tabs value={tab} onValueChange={(value) => setTab(value as "file" | "live" | "remote")}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                  <TabsTrigger value="live">Live Camera</TabsTrigger>
                  <TabsTrigger value="remote">Other Device</TabsTrigger>
                </TabsList>

                {submitting && (
                  <Alert
                    aria-live="polite"
                    className="mt-4 border-primary/30 bg-primary/5 text-primary"
                  >
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                    <AlertTitle>Processing photo</AlertTitle>
                    <AlertDescription className="space-y-3 text-primary/80">
                      <p>Cleaning the photo and saving the white-background copy.</p>
                      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                          style={{ width: `${cleanupProgress}%` }}
                        />
                      </div>
                      <p className="font-semibold text-primary">
                        {cleanupStatusText}
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <TabsContent value="choice" className="space-y-4 pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => setTab("file")}
                      disabled={busy}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="mt-4 font-semibold text-foreground">Upload File</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Choose an existing JPG, PNG, or WEBP photo from your device.
                      </p>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => setTab("live")}
                      disabled={busy}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Camera className="h-5 w-5" />
                      </div>
                      <p className="mt-4 font-semibold text-foreground">Live Camera</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Open the camera preview and capture a new student photo.
                      </p>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => setTab("remote")}
                      disabled={busy}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <p className="mt-4 font-semibold text-foreground">Use Another Device</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Scan a code on a phone, upload there, and receive it here automatically.
                      </p>
                    </button>
                  </div>
                </TabsContent>

                <TabsContent value="file" className="space-y-4 pt-4">
                  <div className="rounded-2xl border border-border bg-muted/20 p-5">
                    <div className="space-y-2">
                      <Label htmlFor="student-photo-upload" className="text-sm font-medium text-foreground">
                        Upload a photo from your device
                      </Label>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Accepted formats: JPG, PNG, or WEBP. Maximum file size: 5 MB.
                      </p>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Button type="button" className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                        <Upload className="h-4 w-4" />
                        Choose File
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setTab("live")}
                        disabled={busy}
                      >
                        <Camera className="h-4 w-4" />
                        Use Live Camera
                      </Button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      After choosing a file, the photo will be cleaned and saved automatically.
                    </p>
                  </div>

                  <Input
                    ref={fileInputRef}
                    id="student-photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      void handleFileSelect(event);
                    }}
                  />
                </TabsContent>

                <TabsContent value="remote" className="space-y-4 pt-4">
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-2xl border border-border bg-muted/20 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Use another device</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Open this link on a phone to take or choose the student photo.
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {remotePhotoQuery.isFetching ? "Watching" : "Ready"}
                        </Badge>
                      </div>

                      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-white p-4">
                        {qrCodeUrl ? (
                          <img src={qrCodeUrl} alt="QR code for mobile student photo upload" className="mx-auto h-56 w-56" />
                        ) : (
                          <div className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
                            Upload link is not ready.
                          </div>
                        )}
                      </div>

                      <div className="mt-4 rounded-xl border border-border bg-background px-3 py-2">
                        <p className="break-all text-xs text-muted-foreground">{remoteUploadUrl}</p>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Button type="button" className="w-full sm:w-auto" onClick={() => void copyRemoteUploadLink()} disabled={!remoteUploadUrl}>
                          <Copy className="h-4 w-4" />
                          Copy Link
                        </Button>
                        <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
                          <a href={remoteUploadUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Open Link
                          </a>
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      {remotePhotoQuery.data?.content_base64 ? (
                        <div className="space-y-3">
                          {(remotePhotoQuery.data.processing_status ?? "ready") !== "ready" && (
                            <Alert className="border-primary/30 bg-primary/5 text-primary">
                              <RefreshCcw className="h-4 w-4 animate-spin" />
                              <AlertTitle>Photo received</AlertTitle>
                              <AlertDescription className="text-primary/80">
                                Cleaning the background now. The form will update when the final version is ready.
                              </AlertDescription>
                            </Alert>
                          )}
                          <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
                            <img
                              src={buildRegistrationMediaDataUrl(remotePhotoQuery.data)}
                              alt="Photo received from another device"
                              className="aspect-square w-full object-cover"
                            />
                          </div>
                          {(remotePhotoQuery.data.processing_status ?? "ready") === "ready" ? (
                            <p className="text-sm font-semibold text-success">Photo received. Closing this modal now.</p>
                          ) : (
                            <p className="text-sm font-semibold text-primary">Waiting for the cleaned photo.</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Smartphone className="h-8 w-8" />
                          </div>
                          <h3 className="mt-4 text-lg font-semibold text-foreground">Waiting for the phone upload</h3>
                          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                            Keep this modal open. Once the phone sends the photo, this form will fill the Student Photo automatically.
                          </p>
                          {remotePhotoQuery.isError && (
                            <p className="mt-4 text-sm font-medium text-destructive">
                              Could not check for the phone upload yet. This will keep trying.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="live" className="space-y-4 pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Camera capture</p>
                          <p className="text-xs text-muted-foreground">Keep your face in the guide. Then capture and save.</p>
                        </div>
                      {cameraBusy && !cameraReady ? (
                        <Badge variant="secondary">Preparing</Badge>
                      ) : cameraReady ? (
                        <Badge variant="secondary">Camera ready</Badge>
                      ) : null}
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-sm">
                      <div className="relative h-[clamp(420px,60vh,720px)] w-full">
                        {capturedPreviewUrl ? (
                          <>
                            <img src={capturedPreviewUrl} alt="Captured preview" className="h-full w-full object-cover" />
                            {submitting && (
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
                                <div className="max-w-xs rounded-3xl border border-white/20 bg-white/10 px-5 py-5 text-center text-white shadow-2xl">
                                  <RefreshCcw className="mx-auto h-8 w-8 animate-spin" />
                                  <p className="mt-3 text-sm font-semibold">Processing photo</p>
                                  <p className="mt-1 text-xs leading-5 text-white/80">
                                    Saving the clean white-background copy.
                                  </p>
                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                                    <div
                                      className="h-full rounded-full bg-white/85 transition-[width] duration-150 ease-out"
                                      style={{ width: `${cleanupProgress}%` }}
                                    />
                                  </div>
                                  <p className="mt-3 text-sm font-semibold text-white">
                                    {cleanupStatusText}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <video
                              ref={videoRef}
                              playsInline
                              autoPlay
                              muted
                              className="h-full w-full object-cover"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
                            {!cameraReady && !cameraError && (
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                                <div className="w-full max-w-xs rounded-3xl border border-white/15 bg-black/65 px-5 py-5 text-center text-white shadow-2xl backdrop-blur">
                                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                                    <Camera className="h-6 w-6 text-white" />
                                  </div>
                                  <p className="mt-3 text-sm font-semibold">Warming up camera</p>
                                  <p className="mt-1 text-xs leading-5 text-white/75">
                                    Starting the preview in the background.
                                  </p>
                                  <div className="mt-4 flex items-center justify-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-white/80 animate-pulse" />
                                    <span
                                      className="h-2.5 w-2.5 rounded-full bg-white/60 animate-pulse"
                                      style={{ animationDelay: "150ms" }}
                                    />
                                    <span
                                      className="h-2.5 w-2.5 rounded-full bg-white/40 animate-pulse"
                                      style={{ animationDelay: "300ms" }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="relative h-[74%] w-[74%] rounded-3xl border-2 border-white/90">
                                <div className="absolute inset-3 rounded-[1.35rem] border border-white/30" />
                                <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
                              </div>
                            </div>
                            <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
                              Live Camera
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/50 px-4 py-3 text-sm text-white backdrop-blur-sm">
                              Center the face and keep the light even.
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border bg-background/70 text-foreground">
                        Best for desktop
                      </Badge>
                      <Badge variant="outline" className="border-border bg-background/70 text-foreground">
                        Live preview
                      </Badge>
                    </div>

                    {cameraError && (
                      <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Camera unavailable</AlertTitle>
                        <AlertDescription className="space-y-3">
                          <p>{cameraError}</p>
                          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setTab("file")} disabled={busy}>
                            <Upload className="h-4 w-4" />
                            Use File Upload
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {!capturedPreviewUrl ? (
                      <Button
                        type="button"
                        className="w-full sm:w-auto"
                        onClick={() => void capturePhoto()}
                        disabled={busy || cameraBusy || !cameraReady}
                      >
                        <Camera className="h-4 w-4" />
                        Capture
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => resetCamera()}
                          disabled={busy}
                        >
                          <RefreshCcw className="h-4 w-4" />
                          Retake
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => setTab("file")}
                          disabled={busy}
                        >
                          <Upload className="h-4 w-4" />
                          Use File Upload
                        </Button>
                        <Button
                          type="button"
                          className="w-full sm:w-auto"
                          onClick={() => void confirmCapturedPhoto()}
                          disabled={busy}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {submitting ? "Processing photo..." : "Use Photo"}
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>

              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoUploadDialog;
