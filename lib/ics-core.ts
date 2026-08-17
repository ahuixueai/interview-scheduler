import type { Interview } from "@/types";

/** UTC ISO → iCalendar UTC 格式：2026-08-17T13:30:00.000Z → 20260817T133000Z */
export function toIcsUtc(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}(?=Z)/, "");
}

const BACKSLASH = String.fromCharCode(92);

/** iCalendar 文本转义：\ ; , 换行（用 fromCharCode 构造反斜杠，杜绝源码转义歧义） */
export function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, BACKSLASH + BACKSLASH)
    .replace(/;/g, BACKSLASH + ";")
    .replace(/,/g, BACKSLASH + ",")
    .replace(/\n/g, BACKSLASH + "n");
}

/** 生成单场面试的 .ics 内容（VCALENDAR 包裹单个 VEVENT，UTC 时间） */
export function buildIcsEvent(interview: Interview): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InterviewScheduler//ZH//CN",
    "BEGIN:VEVENT",
    `UID:${interview.id}@interview-scheduler.local`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(interview.startUtc)}`,
    `DTEND:${toIcsUtc(interview.endUtc)}`,
    `SUMMARY:${escapeIcs(`${interview.company} ${interview.position}`)}`,
  ];
  if (interview.prep.meetingUrl) lines.push(`URL:${escapeIcs(interview.prep.meetingUrl)}`);
  if (interview.prep.note) lines.push(`DESCRIPTION:${escapeIcs(interview.prep.note)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

/** Google 日历模板链接（免登录）：跳转到 Google Calendar 并预填事件 */
export function buildGoogleCalendarUrl(interview: Interview): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${interview.company} ${interview.position}`,
    dates: `${toIcsUtc(interview.startUtc)}/${toIcsUtc(interview.endUtc)}`,
    ctz: interview.sourceTimeZone,
  });
  if (interview.prep.meetingUrl) params.set("details", interview.prep.meetingUrl);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
