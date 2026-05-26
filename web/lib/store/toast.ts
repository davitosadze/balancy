import { create } from "zustand";

export interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: "success" | "error") => void;
  dismiss: (id: number) => void;
}

let _counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = "success") => {
    const id = ++_counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
