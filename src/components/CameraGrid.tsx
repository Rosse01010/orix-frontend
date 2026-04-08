import CameraFeed from "./CameraFeed";

const cameras = [
  { id: "cam1", url: "http://localhost:4000/stream/cam1" },
  { id: "cam2", url: "http://localhost:4000/stream/cam2" },
  { id: "cam3", url: "http://localhost:4000/stream/cam3" },
  { id: "cam4", url: "http://localhost:4000/stream/cam4" },
];

export default function CameraGrid() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {cameras.map((cam) => (
        <CameraFeed key={cam.id} cameraId={cam.id} streamUrl={cam.url} />
      ))}
    </div>
  );
}
