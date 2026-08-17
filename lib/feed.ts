import type { Interview } from "@/types";
import { escapeIcs, toIcsUtc } from "./ics-core";

const BACKSLASH = String.fromCharCode(92);

/** 每场面试的提醒：提前 1 天 + 提前 1 小时（手机原生通知） */
function buildValarms(): string {
  const lines: string[] = [];
  for (const [minutes, text] of [
    [1440, "面试将在明天开始"],
    [60, "面试将在 1 小时后开始"],
  ] as const) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + escapeIcs(text),
      `TRIGGER:-PT${minutes}M`,
      "END:VALARM",
    );
  }
  return lines.join("\r\n");
}

/** 生成用户完整的订阅日历（.ics feed）：排除已挂，含 VALARM 提醒 */
export function buildCalendarFeed(interviews: Interview[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InterviewScheduler//Feed//ZH",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:" + escapeIcs("面试与笔试日程"),
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  for (const interview of interviews) {
    if (interview.status === "declined") continue;
    const offerTag = interview.status === "offer" ? "[Offer] " : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${interview.id}@interview-scheduler.local`,
      `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
      `DTSTART:${toIcsUtc(interview.startUtc)}`,
      `DTEND:${toIcsUtc(interview.endUtc)}`,
      "SUMMARY:" + escapeIcs(offerTag + interview.company + " · " + interview.position),
      "DESCRIPTION:" + escapeIcs([interview.prep.note, interview.prep.meetingUrl ? "会议链接：" + interview.prep.meetingUrl : ""].filter(Boolean).join(BACKSLASH + "n")),
    );
    lines.push(buildValarms());
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
