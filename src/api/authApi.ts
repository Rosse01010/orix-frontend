import axios, { AxiosError } from "axios";
import type { User, UserRole } from "../types/User";
import { envString, sleep } from "../utils/helpers";

const API_BASE = envString("VITE_API_URL", "http://localhost:4000");

/**
 * Mock credential table used when the backend is unreachable. This lets
 * the UI run in full offline demo mode while keeping the api layer shape
 * identical to the real integration.
 */
const MOCK_USERS: Record<string, { password: string; role: UserRole }> = {
  admin: { password: "admin123", role: "admin" },
  operator: { password: "operator123", role: "operator" },
  user: { password: "user123", role: "user" },
};

export interface LoginResponse {
  user: User;
}

/**
 * POST /auth/login. Falls back to the mock table when the backend is
 * unavailable so the frontend remains testable on its own.
 */
export async function loginRequest(
  username: string,
  password: string
): Promise<LoginResponse> {
  try {
    const { data } = await axios.post<LoginResponse>(
      `${API_BASE}/auth/login`,
      { username, password },
      { timeout: 5000 }
    );
    return data;
  } catch (err) {
    if (
      err instanceof AxiosError &&
      (err.code === "ECONNABORTED" ||
        err.code === "ERR_NETWORK" ||
        err.response?.status === 404)
    ) {
      // Fallback path: pretend we hit the server and use the mock table.
      await sleep(400);
      const record = MOCK_USERS[username.toLowerCase()];
      if (!record || record.password !== password) {
        throw new Error("Invalid username or password");
      }
      const user: User = {
        id: `u_${username}`,
        username,
        role: record.role,
        token: `demo-token-${username}-${Date.now()}`,
      };
      return { user };
    }
    throw err;
  }
}

/**
 * POST /auth/logout. Best-effort — we always resolve, because logging out
 * locally should never be blocked by a network failure.
 */
export async function logoutRequest(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await axios.post(
      `${API_BASE}/auth/logout`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, timeout: 3000 }
    );
  } catch {
    /* ignore — local session is cleared regardless */
  }
}
