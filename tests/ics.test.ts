import { describe, expect, it } from "vitest";
import type { Interview } from "../types";
import { buildGoogleCalendarUrl, buildIcsEvent, toIcsUtc } from "../lib/ics";
import { zonedWallToUtc } from "../lib/time";
import { mapInterviewToEventBody } from "../lib/integrations/google-calendar";

const BS = String.fromCharCode(92);

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: "iv-test",
    company: "测试, 公司",
    position: "数据分析师",
    startUtc: "2026-08-17T13:30:00.000Z",
    endUtc: "2026-08-17T14:30:00.000Z",
    sourceTimeZone: "America/New_York",
    importance: 4,
    type: "video",
    status: "upcoming",
    subCalendarId: "sub-test",
    prep: {
      focusAreas: [],
      note: "带链接 https://example.com/meet",
      meetingUrl: "https://example.com/meet",
      resumeUrl: null,
      jdNotes: null,
    },
    ...overrides,
  };
}

describe("墙上时间 → UTC 转换的日期校验", () => {
  it("非法日历日期（2026-02-30）返回 null 而不是静默滚动", () => {
    expect(zonedWallToUtc("2026-02-30", "10:00", "UTC")).toBeNull();
    expect(zonedWallToUtc("2026-04-31", "10:00", "UTC")).toBeNull();
  });

  it("合法日期正常转换", () => {
    const result = zonedWallToUtc("2026-02-28", "10:00", "UTC");
    expect(result).not.toBeNull();
    expect(result).toBe("2026-02-28T10:00:00.000Z");
  });

  it("闰年 2 月 29 日合法", () => {
    expect(zonedWallToUtc("2028-02-29", "10:00", "UTC")).toBe("2028-02-29T10:00:00.000Z");
  });
});

describe("ics / Google 日历工具", () => {
  it("toIcsUtc 输出 iCalendar UTC 格式", () => {
    expect(toIcsUtc("2026-08-17T13:30:00.000Z")).toBe("20260817T133000Z");
    expect(toIcsUtc("2026-01-02T03:04:05.000Z")).toBe("20260102T030405Z");
  });

  it("buildIcsEvent 含必要字段且正确转义", () => {
    const ics = buildIcsEvent(makeInterview());
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:iv-test@interview-scheduler.local");
    expect(ics).toContain("DTSTART:20260817T133000Z");
    expect(ics).toContain("DTEND:20260817T143000Z");
    expect(ics).toContain("SUMMARY:测试" + BS + ", 公司 数据分析师");
    expect(ics).toContain("URL:https://example.com/meet");
    expect(ics).toContain("DESCRIPTION:带链接 https://example.com/meet");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("buildGoogleCalendarUrl 生成免登录模板链接", () => {
    const url = new URL(buildGoogleCalendarUrl(makeInterview()));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20260817T133000Z/20260817T143000Z");
    expect(url.searchParams.get("ctz")).toBe("America/New_York");
    expect(url.searchParams.get("text")).toContain("数据分析师");
    expect(url.searchParams.get("details")).toBe("https://example.com/meet");
  });

  it("mapInterviewToEventBody 保留 UTC 时间与所在地时区", () => {
    const body = mapInterviewToEventBody(makeInterview());
    expect(body.start).toEqual({ dateTime: "2026-08-17T13:30:00.000Z", timeZone: "America/New_York" });
    expect(body.end.dateTime).toBe("2026-08-17T14:30:00.000Z");
    expect(body.summary).toBe("测试, 公司 数据分析师");
    expect(body.description).toContain("会议链接：https://example.com/meet");
  });

  it("无链接时 description 不携带会议链接", () => {
    const body = mapInterviewToEventBody(
      makeInterview({ prep: { focusAreas: [], note: "", meetingUrl: null, resumeUrl: null, jdNotes: null } }),
    );
    expect(body.description).toBeUndefined();
  });
});
