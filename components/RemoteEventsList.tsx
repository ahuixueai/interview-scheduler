"use client";

import { Download } from "lucide-react";
import type { InterviewDraft } from "@/types";
import { wallDateInZone, wallTimeInZone } from "@/lib/time";
import type { RemoteCalendarEvent } from "@/lib/integrations/google-calendar";
import ScaleButton from "./ScaleButton";

export function remoteEventToDraft(event: RemoteCalendarEvent, fallbackSubCalendarId: string): InterviewDraft | null {
  const durationMinutes = Math.round((Date.parse(event.endUtc) - Date.parse(event.startUtc)) / 60_000);
  return {
    company: event.summary.slice(0, 60),
    position: "（来自 Google 日历）",
    type: "video",
    importance: 3,
    subCalendarId: fallbackSubCalendarId,
    startDate: wallDateInZone(event.startUtc, event.timeZone),
    startTime: wallTimeInZone(event.startUtc, event.timeZone),
    sourceTimeZone: event.timeZone,
    durationMinutes: durationMinutes >= 15 && durationMinutes <= 480 ? durationMinutes : 60,
    meetingUrl: "",
    jdNotes: "",
  };
}

interface RemoteEventsListProps {
  events: RemoteCalendarEvent[];
  fallbackSubCalendarId: string;
  onImport: (event: RemoteCalendarEvent) => void;
}

/** 拉取到的远端 Google 日历事件列表（可逐条导入本地面试） */
export default function RemoteEventsList({
  events,
  fallbackSubCalendarId,
  onImport,
}: RemoteEventsListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => {
        const draft = remoteEventToDraft(event, fallbackSubCalendarId);
        return (
          <li key={event.id} className="flex items-center gap-2 rounded-xl bg-surface/70 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{event.summary}</span>
            <span className="shrink-0 text-xs tabular-nums text-ink-tertiary">
              {draft ? `${draft.startDate} ${draft.startTime}` : "—"}
            </span>
            <ScaleButton
              onClick={() => onImport(event)}
              ariaLabel={`导入 ${event.summary}`}
              className="bg-ink/5 text-ink-secondary"
            >
              <Download size={13} aria-hidden />
              导入
            </ScaleButton>
          </li>
        );
      })}
    </ul>
  );
}
