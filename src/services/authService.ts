import type { User, UserRole } from "../types/User";
import { STORAGE_KEYS, storage } from "../utils/storage";

/**
 * Mock credential table. In production this would call a real API, but for
 * local development we ship 3 users (one per role) so the UI is fully
 * testable without a backend.
 */
const MOCK_USERS: Record<string, { password: string; role: UserRole }> = {
  admin: { password: "admin123", role: "admin" },
  operator: { password: "operator123", role: "operator" },
  user: { password: "user123", role: "user" },
};

/**
 * Simulates an authentication request. Resolves with a User object on
 * success, rejects with an Error on failure. Tokens and the current user
 * are persisted to localStorage so that refreshing the page keeps the
 * session alive.
 */
export async function loginService(
  username: string,
  password: string
): Promise<User> {
  // Small artificial delay to simulate network latency and let the UI show
  // any loading state the consumer wires up.
  await new Promise((r) => setTimeout(r, 400));

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

  storage.set(STORAGE_KEYS.AUTH_USER, user);
  storage.set(STORAGE_KEYS.AUTH_TOKEN, user.token);
  return user;
}

export function logoutService(): void {
  storage.remove(STORAGE_KEYS.AUTH_USER);
  storage.remove(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Rehydrates the current user from localStorage on app boot. Returns null
 * if there is no stored session.
 */
export function getStoredUser(): User | null {
  return storage.get<User | null>(STORAGE_KEYS.AUTH_USER, null);
}

export function getStoredToken(): string | null {
  return storage.get<string | null>(STORAGE_KEYS.AUTH_TOKEN, null);
}
