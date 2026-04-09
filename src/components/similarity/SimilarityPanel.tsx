import { useState } from "react";
import { toast } from "react-toastify";
import { confirmCandidate } from "../../api/candidateApi";
import { useCandidateStore } from "../../store/candidateStore";
import type { FaceCandidate, CandidateMatch } from "../../types/Candidate";
import type { ConfidenceTier } from "../../types/Socket";

/**
 * SimilarityPanel
 * ───────────────
 * Slide-in panel showing faces that need operator confirmation.
 *
 * A face appears here when:
 *   (a) no person exceeded the similarity threshold → is_unknown = true
 *   (b) best match is in the 0.40–0.54 "moderate" zone → confidence_tier = "moderate"
 *       (VGGFace2 shows this is normal for off-axis / age-gap faces)
 *   (c) |yaw| > 30° even if recognised → off-axis false-accept guard
 *
 * Candidate similarity bars are color-coded per ArcFace distributions
 * (Deng et al., CVPR 2019 — Figure 7):
 *   ≥ 55%  → green  (positive pair cluster, high confidence)
 *   40–54% → amber  (overlap zone, probable match)
 *   30–39% → zinc   (border of negative distribution, weak signal)
 */
export default function SimilarityPanel() {
  const pending = useCandidateStore((s) => s.pending);
  const remove  = useCandidateStore((s) => s.remove);

  if (pending.length === 0) return null;

  const unknownCount   = pending.filter((f) => f.is_unknown).length;
  const moderateCount  = pending.filter((f) => !f.is_unknown && f.confidence_tier === "moderate").length;

  return (
    <aside className="fixed top-0 right-0 h-full w-80 z-50 flex flex-col
                       bg-zinc-900 border-l border-zinc-700 shadow-2xl
                       overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
                       border-b border-zinc-700 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white">Similarity Panel</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {unknownCount > 0 && (
              <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded">
                {unknownCount} unknown
              </span>
            )}
            {moderateCount > 0 && (
              <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded">
                {moderateCount} review
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => useCandidateStore.getState().clear()}
          className="text-zinc-500 hover:text-white text-xs px-2 py-1
                     rounded hover:bg-zinc-700 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Face cards */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {pending.map((face) => (
          <FaceCard
            key={`${face.cameraId}-${face.face_index}-${face.timestamp}`}
            face={face}
            onDismiss={() => remove(face.face_index, face.cameraId)}
          />
        ))}
      </div>
    </aside>
  );
}


/* ── Individual face card ─────────────────────────────────────────────────── */

