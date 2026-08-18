import { describe, expect, it } from "vitest";
import type { Interview } from "../types";
import { buildCalendarFeed } from "../lib/feed";

const BS = String.fromCharCode(92);

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: "iv-feed-1",
    company: "测试, 公司",
    position: "数据分析师",
    startUtc: "2026-08-17T13:30:00.000Z",
    endUtc: "2026-08-17T14:30:00.000Z",
    sourceTimeZone: "America/New_York",
    importance: 4,
    type: "video",
    status: "upcoming",
    subCalendarId: "sub-x",
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

describe("订阅日历生成器", () => {
  it("生成合法 VCALENDAR 结构", () => {
    const feed = buildCalendarFeed([makeInterview()]);
    expect(feed).toContain("BEGIN:VCALENDAR");
    expect(feed).toContain("BEGIN:VEVENT");
    expect(feed).toContain("END:VEVENT");
    expect(feed).toContain("END:VCALENDAR");
    expect(feed).toContain("X-WR-CALNAME:面试与笔试日程");
    expect(feed).toContain("DTSTART:20260817T133000Z");
    expect(feed).toContain("DTEND:20260817T143000Z");
    expect(feed).toContain("SUMMARY:测试" + BS + ", 公司 · 数据分析师");
    expect(feed).toContain("会议链接：https://example.com/meet");
  });

  it("每场事件带两个 VALARM 提醒（1 天 + 1 小时）", () => {
    const feed = buildCalendarFeed([makeInterview()]);
    expect(feed).toContain("BEGIN:VALARM");
    expect(feed).toContain("TRIGGER:-PT1440M");
    expect(feed).toContain("TRIGGER:-PT60M");
    expect(feed.match(/BEGIN:VALARM/g)).toHaveLength(2);
  });

  it("排除已挂的面试，Offer 加前缀标记", () => {
    const feed = buildCalendarFeed([
      makeInterview({ id: "a", status: "declined", company: "已挂公司" }),
      makeInterview({ id: "b", status: "offer", company: "Offer公司" }),
    ]);
    expect(feed).not.toContain("已挂公司");
    expect(feed).toContain("[Offer] Offer公司");
  });

  it("自定义提醒：只按该场设置生成 VALARM", () => {
    const feed = buildCalendarFeed([makeInterview({ reminders: [30] })]);
    expect(feed).toContain("TRIGGER:-PT30M");
    expect(feed).not.toContain("TRIGGER:-PT1440M");
    expect(feed).not.toContain("TRIGGER:-PT60M");
  });

  it("空提醒数组 = 不提醒（无 VALARM）", () => {
    const feed = buildCalendarFeed([makeInterview({ reminders: [] })]);
    expect(feed).not.toContain("BEGIN:VALARM");
  });

  it("空列表也是合法日历", () => {
    const feed = buildCalendarFeed([]);
    expect(feed).toContain("BEGIN:VCALENDAR");
    expect(feed).toContain("END:VCALENDAR");
    expect(feed).not.toContain("BEGIN:VEVENT");
  });
});
