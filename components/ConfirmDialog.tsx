"use client";

import { useEffect } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import ScaleButton from "./ScaleButton";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 通用确认对话框（删除面试等不可逆操作），含焦点陷阱与 Esc 取消 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onCancel} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-sm rounded-card bg-card p-5 shadow-card"
      >
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <ScaleButton onClick={onCancel} ariaLabel="取消" className="bg-ink/5 text-ink-secondary">
            取消
          </ScaleButton>
          <ScaleButton onClick={onConfirm} ariaLabel={confirmLabel} className="bg-accent text-on-accent">
            {confirmLabel}
          </ScaleButton>
        </div>
      </div>
    </div>
  );
}