function FaceCard({
  face,
  onDismiss,
}: {
  face: FaceCandidate;
  onDismiss: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  const angleLabel = formatAngle(face.yaw);
  const isOffAxis  = Math.abs(face.yaw) > 30;
  const tier       = face.confidence_tier ?? (face.is_unknown ? "low" : "moderate");

  async function handleConfirm(match: CandidateMatch) {
    if (!face.embedding) {
      toast.warn("No embedding available for confirmation.");
      return;
    }
    setConfirming(match.person_id);
    try {
      const res = await confirmCandidate({
        person_id:     match.person_id,
        embedding:     face.embedding,
        angle_hint:    face.bbox.angle,
        quality_score: 0.7,
        camera_id:     face.cameraId,
      });
      toast.success(
        `✓ ${res.name} confirmed — now has ${res.embeddings_total} embeddings.`
      );
      onDismiss();
    } catch {
      toast.error("Could not confirm identity. Try again.");
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${tierBorderClass(tier)}`}>
      {/* Face info bar */}
      <div className={`px-3 py-2 flex items-center justify-between
                        border-b ${tierHeaderClass(tier)}`}>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-white">
              {face.is_unknown ? "Unknown face" : face.bbox.name}
            </span>
            <TierBadge tier={tier} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CamBadge cameraId={face.cameraId} />
            <AngleBadge label={angleLabel} isOff={isOffAxis} />
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-zinc-600 hover:text-zinc-300 text-lg leading-none
                     px-1 transition-colors"
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Explanation for moderate tier */}
      {tier === "moderate" && !face.is_unknown && (
        <div className="px-3 py-1.5 bg-amber-950/30 border-b border-amber-900/40">
          <p className="text-[10px] text-amber-300/80 leading-relaxed">
            Similarity in the 0.40–0.54 overlap zone. Common for off-axis or
            age-gap faces. Please confirm or dismiss.
          </p>
        </div>
      )}

      {/* Candidate matches */}
      <div className="p-2 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-1 mb-2">
          Possible matches — click to confirm
        </p>
        {face.top_matches.length === 0 ? (
          <p className="text-xs text-zinc-500 px-1">No candidates found.</p>
        ) : (
          face.top_matches.map((match) => (
            <CandidateRow
              key={match.person_id}
              match={match}
              loading={confirming === match.person_id}
              onConfirm={() => handleConfirm(match)}
            />
          ))
        )}
      </div>
    </div>
  );
}


/* ── Candidate row ────────────────────────────────────────────────────────── */

function CandidateRow({
  match,
  loading,
  onConfirm,
}: {
  match: CandidateMatch;
  loading: boolean;
  onConfirm: () => void;
}) {
  const pct = Math.round(match.similarity * 100);

  // ArcFace similarity color scale (Deng et al., CVPR 2019 Figure 7):
  // ≥55% → green (positive pair cluster), 40–54% → amber (overlap), <40% → zinc
  const barColor =
    pct >= 55 ? "bg-green-500" :
    pct >= 40 ? "bg-amber-500" :
    "bg-zinc-500";

  const tierLabel =
    pct >= 55 ? "High" :
    pct >= 40 ? "Moderate" :
    "Weak";

  return (
    <button
      onClick={onConfirm}
      disabled={loading}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-md
                 bg-zinc-700/50 hover:bg-zinc-700 border border-transparent
                 hover:border-zinc-500 transition-all text-left
                 disabled:opacity-50 disabled:cursor-wait group"
    >
      {/* Avatar placeholder */}
      <div className="w-9 h-9 rounded-full bg-zinc-600 flex items-center
                       justify-center text-white text-sm font-bold shrink-0
                       group-hover:ring-2 group-hover:ring-blue-500 transition-all">
        {match.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + similarity bar */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{match.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-zinc-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-400 shrink-0 w-16 text-right">
            {pct}% · {tierLabel}
          </span>
        </div>
      </div>

      {/* Confirm icon */}
      <div className="shrink-0 text-zinc-500 group-hover:text-green-400
                       transition-colors text-lg">
        {loading ? "⏳" : "✓"}
      </div>
    </button>
  );
}


/* ── Tier badge ───────────────────────────────────────────────────────────── */

function TierBadge({ tier }: { tier: ConfidenceTier }) {
  if (tier === "high") return null; // No badge needed for high confidence
  const cls =
    tier === "moderate"
      ? "bg-amber-900/60 text-amber-300"
      : "bg-red-900/60 text-red-300";
  const label = tier === "moderate" ? "Review" : "Unknown";
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

function tierBorderClass(tier: ConfidenceTier): string {
  return tier === "moderate"
    ? "border-amber-800/60 bg-zinc-800"
    : tier === "low"
    ? "border-red-900/60 bg-zinc-800"
    : "border-zinc-700 bg-zinc-800";
}

function tierHeaderClass(tier: ConfidenceTier): string {
  return tier === "moderate"
    ? "border-amber-900/40 bg-amber-950/20"
    : tier === "low"
    ? "border-red-900/40 bg-red-950/10"
    : "border-zinc-700 bg-zinc-800/80";
}


/* ── Small badges ─────────────────────────────────────────────────────────── */

function CamBadge({ cameraId }: { cameraId: string }) {
  return (
    <span className="text-[9px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">
      {cameraId}
    </span>
  );
}

function AngleBadge({ label, isOff }: { label: string; isOff: boolean }) {
  return (
    <span
      className={`text-[9px] px-1.5 py-0.5 rounded ${
        isOff
          ? "bg-orange-900/60 text-orange-300"
          : "bg-zinc-700 text-zinc-400"
      }`}
    >
      {label}
    </span>
  );
}


/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatAngle(yaw: number): string {
  const abs = Math.abs(yaw);
  if (abs <= 15)  return "Frontal";
  if (abs <= 30)  return yaw < 0 ? "Slight right" : "Slight left";
  if (abs <= 60)  return yaw < 0 ? "Right profile" : "Left profile";
  return yaw < 0 ? "Far right" : "Far left";
}
