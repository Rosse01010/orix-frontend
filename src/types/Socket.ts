import type { Socket } from "socket.io-client";
import type { Alert } from "./Alert";
import type { CameraStatus } from "./Camera";
import type { FaceCandidate } from "./Candidate";

/**
 * Events the ORIX backend pushes to the client.
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

/**
 * Events the client emits to the backend.
 */
export interface ClientToServerEvents {
  "face-detected": (payload: { cameraId: string; count: number }) => void;
  "ack-alert": (payload: { alertId: string }) => void;
  "subscribe-camera": (payload: { cameraId: string }) => void;
  "unsubscribe-camera": (payload: { cameraId: string }) => void;
}

/**
 * Normalized bounding box shape used for overlays.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
  quality?: number;
  angle?: string;
}

export type OrixSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
