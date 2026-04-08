import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { OrixSocket } from "../types/Socket";
import { getStoredToken } from "./authService";
import { envString } from "../utils/helpers";

const SOCKET_URL = envString("VITE_SOCKET_URL", "http://localhost:4000");

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

    if (!s.connected) s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      // NOTE: do not disconnect on unmount — shared singleton.
    };
  }, []);

  return { socket: socketRef.current, connected };
}
