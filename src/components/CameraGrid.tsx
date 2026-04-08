import CameraFeed from "./CameraFeed";
import type { Camera } from "../types/Camera";

/**
 * Four simulated cameras for local development. When wiring the real
 * backend, replace this constant with a fetch from /api/cameras and feed
 * the response into CameraFeed.
 */
const CAMERAS: Camera[] = [
  {
    id: "cam1",
    name: "Main Entrance",
    location: "Lobby",
    streamUrl: "http://localhost:4000/stream/cam1",
    status: "online",
  },
  {
    id: "cam2",
    name: "Parking Lot",
    location: "Exterior — North",
    streamUrl: "http://localhost:4000/stream/cam2",
    status: "online",
  },
  {
    id: "cam3",
    name: "Warehouse",
    location: "Building B",
    streamUrl: "http://localhost:4000/stream/cam3",
    status: "online",
  },
  {
    id: "cam4",
    name: "Server Room",
    location: "Floor 2",
    streamUrl: "http://localhost:4000/stream/cam4",
    status: "online",
  },
];

export default function CameraGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
      {CAMERAS.map((cam) => (
        <CameraFeed key={cam.id} camera={cam} />
      ))}
    </div>
  );
}
