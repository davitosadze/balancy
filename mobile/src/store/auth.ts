import { create } from "zustand";
import type { DirectusUser } from "@/types";
import {
  loginWithPassword,
  logoutDirectus,
  registerUser,
  getMe,
  updateProfile,
} from "@api/directus";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "@hooks/useNotifications";

async function savePushToken() {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) await updateProfile({ push_token: token } as any);
  } catch {
    // Non-critical: silently ignore if token registration fails
  }
}

interface AuthState {
  user: DirectusUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: DirectusUser | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        const me = await getMe();
        set({
          user: me as DirectusUser,
          isAuthenticated: true,
          isLoading: false,
        });
        savePushToken();
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await loginWithPassword(email, password);
      const me = await getMe();
      set({
        user: me as DirectusUser,
        isAuthenticated: true,
        isLoading: false,
      });
      savePushToken();
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message ?? e?.message ?? "Login failed";
      set({ error: msg, isLoading: false });
      throw e;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await registerUser(payload);
      await loginWithPassword(payload.email, payload.password);
      const me = await getMe();
      set({
        user: me as DirectusUser,
        isAuthenticated: true,
        isLoading: false,
      });
      savePushToken();
    } catch (e: any) {
      const msg = e?.message ?? "Registration failed";
      set({ error: msg, isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await logoutDirectus();
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}));
