import { useEffect, useRef } from "react";
import type { BoundingBox, ConfidenceTier } from "../../types/Socket";

interface Props {
  boxes: BoundingBox[];
  width: number;
  height: number;
}

/**
 * Canvas overlay that draws bounding boxes color-coded by ArcFace
 * confidence tier (Deng et al., CVPR 2019 similarity distributions):
 *
 *   "high"     (≥ 0.55)    → green  #22c55e  — confident match
 *   "moderate" (0.40–0.54) → amber  #f59e0b  — probable match, review
 *   "low" / Unknown        → red    #ef4444  — unknown / uncertain
 *
 * VGGFace2 (Cao et al., 2018) shows cross-pose pairs average ~0.49–0.69
 * similarity, so amber is expected and normal for profile-view cameras.
 */

const TIER_COLORS: Record<ConfidenceTier, string> = {
  high:     "#22c55e",   // green-500
  moderate: "#f59e0b",   // amber-500
  low:      "#ef4444",   // red-500
};
const UNKNOWN_COLOR = "#ef4444";

function tierColor(box: BoundingBox): string {
  if (!box.label || box.label === "Unknown") return UNKNOWN_COLOR;
  return TIER_COLORS[box.confidence_tier ?? "high"];
}

export default function OverlayBoundingBox({ boxes, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";

    for (const box of boxes) {
      const color = tierColor(box);
      ctx.lineWidth = box.confidence_tier === "high" ? 2 : 1.5;
      ctx.strokeStyle = color;

      // Dashed border for moderate tier (indicates need for review)
      if (box.confidence_tier === "moderate") {
        ctx.setLineDash([4, 3]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);

      if (box.label) {
        const pct =
          box.confidence != null
            ? ` ${(box.confidence * 100).toFixed(0)}%`
            : "";
        const tierTag =
          box.confidence_tier === "moderate" ? " ⚠" :
          box.confidence_tier === "low"      ? " ?" : "";
        const label = `${box.label}${pct}${tierTag}`;

        const textY = Math.max(13, box.y - 4);
        const metrics = ctx.measureText(label);
        const textW = metrics.width;

        // Background pill
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.beginPath();
        ctx.roundRect?.(box.x, textY - 12, textW + 10, 15, 3);
        ctx.fill();

        // Label text
        ctx.fillStyle = color;
        ctx.fillText(label, box.x + 5, textY);
      }
    }
  }, [boxes, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
