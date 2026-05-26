import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_KEY = "biometric_enabled";

interface SettingsState {
  biometricEnabled: boolean;
  isLocked: boolean;
  initialized: boolean;

  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  lock: () => void;
  unlock: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => {
  // Eagerly load from SecureStore in parallel with auth initialization
  SecureStore.getItemAsync(BIOMETRIC_KEY)
    .then((val) => {
      const biometricEnabled = val === "true";
      set({ biometricEnabled, isLocked: biometricEnabled, initialized: true });
    })
    .catch(() => {
      set({ initialized: true });
    });

  return {
    biometricEnabled: false,
    isLocked: false,
    initialized: false,

    setBiometricEnabled: async (enabled: boolean) => {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, String(enabled));
      set({ biometricEnabled: enabled });
    },

    lock: () => set({ isLocked: true }),

    unlock: () => set({ isLocked: false }),
  };
});
