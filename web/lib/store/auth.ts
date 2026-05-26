import { create } from "zustand";
import type { DirectusUser } from "@/lib/types";
import {
  loginWithPassword,
  logoutApi,
  registerUser,
  getMe,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from "@/lib/api/directus";

interface AuthState {
  user: DirectusUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: DirectusUser | Partial<DirectusUser>) => void;
  clearError: () => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await getMe(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      clearStoredToken();
      set({ isLoading: false });
    }
  },

  refreshUser: async () => {
    const token = get().token ?? getStoredToken();
    if (!token) return;
    try {
      const user = await getMe(token);
      set({ user, token, isAuthenticated: true });
    } catch {
      // Keep the current session visible; initialize/login handles hard failures.
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await loginWithPassword(email, password);
      const user = await getMe(data.access_token);
      setStoredToken(data.access_token, data.refresh_token);
      set({
        user,
        token: data.access_token,
        refreshToken: data.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (e: unknown) {
      set({ error: getErrorMessage(e, "Login failed"), isLoading: false });
      throw e;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await registerUser(payload);
      await get().login(payload.email, payload.password);
    } catch (e: unknown) {
      set({
        error: getErrorMessage(e, "Registration failed"),
        isLoading: false,
      });
      throw e;
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) await logoutApi(refreshToken);
    clearStoredToken();
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  setUser: (user) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...user } : (user as DirectusUser),
    })),
  clearError: () => set({ error: null }),
}));
