import type { Alert } from "../../types/Alert";
import { cn } from "../../utils/cn";
import { formatTime } from "../../utils/format";

interface Props {
  alert: Alert;
}

const LEVEL_STYLES: Record<Alert["level"], string> = {
  info:     "bg-blue-600/80 border-blue-400/60",
  warning:  "bg-amber-600/80 border-amber-400/60",
  critical: "bg-red-600/80 border-red-400/60 animate-pulse",
};

/**
 * In-frame alert banner shown inside each CameraFeed card.
 * Shows a "Review" badge when the backend marked the detection as
 * "moderate" confidence (ArcFace 0.40–0.54 overlap zone).
 */
export default function AlertBanner({ alert }: Props) {
  const tier = alert.meta?.confidence_tier as string | undefined;
  const isModerate = tier === "moderate";

  return (
    <div
      role="alert"
      className={cn(
        "rounded border text-white text-xs px-2 py-1 shadow-md backdrop-blur-sm flex justify-between gap-2",
        LEVEL_STYLES[alert.level]
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate">{alert.message}</span>
        {isModerate && (
          <span className="text-[9px] bg-white/20 px-1 py-0.5 rounded shrink-0">
            Review
          </span>
        )}
      </div>
      <span className="opacity-70 shrink-0">{formatTime(alert.timestamp)}</span>
    </div>
  );
}
