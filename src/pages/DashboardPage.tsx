import { useEffect, useState } from "react";
import CameraGrid from "../components/CameraGrid";
import { useAuthStore } from "../store/authStore";
import { disconnectSocket, useSocket } from "../services/socketService";
import { formatTime } from "../utils/format";
import type { Alert } from "../types/Alert";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { socket, connected } = useSocket();

  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);

  // Subscribe to backend alerts and keep the last 20 in a side panel.
  useEffect(() => {
    const onAlert = (alert: Alert) => {
      setRecentAlerts((prev) => [alert, ...prev].slice(0, 20));
    };
    socket.on("alert", onAlert);
    return () => {
      socket.off("alert", onAlert);
    };
  }, [socket]);

  const onLogout = () => {
    disconnectSocket();
    logout();
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-orix-border bg-orix-surface/60 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">ORIX Dashboard</h1>
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-orix-success" : "bg-orix-danger animate-pulse"
              }`}
              title={connected ? "Socket connected" : "Socket disconnected"}
            />
            <span className="text-xs text-zinc-400">
              {connected ? "Live" : "Reconnecting…"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-[11px] uppercase tracking-wider text-zinc-400">
                {user?.role}
              </p>
            </div>
            <button className="btn-danger" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 p-4">
        <CameraGrid />

        <aside className="card p-4 flex flex-col min-h-0">
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider text-zinc-400">
            Recent Alerts
          </h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {recentAlerts.length === 0 ? (
              <p className="text-xs text-zinc-500">No alerts yet.</p>
            ) : (
              recentAlerts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border border-orix-border bg-orix-bg/50 p-2 text-xs"
                >
                  <div className="flex justify-between text-zinc-400">
                    <span className="uppercase">{a.type}</span>
                    <span>{formatTime(a.timestamp)}</span>
                  </div>
                  <p className="text-white mt-1">{a.message}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
