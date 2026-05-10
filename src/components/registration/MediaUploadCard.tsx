import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaUploadCardProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHint: string;
  previewUrl: string | null;
  fileName: string | null;
  uploading?: boolean;
  error?: string | null;
  previewAspectClassName?: string;
  icon: ReactNode;
  onActionPressStart?: () => void;
  onAction: () => void;
  onClear: () => void;
}

const MediaUploadCard = ({
  title,
  description,
  actionLabel,
  actionHint,
  previewUrl,
  fileName,
  uploading = false,
  error = null,
  previewAspectClassName,
  icon,
  onActionPressStart,
  onAction,
  onClear,
}: MediaUploadCardProps) => {
  const statusLabel = uploading ? "Uploading" : previewUrl ? "Ready" : "Required";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant={uploading ? "secondary" : previewUrl ? "default" : "outline"} className="shrink-0">
          {statusLabel}
        </Badge>
      </div>

      <div className={cn("mt-4 overflow-hidden rounded-2xl border border-dashed border-border bg-muted/20", previewAspectClassName)}>
        {previewUrl ? (
          <img src={previewUrl} alt={`${title} preview`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm">
              {icon}
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{title}</p>
              <p className="text-sm leading-6 text-muted-foreground">{actionHint}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onPointerDown={onActionPressStart}
            onClick={onAction}
            disabled={uploading}
          >
            {actionLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={onClear}
            disabled={uploading || (!previewUrl && !fileName)}
          >
            Remove
          </Button>
        </div>

        <div className="space-y-1">
          <p className="text-xs leading-5 text-muted-foreground">{actionHint}</p>
          {fileName && <p className="text-xs font-medium break-all text-foreground">Current file: {fileName}</p>}
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          {previewUrl && !error && (
            <p className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              File is ready to be submitted.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaUploadCard;
