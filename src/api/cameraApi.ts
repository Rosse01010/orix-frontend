import axios, { AxiosError } from "axios";
import type { Camera } from "../types/Camera";
import { envString, sleep } from "../utils/helpers";

const API_BASE = envString("VITE_API_URL", "http://localhost:4000");

/**
 * Mock camera list used when the backend is unreachable. Mirrors the real
 * GET /cameras response so swapping in a live server requires no UI change.
 */
const MOCK_CAMERAS: Camera[] = [
  {
    id: "cam1",
    name: "Main Entrance",
    location: "Lobby",
    streamUrl: `${API_BASE}/stream/cam1`,
    status: "online",
  },
  {
    id: "cam2",
    name: "Parking Lot",
    location: "Exterior — North",
    streamUrl: `${API_BASE}/stream/cam2`,
    status: "online",
  },
  {
    id: "cam3",
    name: "Warehouse",
    location: "Building B",
    streamUrl: `${API_BASE}/stream/cam3`,
    status: "online",
  },
  {
    id: "cam4",
    name: "Server Room",
    location: "Floor 2",
    streamUrl: `${API_BASE}/stream/cam4`,
    status: "online",
  },
];

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** GET /cameras — all cameras the user can see. */
export async function fetchCameras(token: string | null): Promise<Camera[]> {
  try {
    const { data } = await axios.get<Camera[]>(`${API_BASE}/cameras`, {
      headers: authHeaders(token),
      timeout: 5000,
    });
    return data;
  } catch (err) {
    if (err instanceof AxiosError) {
      await sleep(200);
      return MOCK_CAMERAS;
    }
    throw err;
  }
}

/** GET /cameras/:id */
export async function fetchCameraById(
  id: string,
  token: string | null
): Promise<Camera | null> {
  try {
    const { data } = await axios.get<Camera>(`${API_BASE}/cameras/${id}`, {
      headers: authHeaders(token),
      timeout: 5000,
    });
    return data;
  } catch {
    return MOCK_CAMERAS.find((c) => c.id === id) ?? null;
  }
}

/** PATCH /cameras/:id — update (admin only). */
export async function updateCamera(
  id: string,
  patch: Partial<Camera>,
  token: string | null
): Promise<Camera> {
  const { data } = await axios.patch<Camera>(
    `${API_BASE}/cameras/${id}`,
    patch,
    { headers: authHeaders(token), timeout: 5000 }
  );
  return data;
}
