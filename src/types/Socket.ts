import type { Alert } from "./Alert";
import type { CameraStatus } from "./Camera";
import type { FaceCandidate } from "./Candidate";

/**
 * Events the ORIX backend pushes to the client via Socket.IO.
 */
export interface ServerToClientEvents {
  alert: (alert: Alert) => void;
  "camera-status": (payload: { cameraId: string; status: CameraStatus }) => void;
  "detection-result": (payload: {
    cameraId: string;
    boxes: BoundingBox[];
    /** Faces that need operator confirmation (off-angle or unknown) */
    candidates: FaceCandidate[];
  }) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
}

export interface ClientToServerEvents {
  "face-detected": (payload: { cameraId: string; count: number }) => void;
  "ack-alert": (payload: { alertId: string }) => void;
  "subscribe-camera": (payload: { cameraId: string }) => void;
  "unsubscribe-camera": (payload: { cameraId: string }) => void;
}

/**
 * Confidence tier derived from ArcFace cosine similarity distributions
 * (Deng et al., CVPR 2019 — Figure 7 angle distributions):
 *   "high"     ≥ 0.55  → positive pairs cluster, safe to auto-identify
 *   "moderate" 0.40–0.54 → overlap region, show candidate panel for review
 *   "low"      < 0.40  → likely different identity or poor-quality frame
 *
 * VGGFace2 (Cao et al., 2018 — Table IV) shows front-to-profile similarity
 * averages ~0.49–0.69 even for the best models, so "moderate" is expected
 * for off-axis detections and should not be treated as a hard reject.
 */
export type ConfidenceTier = "high" | "moderate" | "low";

/**
 * Normalized bounding box shape used for overlays.
 * confidence_tier is set by the backend based on ArcFace similarity ranges.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
  /** ArcFace-derived tier: "high" | "moderate" | "low" */
  confidence_tier?: ConfidenceTier;
  quality?: number;
  angle?: string;
}

export interface OrixSocket {
  id: string | null;
  connected: boolean;
  connect(): void;
  disconnect(): void;
  on<E extends keyof ServerToClientEvents>(
    event: E,
    handler: ServerToClientEvents[E]
  ): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off<E extends keyof ServerToClientEvents>(
    event: E,
    handler: ServerToClientEvents[E]
  ): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): void;
  emit(event: string, ...args: unknown[]): void;
}
