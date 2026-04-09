/**
 * similarity.ts
 * ─────────────
 * Frontend helpers for interpreting ArcFace cosine similarity scores.
 *
 * All thresholds derived from:
 *   • ArcFace (Deng et al., CVPR 2019) — Figure 7 angle distributions of
 *     positive/negative pairs on LFW, CFP-FP, AgeDB-30, YTF, CPLFW, CALFW.
 *   • VGGFace2 (Cao et al., 2018) — Table IV cross-pose similarity matrices:
 *     front-to-profile averages 0.49–0.69 for VGGFace2-trained models.
 *
 * These ranges match the backend thresholds in app/config.py.
 */

import type { ConfidenceTier } from "../types/Socket";

/** Minimum similarity to display a candidate in the panel */
export const CANDIDATE_MIN_SIM = 0.30;

/** Threshold above which a face is auto-identified (same as backend default) */
export const SIMILARITY_THRESHOLD = 0.40;

/** Threshold above which a match is considered high-confidence */
export const HIGH_CONFIDENCE_THRESHOLD = 0.55;

/**
 * Classify a cosine similarity score into a ConfidenceTier.
 *
 * | Score     | Tier       | Interpretation                              |
 * |-----------|------------|---------------------------------------------|
 * | ≥ 0.55    | "high"     | Positive pair cluster — safe to display     |
 * | 0.40–0.54 | "moderate" | Overlap zone — show candidate panel         |
 * | < 0.40    | "low"      | Likely different identity                   |
 */
export function classifyTier(similarity: number, isUnknown: boolean): ConfidenceTier {
  if (isUnknown) return "low";
  if (similarity >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (similarity >= SIMILARITY_THRESHOLD) return "moderate";
  return "low";
}

/**
 * Human-readable description of a similarity score for tooltips/aria labels.
 */
export function describeSimilarity(similarity: number): string {
  const pct = Math.round(similarity * 100);
  if (similarity >= HIGH_CONFIDENCE_THRESHOLD)
    return `${pct}% — high confidence match`;
  if (similarity >= SIMILARITY_THRESHOLD)
    return `${pct}% — probable match (review recommended)`;
  if (similarity >= CANDIDATE_MIN_SIM)
    return `${pct}% — weak signal (likely different identity)`;
  return `${pct}% — below noise floor`;
}

/**
 * Tailwind color class for a similarity bar, following ArcFace distributions.
 * ≥55% → green, 40–54% → amber, <40% → zinc
 */
export function similarityBarColor(similarity: number): string {
  if (similarity >= HIGH_CONFIDENCE_THRESHOLD) return "bg-green-500";
  if (similarity >= SIMILARITY_THRESHOLD)       return "bg-amber-500";
  return "bg-zinc-500";
}

/**
 * Returns true when a face candidate should trigger the similarity panel.
 * Mirrors the backend logic in db_worker.py:
 *   - is_unknown: no match exceeded the threshold
 *   - moderate tier: match found but in overlap zone
 *   - off-axis: |yaw| > 30° (VGGFace2 shows these are failure-prone)
 */
export function shouldShowPanel(
  isUnknown: boolean,
  tier: ConfidenceTier,
  yawDeg: number
): boolean {
  return isUnknown || tier === "moderate" || Math.abs(yawDeg) > 30;
}
