"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, refreshUser } = useAuthStore();

  useEffect(() => {
    localStorage.removeItem("balancy_premium_active");
    localStorage.removeItem("balancy_premium_until");
    initialize();
  }, [initialize]);

  useEffect(() => {
    const refresh = () => {
      refreshUser();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(refresh, 60_000);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refreshUser]);

  return <>{children}</>;
}
