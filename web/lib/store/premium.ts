import { create } from "zustand";
import type { DirectusUser } from "@/lib/types";
import { updatePremiumActive } from "@/lib/api/directus";

export function isUserPremium(user: DirectusUser | null) {
  if (!user) return false;
  if (!user.premium_active) return false;
  if (user.premium_until) {
    return new Date(user.premium_until).getTime() > Date.now();
  }
  return true;
}

interface PremiumState {
  isPremium: boolean;
  isSaving: boolean;
  error: string | null;
  initialize: (user?: DirectusUser | null) => void;
  syncFromUser: (user: DirectusUser | null) => void;
  setPremium: (
    active: boolean,
    token?: string | null,
  ) => Promise<DirectusUser | null>;
}

export const usePremiumStore = create<PremiumState>((set) => ({
  isPremium: false,
  isSaving: false,
  error: null,

  initialize: (user) => {
    set({
      isPremium: isUserPremium(user ?? null),
      error: null,
    });
  },

  syncFromUser: (user) => {
    set({
      isPremium: isUserPremium(user),
      error: null,
    });
  },

  setPremium: async (active, token) => {
    set({ isSaving: true, error: null });
    if (!token) {
      set({
        isPremium: false,
        isSaving: false,
        error: "You must be signed in to change Premium.",
      });
      return null;
    }

    try {
      const updated = (await updatePremiumActive(token, active)) as DirectusUser;
      const responseHasPremiumFields =
        updated.premium_active !== undefined ||
        updated.premium_until !== undefined;
      const nextPremium = responseHasPremiumFields
        ? isUserPremium(updated)
        : active;
      const normalized = {
        ...updated,
        premium_active: updated.premium_active ?? nextPremium,
      };
      set({ isPremium: nextPremium, isSaving: false });
      return normalized;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update premium status";
      set({
        isPremium: false,
        isSaving: false,
        error: `${message}. Premium was not changed in the database.`,
      });
      return null;
    }
  },
}));
