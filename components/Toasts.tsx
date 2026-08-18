"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useUiStore } from "@/store/useUiStore";

/** 全局 Toast 通知：底部居中堆叠，自动消失，支持带操作按钮（如撤销删除） */
export default function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismissToast = useUiStore((s) => s.dismissToast);
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full bg-card py-2.5 pl-4 pr-2.5 shadow-card"
          >
            {toast.kind === "error" ? (
              <AlertCircle size={15} className="shrink-0 text-danger" aria-hidden />
            ) : (
              <CheckCircle2 size={15} className="shrink-0 text-success" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{toast.text}</span>
            {toast.actionLabel ? (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  dismissToast(toast.id);
                }}
                aria-label={toast.actionLabel}
                className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent focus-visible:outline-2 focus-visible:outline-focus"
              >
                {toast.actionLabel}
              </button>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
