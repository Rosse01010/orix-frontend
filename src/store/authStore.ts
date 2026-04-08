import { create } from "zustand";
import { loginService, logoutService } from "../services/authService";

export interface User {
  username: string;
  role: "admin" | "operator" | "user";
  token?: string;
}

interface AuthStore {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  login: async (username, password) => {
    const user = await loginService(username, password);
    set({ user });
  },
  logout: () => {
    logoutService();
    set({ user: null });
  },
}));
