"use client";

import { useEffect, useState } from "react";
import type { SubCalendar } from "@/types";
import type { DeleteCalendarMode } from "@/store/useScheduleStore";
import { SELECT_CLASS } from "@/lib/ui";
import { useFocusTrap } from "@/lib/useFocusTrap";
import ScaleButton from "./ScaleButton";

interface DeleteCalendarDialogProps {
  calendar: SubCalendar;
  relatedCount: number;
  otherCalendars: SubCalendar[];
  onConfirm: (mode: DeleteCalendarMode, migrateTargetId?: string) => void;
  onCancel: () => void;
}

const RADIO_CLASS =
  "flex items-center gap-2 rounded-xl bg-surface/70 px-3 py-2.5 text-sm text-ink-secondary has-[:checked]:ring-2 has-[:checked]:ring-focus";

/** 删除子日历确认：有关联面试时必须显式选择迁移目标或一并删除，不允许静默丢数据 */
export default function DeleteCalendarDialog({
  calendar,
  relatedCount,
  otherCalendars,
  onConfirm,
  onCancel,
}: DeleteCalendarDialogProps) {
  const [mode, setMode] = useState<DeleteCalendarMode>("migrate");
  const [targetId, setTargetId] = useState<string>(otherCalendars[0]?.id ?? "");
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
        aria-label={`删除子日历 ${calendar.name}`}
        className="relative z-10 w-full max-w-sm rounded-card bg-card p-5 shadow-card"
      >
        <h3 className="text-base font-semibold text-ink">删除「{calendar.name}」</h3>
        {relatedCount === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">该日历下没有面试，可以安全删除。</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-secondary">
              该日历下还有 {relatedCount} 场面试，请选择处理方式：
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <label className={RADIO_CLASS}>
                <input
                  type="radio"
                  name="delete-mode"
                  checked={mode === "migrate"}
                  onChange={() => setMode("migrate")}
                />
                迁移到其他子日历
                {mode === "migrate" ? (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    aria-label="迁移目标子日历"
                    className={`${SELECT_CLASS} ml-auto`}
                  >
                    {otherCalendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </label>
              <label className={RADIO_CLASS}>
                <input
                  type="radio"
                  name="delete-mode"
                  checked={mode === "cascade"}
                  onChange={() => setMode("cascade")}
                />
                一并删除这 {relatedCount} 场面试
              </label>
            </div>
          </>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <ScaleButton onClick={onCancel} ariaLabel="取消删除" className="bg-ink/5 text-ink-secondary">
            取消
          </ScaleButton>
          <ScaleButton
            onClick={() => onConfirm(mode, mode === "migrate" ? targetId : undefined)}
            ariaLabel="确认删除子日历"
            disabled={mode === "migrate" && targetId === ""}
            className="bg-accent text-on-accent"
          >
            确认删除
          </ScaleButton>
        </div>
      </div>
    </div>
  );
}
