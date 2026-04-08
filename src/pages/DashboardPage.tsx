import { useEffect } from "react";
import CameraGrid from "../components/cameras/CameraGrid";
import { useSocket } from "../services/socketService";
import { useAlertStore } from "../store/alertStore";
import { useCameraStore } from "../store/cameraStore";
import { formatTime } from "../utils/format";
import { notifyAlert } from "../services/alertService";

/**
 * Main dashboard. Loads the camera list on mount, wires a global alert
 * subscription, and renders the grid + recent alerts side panel.
 */
export default function DashboardPage() {
  const { socket } = useSocket();

  const cameras = useCameraStore((s) => s.cameras);
  const fetchCameras = useCameraStore((s) => s.fetchAll);

  const alerts = useAlertStore((s) => s.alerts);
  const pushAlert = useAlertStore((s) => s.push);

  // Initial data load.
  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // Subscribe once, centrally, to every backend alert and push into the
  // store. Individual CameraFeeds only render what's relevant to them.
  useEffect(() => {
    const onAlert = (alert: Parameters<typeof pushAlert>[0]) => {
      pushAlert(alert);
      const cam = cameras.find((c) => c.id === alert.cameraId);
      notifyAlert(alert, cam?.name);
    };
    socket.on("alert", onAlert);
    return () => {
      socket.off("alert", onAlert);
    };
  }, [socket, pushAlert, cameras]);

  // Keep the camera-status store in sync with server-pushed events.
  const setCameraStatus = useCameraStore((s) => s.setStatus);
  useEffect(() => {
    const onStatus = (payload: { cameraId: string; status: string }) => {
      setCameraStatus(
        payload.cameraId,
        payload.status as Parameters<typeof setCameraStatus>[1]
      );
    };
    socket.on("camera-status", onStatus);
    return () => {
      socket.off("camera-status", onStatus);
    };
  }, [socket, setCameraStatus]);

  return (
    <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-3 sm:gap-4">
      <CameraGrid />

      <aside className="card p-3 sm:p-4 flex flex-col min-h-0 max-h-[40vh] xl:max-h-none">
        <h2 className="text-sm font-semibold mb-2 sm:mb-3 uppercase tracking-wider text-zinc-400">
          Recent Alerts
        </h2>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {alerts.length === 0 ? (
            <p className="text-xs text-zinc-500">No alerts yet.</p>
          ) : (
            alerts.map((a) => (
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
    </div>
  );
}
