import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Button from "../components/common/Button";
import { registerPerson } from "../api/recognitionApi";
import type { PersonCreatePayload } from "../api/recognitionApi";

/**
 * Consented enrollment flow.
 *
 * A person opens this page, faces the webcam, and the browser computes a
 * face embedding locally via face-api.js. They fill in their own social
 * handles and we POST to the backend.
 *
 * Quality guidance is shown based on VGGFace2 (Cao et al., 2018) findings:
 * training on multiple poses (front + slight side) significantly improves
 * cross-pose recognition vs. single frontal enrollment. The UI prompts the
 * operator to capture from 3 angles for best results.
 *
 * The embedding is L2-normalised before submission so the backend's
 * ArcFace cosine similarity search works correctly regardless of the
 * face-api.js model's output scale.
 */

type ModelsState = "loading" | "ready" | "failed";

async function loadModels(): Promise<void> {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  ]);
}

interface FormState {
  name: string;
  linkedin_url: string;
  instagram_handle: string;
  twitter_handle: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  linkedin_url: "",
  instagram_handle: "",
  twitter_handle: "",
  notes: "",
};

/** Recommended angles for multi-angle enrollment (VGGFace2 guidance) */
const ANGLE_STEPS = [
  { label: "Frontal", hint: "Look straight at the camera", icon: "🎯" },
  { label: "Slight left", hint: "Turn your face ~20° to the left", icon: "↙" },
  { label: "Slight right", hint: "Turn your face ~20° to the right", icon: "↘" },
];

function l2Normalize(arr: number[]): number[] {
  const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
  return arr.map((v) => v / norm);
}

