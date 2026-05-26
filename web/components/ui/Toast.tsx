"use client";

import { useToastStore } from "@/lib/store/toast";
import { CheckCircle2, XCircle, X } from "lucide-react";
import clsx from "clsx";

export default function Toast() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "flex items-center gap-3 pl-4 pr-3 py-3 rounded-2xl shadow-lg border text-sm font-medium pointer-events-auto",
            "animate-in slide-in-from-bottom-2 fade-in duration-200",
            t.type === "success"
              ? "bg-white border-neutral-200 text-neutral-900"
              : "bg-red-50 border-red-200 text-red-800",
          )}>
          {t.type === "success" ? (
            <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
          ) : (
            <XCircle size={17} className="text-red-500 shrink-0" />
          )}
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className={clsx(
              "ml-1 w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
              t.type === "success"
                ? "text-neutral-400 hover:bg-neutral-100"
                : "text-red-400 hover:bg-red-100",
            )}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
