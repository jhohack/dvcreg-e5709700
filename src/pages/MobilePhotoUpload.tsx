import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, Camera, CheckCircle2, RefreshCcw, Upload } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileToBase64, storeRegistrationMediaAsset } from "@/lib/registrationMedia";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  processPhotoBackground,
} from "@/lib/photoProcessing";
import { validateStudentPhoto } from "@/lib/photoValidation";

const MobilePhotoUpload = () => {
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft") ?? "";
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  const replacePreviewUrl = (nextUrl: string | null) => {
    setSelectedPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return nextUrl;
    });
  };

  const validateFile = (file: File) => {
    if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
      return "Photo must be a JPG, PNG, or WEBP image.";
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return "Photo must be 5 MB or smaller.";
    }

    return null;
  };

  const handleFile = async (file: File) => {
    if (!draftId) {
      setError("This upload link is missing its pairing code. Please scan the code again from the registration form.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setUploaded(false);

    try {
      const photoValidation = await validateStudentPhoto(file);
      if (!photoValidation.ok) {
        throw new Error(photoValidation.reason);
      }

      const processedFile = await processPhotoBackground(file);
      await storeRegistrationMediaAsset({
        registrationDraftId: draftId,
        mediaKind: "profile_photo",
        fileName: processedFile.name,
        contentType: processedFile.type || "image/jpeg",
        contentBase64: await fileToBase64(processedFile),
      });

      replacePreviewUrl(URL.createObjectURL(processedFile));
      setSelectedFileName(processedFile.name);
      setUploaded(true);
      toast.success("Photo sent to the registration form.");
    } catch (uploadError) {
      replacePreviewUrl(null);
      setSelectedFileName(null);
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload the photo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) {
      return;
    }

    await handleFile(file);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">DVC Registration</p>
          <h1 className="text-2xl font-bold text-foreground">Send Student Photo</h1>
        </div>
        <Badge variant={uploaded ? "default" : "outline"}>{uploaded ? "Sent" : "Phone upload"}</Badge>
      </div>

      {!draftId ? (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Invalid upload link</AlertTitle>
          <AlertDescription>
            Open this page by scanning the code from the Student Photo modal.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="overflow-hidden rounded-2xl border border-dashed border-border bg-muted/20">
              {selectedPreviewUrl ? (
                <img src={selectedPreviewUrl} alt="Uploaded student photo preview" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">Take a new photo or upload one</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Choose how to send the student photo. It will be checked, cleaned to a white background, and sent back to the open registration form.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {selectedFileName && (
              <p className="mt-3 text-xs font-medium break-all text-foreground">Current file: {selectedFileName}</p>
            )}
          </div>

          {submitting && (
            <Alert className="border-primary/30 bg-primary/5 text-primary">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              <AlertTitle>Processing photo</AlertTitle>
              <AlertDescription className="text-primary/80">
                Cleaning the background and sending it to the registration form.
              </AlertDescription>
            </Alert>
          )}

          {uploaded && (
            <Alert className="border-success/30 bg-success/5 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Photo sent</AlertTitle>
              <AlertDescription className="text-success/80">
                You can return to the device with the registration form. It should update automatically.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Photo not sent</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label htmlFor="mobile-student-photo" className="text-sm font-medium text-foreground">
              Student photo
            </Label>
            <Input
              ref={cameraInputRef}
              id="mobile-student-photo-camera"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="hidden"
              onChange={(event) => {
                void handleFileSelect(event);
              }}
            />
            <Input
              ref={fileInputRef}
              id="mobile-student-photo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                void handleFileSelect(event);
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                className="h-12 w-full text-base font-semibold"
                onClick={() => cameraInputRef.current?.click()}
                disabled={submitting}
              >
                <Camera className="h-4 w-4" />
                {uploaded ? "Take Another Photo" : "Take Photo"}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 w-full text-base font-semibold"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                <Upload className="h-4 w-4" />
                {uploaded ? "Upload Another File" : "Upload File"}
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Take Photo opens the camera. Upload File lets you choose an existing JPG, PNG, or WEBP from this device.
            </p>
          </div>

          <p className="text-center text-xs leading-5 text-muted-foreground">
            Keep this link private. It only connects to the current registration draft photo.
          </p>
        </div>
      )}

      <Link to="/" className="mt-auto pt-8 text-center text-sm font-medium text-primary underline underline-offset-4">
        Back to registration
      </Link>
    </main>
  );
};

export default MobilePhotoUpload;
