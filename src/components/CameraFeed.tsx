import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { useSocket } from "../services/socketService";
import { toast } from "react-toastify";
import AlertBanner from "./AlertBanner";

interface Props {
  cameraId: string;
  streamUrl: string;
}

export default function CameraFeed({ cameraId, streamUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socket = useSocket();
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    faceapi.nets.tinyFaceDetector.loadFromUri("/models").catch(console.error);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = streamUrl;
      videoRef.current.play().catch(console.error);
    }
  }, [streamUrl]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const displaySize = {
        width: videoRef.current.width || videoRef.current.clientWidth,
        height: videoRef.current.height || videoRef.current.clientHeight,
      };
      faceapi.matchDimensions(canvasRef.current, displaySize);
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );
      const resized = faceapi.resizeResults(detections, displaySize);
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, resized);
      }
      if (detections.length > 0) {
        const msg = `Detectadas ${detections.length} caras en ${cameraId}`;
        setAlerts((prev) => [msg, ...prev.slice(0, 4)]);
        toast.info(msg);
        socket?.emit("face-detected", { cameraId, count: detections.length });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cameraId, socket]);

  return (
    <div className="relative border rounded shadow-md">
      <video ref={videoRef} className="w-full h-64 bg-black rounded" muted />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-64 pointer-events-none"
      />
      {alerts.map((a, i) => (
        <AlertBanner key={i} message={a} />
      ))}
    </div>
  );
}
