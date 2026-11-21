"use client";

import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex flex-col gap-1 cursor-pointer transition-all ${
            t.variant === "destructive"
              ? "bg-red-950/90 border-red-800 text-red-200"
              : "bg-zinc-900/90 border-zinc-800 text-zinc-100"
          }`}
        >
          {t.title && <div className="text-xs font-semibold">{t.title}</div>}
          {t.description && <div className="text-xs text-zinc-400">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
