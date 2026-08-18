"use client";

import type { ReactNode } from "react";
import type { InterviewType, SubCalendar } from "@/types";
import { INTERVIEW_TYPE_LABELS } from "@/lib/labels";
import { INPUT_CLASS, SELECT_CLASS } from "@/lib/ui";
import { REMINDER_PRESETS, formatReminderLabel } from "@/lib/reminders";

export interface InterviewFormState {
  company: string;
  position: string;
  type: InterviewType;
  importance: string;
  subCalendarId: string;
  sourceTimeZone: string;
  dateStr: string;
  timeStr: string;
  durationMinutes: string;
  reminders: number[];
  meetingUrl: string;
  jdNotes: string;
}

interface InterviewFormFieldsProps {
  form: InterviewFormState;
  zones: string[];
  subCalendars: SubCalendar[];
  onChange: (patch: Partial<InterviewFormState>) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-tertiary">{label}</span>
      {children}
    </label>
  );
}

/** 面试表单的纯展示字段（状态与校验在 InterviewFormDialog） */
export default function InterviewFormFields({
  form,
  zones,
  subCalendars,
  onChange,
}: InterviewFormFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="公司名称">
          <input
            className={INPUT_CLASS}
            value={form.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="如 字节跳动"
            aria-label="公司名称"
          />
        </Field>
        <Field label="岗位名称">
          <input
            className={INPUT_CLASS}
            value={form.position}
            onChange={(e) => onChange({ position: e.target.value })}
            placeholder="如 数据分析师"
            aria-label="岗位名称"
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="类型">
          <select
            className={SELECT_CLASS}
            value={form.type}
            onChange={(e) => onChange({ type: e.target.value as InterviewType })}
            aria-label="面试类型"
          >
            {(Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]).map((t) => (
              <option key={t} value={t}>
                {INTERVIEW_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="重要度">
          <select
            className={SELECT_CLASS}
            value={form.importance}
            onChange={(e) => onChange({ importance: e.target.value })}
            aria-label="重要度"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="时长（分钟）">
          <input
            className={INPUT_CLASS}
            value={form.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: e.target.value })}
            inputMode="numeric"
            aria-label="时长分钟"
          />
        </Field>
      </div>
      <Field label="子日历">
        <select
          className={SELECT_CLASS}
          value={form.subCalendarId}
          onChange={(e) => onChange({ subCalendarId: e.target.value })}
          aria-label="所属子日历"
        >
          {subCalendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="日期（所在地时区）">
          <input
            type="date"
            className={INPUT_CLASS}
            value={form.dateStr}
            onChange={(e) => onChange({ dateStr: e.target.value })}
            aria-label="面试日期"
          />
        </Field>
        <Field label="时间（所在地时区）">
          <input
            type="time"
            className={INPUT_CLASS}
            value={form.timeStr}
            onChange={(e) => onChange({ timeStr: e.target.value })}
            aria-label="面试时间"
          />
        </Field>
        <Field label="时区">
          <select
            className={SELECT_CLASS}
            value={form.sourceTimeZone}
            onChange={(e) => onChange({ sourceTimeZone: e.target.value })}
            aria-label="面试所在地时区"
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="提醒（可多选，全不选 = 不提醒）">
        <div className="flex flex-wrap gap-2">
          {REMINDER_PRESETS.map((minutes) => {
            const checked = form.reminders.includes(minutes);
            const toggle = () =>
              onChange({
                reminders: checked
                  ? form.reminders.filter((m) => m !== minutes)
                  : [...form.reminders, minutes],
              });
            return (
              <label
                key={minutes}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                  checked ? "bg-primary/20 text-ink" : "bg-ink/5 text-ink-secondary"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={toggle}
                  aria-label={`提醒${formatReminderLabel(minutes)}`}
                  className="sr-only"
                />
                {formatReminderLabel(minutes)}
              </label>
            );
          })}
        </div>
      </Field>
      <Field label="会议/测评链接（可选）">
        <input
          className={INPUT_CLASS}
          value={form.meetingUrl}
          onChange={(e) => onChange({ meetingUrl: e.target.value })}
          placeholder="https://…"
          aria-label="会议链接"
        />
      </Field>
      <Field label="岗位 JD 笔记（可选）">
        <textarea
          className={`${INPUT_CLASS} min-h-16 resize-y`}
          value={form.jdNotes}
          onChange={(e) => onChange({ jdNotes: e.target.value })}
          rows={3}
          aria-label="JD 笔记"
        />
      </Field>
    </div>
  );
}
