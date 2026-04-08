import { io, Socket } from "socket.io-client";
import { useEffect, useRef } from "react";

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
  "http://localhost:4000";

export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") },
    });
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}
