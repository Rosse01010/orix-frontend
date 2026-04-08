import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { toast } from "react-toastify";
import AlertBanner from "./AlertBanner";
import { useSocket } from "../services/socketService";
import type { Camera } from "../types/Camera";
import type { Alert } from "../types/Alert";
import { shortId } from "../utils/format";

interface Props {
  camera: Camera;
}

/**
 * Tracks whether the face-api tiny detector has been loaded. The models
 * live in /public/models and must be downloaded separately (see README).
 * We load them once per app lifetime, not per camera.
 */
let modelsLoadingPromise: Promise<void> | null = null;
function ensureModelsLoaded(): Promise<void> {
  if (modelsLoadingPromise) return modelsLoadingPromise;
  modelsLoadingPromise = faceapi.nets.tinyFaceDetector
    .loadFromUri("/models")
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(
        "[face-api] Could not load tinyFaceDetector from /models — face detection disabled. Download the models into public/models to enable it.",
        err
      );
    });
  return modelsLoadingPromise;
}

export default function CameraFeed({ camera }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { socket } = useSocket();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);

  // Load face-api models exactly once per app.
  useEffect(() => {
    let cancelled = false;
    ensureModelsLoaded().then(() => {
      if (!cancelled) setModelsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Attach the stream to the <video> element. We track load failures so the
  // UI can surface "camera unavailable" instead of a silent black square.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setVideoError(null);
    video.src = camera.streamUrl;
    const onError = () => setVideoError("Video stream unavailable");
    video.addEventListener("error", onError);
    video.play().catch(() => setVideoError("Autoplay blocked"));

    return () => {
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [camera.streamUrl]);

  // Subscribe to backend alerts for this camera so banners can show
  // alerts emitted by the server (motion, intrusion, etc.), not only
  // local face-detection events.
  useEffect(() => {
    const onAlert = (alert: Alert) => {
      if (alert.cameraId !== camera.id) return;
      setAlerts((prev) => [alert, ...prev].slice(0, 3));
      toast.warn(`[${camera.name}] ${alert.message}`);
    };
    socket.on("alert", onAlert);
    return () => {
      socket.off("alert", onAlert);
    };
  }, [camera.id, camera.name, socket]);

  // Run face detection every second. Only active once models are ready
  // and the video is actually playing.
  useEffect(() => {
    if (!modelsReady || videoError) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const displaySize = {
        width: video.clientWidth,
        height: video.clientHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      try {
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions()
        );
        const resized = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);

        if (detections.length > 0) {
          const msg = `${detections.length} face(s) detected`;
          const alert: Alert = {
            id: shortId(),
            cameraId: camera.id,
            type: "face-detected",
            level: "info",
            message: msg,
            timestamp: new Date().toISOString(),
            meta: { count: detections.length },
          };
          setAlerts((prev) => [alert, ...prev].slice(0, 3));
          toast.info(`[${camera.name}] ${msg}`);
          socket.emit("face-detected", {
            cameraId: camera.id,
            count: detections.length,
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[${camera.id}] detection failed`, err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [camera.id, camera.name, modelsReady, videoError, socket]);

  return (
    <div className="card relative overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border-b border-orix-border bg-orix-bg/50">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium truncate">
            {camera.name}
          </p>
          <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
            {camera.location}
          </p>
        </div>
        <span
          className={`text-[9px] sm:text-[10px] uppercase px-1.5 sm:px-2 py-0.5 rounded shrink-0 ${
            videoError
              ? "bg-red-900/60 text-red-200"
              : "bg-green-900/60 text-green-200"
          }`}
        >
          {videoError ? "offline" : camera.status}
        </span>
      </div>

      <div className="relative flex-1 bg-black aspect-video sm:aspect-auto sm:min-h-[200px] md:min-h-[240px]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-3">
            <div className="text-center">
              <p className="text-red-400 font-semibold text-xs sm:text-sm">
                {videoError}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 break-all">
                {camera.streamUrl}
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 right-1.5 sm:left-2 sm:right-2 flex flex-col gap-1 pointer-events-none">
          {alerts.map((a) => (
            <AlertBanner key={a.id} alert={a} />
          ))}
        </div>
      </div>
    </div>
  );
}
