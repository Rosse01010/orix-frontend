/**
 * Alerts raised either locally (face detection) or emitted by the backend
 * via WebSocket. The UI consumes them to show toasts and banners.
 */
export type AlertLevel = "info" | "warning" | "critical";

export type AlertType =
  | "face-detected"
  | "motion"
  | "intrusion"
  | "camera-offline"
  | "system";

export interface Alert {
  id: string;
  cameraId: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional metadata (number of faces detected, confidence, etc.) */
  meta?: Record<string, unknown>;
}
