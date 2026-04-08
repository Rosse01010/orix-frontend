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
        <div className="px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
              <span className="sm:hidden">ORIX</span>
              <span className="hidden sm:inline">ORIX Dashboard</span>
            </h1>
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                connected ? "bg-orix-success" : "bg-orix-danger animate-pulse"
              }`}
              title={connected ? "Socket connected" : "Socket disconnected"}
            />
            <span className="hidden sm:inline text-xs text-zinc-400">
              {connected ? "Live" : "Reconnecting…"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden xs:block text-right leading-tight">
              <p className="text-sm font-medium truncate max-w-[120px]">
                {user?.username}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-zinc-400">
                {user?.role}
              </p>
            </div>
            <button
              className="btn-danger px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm"
              onClick={onLogout}
              aria-label="Logout"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-3 sm:gap-4 p-2 sm:p-4">
        <CameraGrid />

        <aside className="card p-3 sm:p-4 flex flex-col min-h-0 max-h-[40vh] xl:max-h-none">
          <h2 className="text-sm font-semibold mb-2 sm:mb-3 uppercase tracking-wider text-zinc-400">
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
                  <div className="flex justify-between gap-2 text-zinc-400">
                    <span className="uppercase truncate">{a.type}</span>
                    <span className="shrink-0">{formatTime(a.timestamp)}</span>
                  </div>
                  <p className="text-white mt-1 break-words">{a.message}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
