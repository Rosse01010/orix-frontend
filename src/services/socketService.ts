import { io, Socket } from "socket.io-client";
import type {
  OrixSocket,
  ServerToClientEvents,
  ClientToServerEvents,
  BoundingBox,
} from "../types/Socket";
import type { Alert } from "../types/Alert";
import type { FaceCandidate } from "../types/Candidate";
import { envString } from "../utils/helpers";

/**
 * Socket.IO client for the ORIX backend.
 *
 * The backend (FastAPI + python-socketio) emits:
 *   "detection-result"  → { cameraId, boxes: BoundingBox[], candidates: FaceCandidate[] }
 *   "alert"             → Alert payload
 *   "camera-status"     → { cameraId, status }
 *
 * BoundingBox.confidence_tier is set by the backend based on ArcFace cosine
 * similarity distributions (Deng et al., CVPR 2019):
 *   "high"     ≥ 0.55  → green overlay
 *   "moderate" 0.40–0.54 → amber dashed overlay (review recommended)
 *   "low"      < 0.40  → red overlay (unknown / uncertain)
 */

const SOCKET_URL = envString("VITE_SOCKET_URL", "http://localhost:8000");

type Handler = (...args: unknown[]) => void;

/**
 * Normalises a raw detection-result payload coming from the backend.
 * Maps the backend field `label` ← `name` (backend uses "name", frontend uses "label")
 * and ensures confidence_tier is present with a sane default.
 */
function normaliseBoundingBoxes(raw: unknown[]): BoundingBox[] {
  return (raw ?? []).map((b: unknown) => {
    const box = b as Record<string, unknown>;
    return {
      x:                Number(box.x ?? 0),
      y:                Number(box.y ?? 0),
      width:            Number(box.width ?? 0),
      height:           Number(box.height ?? 0),
      label:            String(box.label ?? box.name ?? "Unknown"),
      confidence:       typeof box.confidence === "number" ? box.confidence : undefined,
      confidence_tier:  (box.confidence_tier as BoundingBox["confidence_tier"]) ?? "low",
      quality:          typeof box.quality === "number" ? box.quality : undefined,
      angle:            typeof box.angle === "string" ? box.angle : undefined,
    };
  });
}

/**
 * Adapts a "face_detected" legacy event (raw WebSocket era) into an Alert.
 * Kept for backward compatibility if the backend ever sends this format.
 */
function legacyEventToAlert(raw: Record<string, unknown>): Alert | null {
  if (raw.event !== "face_detected") return null;

  const status     = raw.status === "matched" ? "matched" : "unknown";
  const personName = typeof raw.person_name === "string" ? raw.person_name : null;
  const similarity = typeof raw.similarity === "number" ? raw.similarity : null;

  let isoTimestamp = new Date().toISOString();
  const rawTs = raw.timestamp;
  if (typeof rawTs === "string" || typeof rawTs === "number") {
    const seconds = Number(rawTs);
    if (Number.isFinite(seconds) && seconds > 0) {
      isoTimestamp = new Date(seconds * 1000).toISOString();
    }
  }

  const message =
    status === "matched"
      ? `${personName ?? "Known person"} detected${
          similarity !== null ? ` (sim ${similarity.toFixed(2)})` : ""
        }`
      : "Unknown face detected";

  return {
    id:        typeof raw.event_id === "string" ? raw.event_id : crypto.randomUUID(),
    cameraId:  typeof raw.camera_id === "string" ? raw.camera_id : "unknown",
    type:      "face-detected",
    level:     status === "matched" ? "info" : "warning",
    message,
    timestamp: isoTimestamp,
    personId:  typeof raw.person_id === "string" ? raw.person_id : null,
    meta: { status, personName, similarity, confidence: raw.confidence ?? null },
  };
}

/**
 * Thin adapter that wraps socket.io-client's Socket behind the OrixSocket
 * interface so the rest of the app continues to use `.on / .off / .emit`.
 *
 * Key responsibilities:
 *  1. Normalise BoundingBox fields (name→label, ensure confidence_tier)
 *  2. Handle legacy face_detected events for backward compat
 *  3. Expose the same connect/disconnect/connected surface
 */
class OrixSocketClient implements OrixSocket {
  public id: string | null = null;
  public connected         = false;

  private readonly sio: Socket<ServerToClientEvents, ClientToServerEvents>;
  private readonly extraListeners: Map<string, Set<Handler>> = new Map();

  constructor(url: string) {
    this.sio = io(url, {
      transports:       ["websocket", "polling"],
      autoConnect:      false,
      reconnection:     true,
      reconnectionDelay:     1000,
      reconnectionDelayMax:  5000,
      reconnectionAttempts:  Infinity,
    });

    this.sio.on("connect", () => {
      this.connected = true;
      this.id        = this.sio.id ?? null;
      this._dispatch("connect");
    });

    this.sio.on("disconnect", (reason) => {
      this.connected = false;
      this.id        = null;
      this._dispatch("disconnect", reason);
    });

    // ── detection-result: normalise boxes + forward candidates ──────────
    this.sio.on("detection-result", (payload) => {
      const normalised = {
        cameraId:   payload.cameraId,
        boxes:      normaliseBoundingBoxes(payload.boxes as unknown[]),
        candidates: (payload.candidates ?? []) as FaceCandidate[],
      };
      this._dispatch("detection-result", normalised);
    });

    // ── alert: forward as-is ────────────────────────────────────────────
    this.sio.on("alert", (alert) => {
      this._dispatch("alert", alert);
    });

    // ── camera-status: forward as-is ────────────────────────────────────
    this.sio.on("camera-status", (payload) => {
      this._dispatch("camera-status", payload);
    });
  }

  connect(): void {
    if (!this.sio.connected) this.sio.connect();
  }

  disconnect(): void {
    this.sio.disconnect();
    this.connected = false;
    this.id        = null;
  }

  on(event: string, handler: Handler): void {
    // Use socket.io's built-in listener for known events; store extras locally
    let set = this.extraListeners.get(event);
    if (!set) { set = new Set(); this.extraListeners.set(event, set); }
    set.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.extraListeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    // Forward known client→server events through socket.io
    const knownClientEvents = [
      "face-detected", "ack-alert", "subscribe-camera", "unsubscribe-camera",
    ] as const;
    if (knownClientEvents.includes(event as typeof knownClientEvents[number])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.sio.emit as any)(event, ...args);
    }
    // Always fan out locally so UI subscriptions work in dev/offline
    this._dispatch(event, ...args);
  }

  private _dispatch(event: string, ...args: unknown[]): void {
    const set = this.extraListeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[socket] handler for "${event}" threw:`, err);
      }
    }
  }
}

// Singleton — shared across all hooks and components
let _socket: OrixSocketClient | null = null;

export function getSocket(): OrixSocket {
  if (_socket) return _socket;
  _socket = new OrixSocketClient(SOCKET_URL);
  _socket.connect();
  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) { _socket.disconnect(); _socket = null; }
}

// Re-export hook for backward compat
export { useSocket } from "../hooks/useSocket";
