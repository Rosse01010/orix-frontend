import axios, { AxiosError } from "axios";
import type { User, UserRole } from "../types/User";
import { envString, sleep } from "../utils/helpers";

const API_BASE = envString("VITE_API_URL", "http://localhost:4000");

/** Public user info — never includes a token. */
export type UserDto = Omit<User, "token">;

const MOCK_USERS: UserDto[] = [
  { id: "u_admin", username: "admin", role: "admin" },
  { id: "u_operator", username: "operator", role: "operator" },
  { id: "u_user", username: "user", role: "user" },
];

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** GET /users */
export async function fetchUsers(token: string | null): Promise<UserDto[]> {
  try {
    const { data } = await axios.get<UserDto[]>(`${API_BASE}/users`, {
      headers: authHeaders(token),
      timeout: 5000,
    });
    return data;
  } catch (err) {
    if (err instanceof AxiosError) {
      await sleep(200);
      return MOCK_USERS;
    }
    throw err;
  }
}

/** POST /users — create a new user (admin only). */
export async function createUser(
  payload: { username: string; password: string; role: UserRole },
  token: string | null
): Promise<UserDto> {
  try {
    const { data } = await axios.post<UserDto>(`${API_BASE}/users`, payload, {
      headers: authHeaders(token),
      timeout: 5000,
    });
    return data;
  } catch {
    await sleep(200);
    return {
      id: `u_${payload.username}_${Date.now()}`,
      username: payload.username,
      role: payload.role,
    };
  }
}

/** DELETE /users/:id (admin only). */
export async function deleteUser(
  id: string,
  token: string | null
): Promise<void> {
  try {
    await axios.delete(`${API_BASE}/users/${id}`, {
      headers: authHeaders(token),
      timeout: 5000,
    });
  } catch {
    /* mock: silently succeed */
  }
}
