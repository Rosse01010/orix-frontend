import { create } from "zustand";
import type { User, UserRole } from "../types/User";
import {
  getStoredUser,
  loginService,
  logoutService,
} from "../services/authService";

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Rehydrate on module load so reloads keep the session.
  user: getStoredUser(),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const user = await loginService(username, password);
      set({ user, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      set({ error: msg, loading: false });
      throw e;
    }
  },

  logout: () => {
    logoutService();
    set({ user: null, error: null });
  },

  hasRole: (...roles) => {
    const u = get().user;
    return !!u && roles.includes(u.role);
  },
}));
