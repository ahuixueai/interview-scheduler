import type { Interview } from "@/types";
import { escapeIcs, toIcsUtc } from "./ics-core";
import { DEFAULT_REMINDERS, formatReminderLabel } from "./reminders";

const BACKSLASH = String.fromCharCode(92);

/** 单场面试的 VALARM：按该场设置的提醒时间生成（缺省用默认；空数组 = 不提醒） */
function buildValarms(reminders: number[] | undefined): string {
  const minutes = reminders ?? DEFAULT_REMINDERS;
  const lines: string[] = [];
  for (const m of [...minutes].sort((a, b) => b - a)) {
    if (m <= 0) continue;
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + escapeIcs("面试提醒（" + formatReminderLabel(m) + "）"),
      `TRIGGER:-PT${m}M`,
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
    lines.push(buildValarms(interview.reminders));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
