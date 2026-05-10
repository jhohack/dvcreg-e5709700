import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, Signature, Undo2, CheckCircle2 } from "lucide-react";

import MediaUploadCard from "@/components/registration/MediaUploadCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SignaturePoint = {
  x: number;
  y: number;
};

type SignatureStroke = SignaturePoint[];

type SignaturePadDialogProps = {
  previewUrl: string | null;
  fileName: string | null;
  uploading?: boolean;
  error?: string | null;
  onUploadFile: (file: File) => Promise<boolean>;
  onClear: () => void;
};

const signatureRequirementItems = [
  {
    title: "Handwritten only",
    description: "Draw it by hand in the pad.",
  },
  {
    title: "Keep it centered",
    description: "Keep the full signature in view.",
  },
  {
    title: "Use the usual one",
    description: "Match the normal school signature.",
  },
  {
    title: "Keep it clean",
    description: "No stamps, borders, or decorations.",
  },
] as const;

const signatureQuickChecks = [
  "Handwritten",
  "Centered",
  "No decorations",
  "Clean strokes",
] as const;

const SignaturePadDialog = ({
  previewUrl,
  fileName,
  uploading = false,
  error = null,
  onUploadFile,
  onClear,
}: SignaturePadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [padError, setPadError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const draftStrokeRef = useRef<SignatureStroke | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  const busy = uploading || submitting;
  const dialogTitle = previewUrl ? "Replace Student Signature" : "Draw Student Signature";

  const drawCanvas = useCallback((committedStrokes: SignatureStroke[] = strokesRef.current, draftStroke: SignatureStroke | null = null) => {
    const canvas = canvasRef.current;
    const { width, height } = canvasSizeRef.current;
    if (!canvas || !width || !height) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#111827";
    ctx.lineWidth = 3.5;

    const renderStroke = (stroke: SignatureStroke) => {
      if (stroke.length === 0) {
        return;
      }

      if (stroke.length === 1) {
        const point = stroke[0];
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      const firstPoint = stroke[0];
      ctx.moveTo(firstPoint.x * width, firstPoint.y * height);
      stroke.slice(1).forEach((point) => {
        ctx.lineTo(point.x * width, point.y * height);
      });
      ctx.stroke();
    };

    committedStrokes.forEach(renderStroke);
    if (draftStroke) {
      renderStroke(draftStroke);
    }
  }, []);

  const syncCanvasSize = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const nextSize = {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    };

    const currentSize = canvasSizeRef.current;
    if (currentSize.width === nextSize.width && currentSize.height === nextSize.height) {
      return;
    }

    canvasSizeRef.current = nextSize;
    drawCanvas(strokesRef.current, draftStrokeRef.current);
  }, [drawCanvas]);

  useEffect(() => {
    strokesRef.current = strokes;
    drawCanvas(strokes, draftStrokeRef.current);
  }, [drawCanvas, strokes]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(syncCanvasSize);
    const resizeObserver = typeof ResizeObserver !== "undefined" && frameRef.current
      ? new ResizeObserver(() => syncCanvasSize())
      : null;

    if (resizeObserver && frameRef.current) {
      resizeObserver.observe(frameRef.current);
    }

    window.addEventListener("resize", syncCanvasSize);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncCanvasSize);
    };
  }, [open, syncCanvasSize]);

  const resetPad = () => {
    draftStrokeRef.current = null;
    pointerIdRef.current = null;
    setIsDrawing(false);
    setPadError(null);
    setStrokes([]);
  };

  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (busy) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);

    const rect = canvas.getBoundingClientRect();
    const point = {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };

    pointerIdRef.current = event.pointerId;
    draftStrokeRef.current = [point];
    setIsDrawing(true);
    setPadError(null);
    drawCanvas(strokesRef.current, draftStrokeRef.current);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || pointerIdRef.current !== event.pointerId || !draftStrokeRef.current) {
      return;
    }

    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const point = {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };

    draftStrokeRef.current = [...draftStrokeRef.current, point];
    drawCanvas(strokesRef.current, draftStrokeRef.current);
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const completedStroke = draftStrokeRef.current;
    draftStrokeRef.current = null;
    pointerIdRef.current = null;
    setIsDrawing(false);

    if (completedStroke && completedStroke.length > 0) {
      setStrokes((current) => [...current, completedStroke]);
      drawCanvas([...strokesRef.current, completedStroke]);
    }

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const undoStroke = () => {
    if (busy || isDrawing || strokes.length === 0) {
      return;
    }

    setPadError(null);
    setStrokes((current) => current.slice(0, -1));
  };

  const clearStroke = () => {
    if (busy) {
      return;
    }

    resetPad();
    drawCanvas([]);
  };

  const saveSignature = async () => {
    if (busy) {
      return;
    }

    if (strokes.length === 0) {
      setPadError("Please draw the signature before saving it.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setPadError("Signature pad is not ready yet.");
      return;
    }

    setSubmitting(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/png");
      });

      if (!blob) {
        throw new Error("Could not export the signature.");
      }

      const file = new File([blob], `student-signature-${Date.now()}.png`, { type: "image/png" });
      const ok = await onUploadFile(file);
      if (ok) {
        setOpen(false);
      }
    } catch (saveError) {
      setPadError(saveError instanceof Error ? saveError.message : "Could not save the signature.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <MediaUploadCard
        title="Signature"
        description="Draw the student's signature."
        actionLabel="Draw Signature"
        actionHint="Use the pad to draw and save a clean PNG."
        previewUrl={previewUrl}
        fileName={fileName}
        uploading={uploading}
        error={error}
        previewAspectClassName="aspect-[16/5]"
        icon={<Signature className="h-5 w-5" />}
        onAction={() => setOpen(true)}
        onClear={onClear}
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            resetPad();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-7xl overflow-y-auto">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Signature className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  Required
                </Badge>
                <DialogTitle className="text-2xl">{dialogTitle}</DialogTitle>
              </div>
            </div>
            <DialogDescription className="max-w-2xl">
              Draw the student's signature in the pad, then save it as a clean PNG.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive" className="border-2 border-destructive/30 bg-destructive/5">
            <Signature className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Typed, blurry, cropped, or decorated signatures will be rejected.
            </AlertDescription>
          </Alert>

          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">Quick checklist</h3>
                  <Badge variant="secondary">Handwritten</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {signatureRequirementItems.map((item, index) => (
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
                {signatureQuickChecks.map((item) => (
                  <Badge key={item} variant="outline" className="bg-muted/40 text-foreground">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div
                ref={frameRef}
                className="relative h-[clamp(360px,44vh,560px)] overflow-hidden rounded-3xl border border-border bg-background shadow-sm"
              >
                <canvas
                  ref={canvasRef}
                  className={cn("h-full w-full touch-none cursor-crosshair")}
                  aria-label="Signature drawing pad"
                  onPointerDown={startStroke}
                  onPointerMove={continueStroke}
                  onPointerUp={finishStroke}
                  onPointerCancel={finishStroke}
                />

                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),rgba(255,255,255,0)_35%,rgba(255,255,255,0.04))]" />
                <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-2 text-xs text-muted-foreground backdrop-blur-sm">
                  Draw inside the box. The saved file will be a clean PNG.
                </div>
              </div>

              {padError && <p className="text-sm font-medium text-destructive">{padError}</p>}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={undoStroke}
                  disabled={busy || isDrawing || strokes.length === 0}
                >
                  <Undo2 className="h-4 w-4" />
                  Undo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={clearStroke}
                  disabled={busy || (strokes.length === 0 && !isDrawing)}
                >
                  <Eraser className="h-4 w-4" />
                  Clear
                </Button>
                <Button
                  type="button"
                  className="w-full sm:ml-auto sm:w-auto"
                  onClick={() => void saveSignature()}
                  disabled={busy || strokes.length === 0 || isDrawing}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? "Saving..." : "Save Signature"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SignaturePadDialog;
