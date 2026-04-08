import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { Alert } from "../types/Alert";
import { getStoredToken } from "./authService";

/**
 * URL of the ORIX realtime backend. Override with VITE_SOCKET_URL in your
 * .env.local to point at a different host when developing against a real
 * backend instead of the simulated one.
 */
const SOCKET_URL: string =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  "http://localhost:4000";

/**
 * Typed event map so callers get autocomplete on emit/on.
 */
export interface ServerToClientEvents {
  alert: (alert: Alert) => void;
  "camera-status": (payload: { cameraId: string; status: string }) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
}

export interface ClientToServerEvents {
  "face-detected": (payload: { cameraId: string; count: number }) => void;
  "ack-alert": (payload: { alertId: string }) => void;
}

export type OrixSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Singleton so every hook consumer shares the same connection. Creating a
// new socket per component would multiply traffic and race-condition events.
let socket: OrixSocket | null = null;

/**
 * Lazily creates (or returns) the shared Socket.IO client with automatic
 * reconnection enabled. Safe to call from anywhere in the app.
 */
export function getSocket(): OrixSocket {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: getStoredToken() },
    // Socket.IO has built-in reconnection; we tune it to be reasonably
    // aggressive for a control-room app where connectivity matters.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
    timeout: 10_000,
    transports: ["websocket", "polling"],
  }) as OrixSocket;

  socket.on("connect", () => {
    // eslint-disable-next-line no-console
    console.info("[socket] connected", socket?.id);
  });
  socket.on("disconnect", (reason) => {
    // eslint-disable-next-line no-console
    console.warn("[socket] disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    // eslint-disable-next-line no-console
    console.warn("[socket] connect_error:", err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * React hook that exposes the shared socket plus its connected state.
 * Components can subscribe to events via the returned `socket` ref.
 */
export function useSocket(): { socket: OrixSocket; connected: boolean } {
  const socketRef = useRef<OrixSocket>(getSocket());
  const [connected, setConnected] = useState<boolean>(
    socketRef.current.connected
  );

  useEffect(() => {
    const s = socketRef.current;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    // If the singleton was created but never connected (e.g. lazy boot),
    // explicitly open it here.
    if (!s.connected) s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      // NOTE: we intentionally do NOT disconnect on unmount — the socket is
      // a shared singleton. Call `disconnectSocket()` on logout instead.
    };
  }, []);

  return { socket: socketRef.current, connected };
}
