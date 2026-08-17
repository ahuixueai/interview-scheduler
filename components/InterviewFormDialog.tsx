"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Interview } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { getLocalTimeZone, wallDateInZone, wallTimeInZone, zonedWallToUtc } from "@/lib/time";
import { supportedTimeZones } from "@/lib/timezones";
import { useFocusTrap } from "@/lib/useFocusTrap";
import ScaleButton from "./ScaleButton";
import InterviewFormFields, { type InterviewFormState } from "./InterviewFormFields";

type Mode = { kind: "create" } | { kind: "edit"; interview: Interview };

interface InterviewFormDialogProps {
  mode: Mode;
  onClose: () => void;
}

/** 新建/编辑面试：输入所在地时区的墙上日期+时间，提交时统一转 UTC 存储（禁止直接存本地时间字符串） */
export default function InterviewFormDialog({ mode, onClose }: InterviewFormDialogProps) {
  const subCalendars = useScheduleStore((s) => s.subCalendars);
  const addInterview = useScheduleStore((s) => s.addInterview);
  const updateInterview = useScheduleStore((s) => s.updateInterview);
  const dialogRef = useFocusTrap<HTMLDivElement>(true);
  const zones = useMemo(supportedTimeZones, []);

  const editing = mode.kind === "edit" ? mode.interview : null;
  const [form, setForm] = useState<InterviewFormState>({
    company: editing?.company ?? "",
    position: editing?.position ?? "",
    type: editing?.type ?? "video",
    importance: String(editing?.importance ?? 3),
    subCalendarId: editing?.subCalendarId ?? subCalendars[0]?.id ?? "",
    sourceTimeZone: editing?.sourceTimeZone ?? getLocalTimeZone(),
    dateStr: editing ? wallDateInZone(editing.startUtc, editing.sourceTimeZone) : "",
    timeStr: editing ? wallTimeInZone(editing.startUtc, editing.sourceTimeZone) : "10:00",
    durationMinutes: editing
      ? String(Math.round((Date.parse(editing.endUtc) - Date.parse(editing.startUtc)) / 60_000))
      : "60",
    meetingUrl: editing?.prep.meetingUrl ?? "",
    jdNotes: editing?.prep.jdNotes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<InterviewFormState>) => setForm((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!form.company.trim() || !form.position.trim()) {
      setError("公司名称与岗位名称不能为空");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateStr) || !/^\d{2}:\d{2}$/.test(form.timeStr)) {
      setError("请填写完整的日期与时间（如 2026-08-20 / 09:30）");
      return;
    }
    const duration = Number(form.durationMinutes);
    if (!Number.isFinite(duration) || duration < 15 || duration > 480) {
      setError("时长需在 15 ~ 480 分钟之间");
      return;
    }
    if (!form.subCalendarId) {
      setError("请选择子日历（没有子日历请先在右上角创建）");
      return;
    }
    const startUtc = zonedWallToUtc(form.dateStr, form.timeStr, form.sourceTimeZone);
    if (!startUtc) {
      setError("时间解析失败，请检查日期与时间格式");
      return;
    }
    const importance = Number(form.importance) as 1 | 2 | 3 | 4 | 5;

    if (mode.kind === "create") {
      try {
        await addInterview({
          company: form.company,
          position: form.position,
          type: form.type,
          importance,
          subCalendarId: form.subCalendarId,
          startDate: form.dateStr,
          startTime: form.timeStr,
          sourceTimeZone: form.sourceTimeZone,
          durationMinutes: duration,
          meetingUrl: form.meetingUrl,
          jdNotes: form.jdNotes,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "创建失败，请重试");
        return;
      }
    } else {
      updateInterview(mode.interview.id, {
        company: form.company.trim(),
        position: form.position.trim(),
        type: form.type,
        importance,
        subCalendarId: form.subCalendarId,
        startUtc,
        endUtc: new Date(Date.parse(startUtc) + duration * 60_000).toISOString(),
        sourceTimeZone: form.sourceTimeZone,
        meetingUrl: form.meetingUrl.trim() === "" ? null : form.meetingUrl.trim(),
        jdNotes: form.jdNotes.trim() === "" ? null : form.jdNotes.trim(),
      });
    }
    onClose();
  };

  const title = mode.kind === "create" ? "新建面试 / 笔试" : "编辑面试 / 笔试";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-card bg-card p-5 shadow-card"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <ScaleButton
            onClick={onClose}
            ariaLabel="关闭表单"
            className="bg-transparent p-1.5 text-ink-tertiary hover:bg-ink/5 hover:text-ink-secondary"
          >
            <X size={16} aria-hidden />
          </ScaleButton>
        </div>

        <div className="mt-4 overflow-y-auto pr-1">
          <InterviewFormFields form={form} zones={zones} subCalendars={subCalendars} onChange={patch} />
          {error ? <p className="mt-2 text-xs font-medium text-danger" role="alert">{error}</p> : null}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <ScaleButton onClick={onClose} ariaLabel="取消" className="bg-ink/5 text-ink-secondary">
            取消
          </ScaleButton>
          <ScaleButton
            onClick={handleSubmit}
            ariaLabel={mode.kind === "create" ? "创建面试" : "保存修改"}
            className="bg-accent text-on-accent"
          >
            {mode.kind === "create" ? "创建面试" : "保存修改"}
          </ScaleButton>
        </div>
      </div>
    </div>
  );
}
