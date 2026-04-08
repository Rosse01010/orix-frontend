import type { Socket } from "socket.io-client";
import type { Alert } from "./Alert";
import type { CameraStatus } from "./Camera";

/**
 * Events the ORIX backend pushes to the client.
 */
export interface ServerToClientEvents {
  alert: (alert: Alert) => void;
  "camera-status": (payload: { cameraId: string; status: CameraStatus }) => void;
  "detection-result": (payload: {
    cameraId: string;
    boxes: BoundingBox[];
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
 * Normalized bounding box shape used for overlays. Coordinates are in the
 * display (CSS) pixel space of the <video> element so the canvas can render
 * them directly.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
}

export type OrixSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