export default function EnrollPersonPage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [modelsState, setModelsState]   = useState<ModelsState>("loading");
  const [streamError, setStreamError]   = useState<string | null>(null);
  const [embeddings, setEmbeddings]     = useState<number[][]>([]);
  const [capturedAngles, setCapturedAngles] = useState<string[]>([]);
  const [capturing, setCapturing]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [message, setMessage]           = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const currentStep = Math.min(capturedAngles.length, ANGLE_STEPS.length - 1);
  const allAnglesDone = capturedAngles.length >= ANGLE_STEPS.length;

  useEffect(() => {
    let cancelled = false;
    loadModels()
      .then(() => { if (!cancelled) setModelsState("ready"); })
      .catch((err) => {
        console.error("[enroll] failed to load models:", err);
        if (!cancelled) setModelsState("failed");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let mediaStream: MediaStream | null = null;

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        mediaStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => setStreamError("Autoplay blocked"));
        }
      })
      .catch((err) => {
        console.warn("[enroll] getUserMedia failed:", err);
        setStreamError("Webcam permission denied");
      });

    return () => {
      cancelled = true;
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function handleCapture() {
    if (modelsState !== "ready" || !videoRef.current) return;
    setCapturing(true);
    setError(null);

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("No face detected — center your face in the frame.");
        return;
      }

      // L2-normalise for ArcFace cosine similarity compatibility
      const normalized = l2Normalize(Array.from(detection.descriptor));
      const angleLabel = ANGLE_STEPS[capturedAngles.length]?.label ?? "extra";

      setEmbeddings((prev) => [...prev, normalized]);
      setCapturedAngles((prev) => [...prev, angleLabel]);

      // Draw feedback on canvas
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (canvas && video) {
        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const resized = faceapi.resizeResults(detection, displaySize);
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, [resized.detection]);
        faceapi.draw.drawFaceLandmarks(canvas, [resized]);
      }
    } finally {
      setCapturing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (embeddings.length === 0) { setError("Capture at least one face first."); return; }
    if (!form.name.trim())       { setError("Name is required."); return; }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      // Send the first (frontal) embedding as the primary — the backend
      // will also accept it and store a template embedding if >1 is provided.
      // For multi-angle, the operator can add more photos via /api/recognition/persons/:id/photos.
      const payload: PersonCreatePayload = {
        name:              form.name.trim(),
        embedding:         embeddings[0],
        linkedin_url:      form.linkedin_url.trim() || null,
        instagram_handle:  form.instagram_handle.trim() || null,
        twitter_handle:    form.twitter_handle.trim() || null,
        notes:             form.notes.trim() || null,
      };
      const res = await registerPerson(payload);
      const angleNote = embeddings.length > 1
        ? ` Captured ${embeddings.length} angles.`
        : " Consider adding more angles via the admin panel for better cross-pose recognition.";
      setMessage(`Enrolled "${res.name}" (id: ${res.person_id}).${angleNote}`);
      setForm(EMPTY_FORM);
      setEmbeddings([]);
      setCapturedAngles([]);
      canvasRef.current?.getContext("2d")?.clearRect(
        0, 0, canvasRef.current.width, canvasRef.current.height
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Submit failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Webcam panel ──────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Capture
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Capturing from{" "}
            <span className="text-zinc-300">multiple angles</span> significantly
            improves cross-pose recognition. Follow the angle steps below.
          </p>
        </div>

        {/* Angle step guide (VGGFace2: multi-pose enrollment improves recognition) */}
        <div className="flex gap-2">
          {ANGLE_STEPS.map((step, i) => {
            const done    = capturedAngles.includes(step.label);
            const current = i === capturedAngles.length;
            return (
              <div
                key={step.label}
                className={`flex-1 rounded-md border px-2 py-1.5 text-center text-[10px] transition-colors ${
                  done
                    ? "border-green-700 bg-green-950/40 text-green-300"
                    : current
                    ? "border-blue-600 bg-blue-950/30 text-blue-300 animate-pulse"
                    : "border-zinc-700 text-zinc-600"
                }`}
              >
                <div className="text-base">{done ? "✓" : step.icon}</div>
                <div>{step.label}</div>
              </div>
            );
          })}
        </div>

        {!allAnglesDone && (
          <p className="text-[11px] text-blue-400 bg-blue-950/30 rounded px-2 py-1.5">
            {ANGLE_STEPS[currentStep]?.hint}
          </p>
        )}

        <div className="relative bg-black rounded-md overflow-hidden aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          {streamError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <p className="text-red-400 text-sm">{streamError}</p>
            </div>
          )}
          {modelsState === "loading" && !streamError && (
            <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] text-zinc-300">
              Loading models…
            </div>
          )}
          {modelsState === "failed" && (
            <div className="absolute top-2 right-2 bg-red-900/80 px-2 py-1 rounded text-[10px] text-red-200">
              Models failed to load
            </div>
          )}
        </div>

        <Button
          onClick={handleCapture}
          disabled={modelsState !== "ready" || !!streamError || capturing || allAnglesDone}
        >
          {capturing
            ? "Capturing…"
            : allAnglesDone
            ? "All angles captured ✓"
            : `Capture — ${ANGLE_STEPS[currentStep]?.label}`}
        </Button>

        {embeddings.length > 0 && (
          <div className="space-y-1">
            {capturedAngles.map((angle, i) => (
              <p key={i} className="text-xs text-green-400">
                ✓ {angle} captured ({embeddings[i].length} dims)
              </p>
            ))}
            {embeddings.length < ANGLE_STEPS.length && (
              <p className="text-xs text-zinc-500">
                {ANGLE_STEPS.length - embeddings.length} more angle(s) recommended
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-3 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Person details
        </h2>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Name *</span>
          <input
            className="bg-orix-bg border border-orix-border rounded px-2 py-1.5 text-sm"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Jane Doe"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">LinkedIn URL</span>
          <input
            className="bg-orix-bg border border-orix-border rounded px-2 py-1.5 text-sm"
            value={form.linkedin_url}
            onChange={(e) => updateField("linkedin_url", e.target.value)}
            placeholder="https://www.linkedin.com/in/jane-doe/"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Instagram handle</span>
          <input
            className="bg-orix-bg border border-orix-border rounded px-2 py-1.5 text-sm"
            value={form.instagram_handle}
            onChange={(e) => updateField("instagram_handle", e.target.value)}
            placeholder="@janedoe"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">X / Twitter handle</span>
          <input
            className="bg-orix-bg border border-orix-border rounded px-2 py-1.5 text-sm"
            value={form.twitter_handle}
            onChange={(e) => updateField("twitter_handle", e.target.value)}
            placeholder="@janedoe"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Notes</span>
          <textarea
            className="bg-orix-bg border border-orix-border rounded px-2 py-1.5 text-sm min-h-[80px]"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Optional: role, department, etc."
          />
        </label>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          By enrolling, you confirm the person in front of the camera consents
          to having their face embedding and social handles stored in this
          system for future identification.
        </p>

        <Button type="submit" disabled={submitting || embeddings.length === 0}>
          {submitting ? "Enrolling…" : "Enroll"}
        </Button>

        {message && <p className="text-xs text-green-400">{message}</p>}
        {error   && <p className="text-xs text-red-400">{error}</p>}
      </form>
    </div>
  );
}
