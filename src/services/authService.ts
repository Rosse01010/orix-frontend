import type { User } from "../store/authStore";

export async function loginService(
  username: string,
  _password: string
): Promise<User> {
  // TODO: replace with real API call
  const user: User = { username, role: "admin", token: "demo-token" };
  localStorage.setItem("token", user.token!);
  return user;
}

export function logoutService(): void {
  localStorage.removeItem("token");
}
