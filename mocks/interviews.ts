"use client";

import type { Interview, SubCalendar } from "@/types";
import { getLocalTimeZone, wallDateInZone, zonedWallToUtc } from "@/lib/time";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** 计算「N 天后该时区上午 hour 点」对应的 UTC 时刻（复用 lib/time 的墙上时间转换） */
function utcAtWallTime(timeZone: string, daysFromNow: number, hour: number, minute = 0): string {
  const targetMs = Date.now() + daysFromNow * DAY_MS;
  const dateStr = wallDateInZone(new Date(targetMs).toISOString(), timeZone);
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return zonedWallToUtc(dateStr, timeStr, timeZone) ?? new Date(targetMs).toISOString();
}

function addHours(isoUtc: string, hours: number): string {
  return new Date(Date.parse(isoUtc) + hours * HOUR_MS).toISOString();
}

/** 「N 分钟后」开始的 mock 时刻：按分钟取整，避免 SSR 与客户端毫秒差异导致的水合漂移 */
function utcAfterMinutes(minutes: number): string {
  const nowMs = Date.now();
  const rounded = Math.floor(nowMs / MINUTE_MS) * MINUTE_MS;
  return new Date(rounded + minutes * MINUTE_MS).toISOString();
}

function localTimeZone(): string {
  return getLocalTimeZone();
}

export const SUB_CALENDARS: SubCalendar[] = [
  {
    id: "sub-ds-autumn",
    name: "秋招 - 数据分析岗",
    color: "#7DB8E8",
    description: "2025 秋招数据分析方向统一子日历",
  },
  {
    id: "sub-pm-social",
    name: "社招 - 产品方向",
    color: "#FF9F6B",
    description: "社招产品方向子日历",
  },
];

// 四条 mock 覆盖：紧急测评（25 分钟后，触发备战胶囊/专注模式）、高优、中优、低优
const byteDanceStart = utcAtWallTime("America/New_York", 1, 10);
const meituanStart = utcAtWallTime("America/Los_Angeles", 5, 14);
const airbnbStart = utcAtWallTime("Europe/London", 21, 9, 30);
const tencentStart = utcAfterMinutes(25);

export const INTERVIEWS: Interview[] = [
  {
    id: "iv-004",
    company: "腾讯",
    position: "数据分析师（在线测评）",
    startUtc: tencentStart,
    endUtc: addHours(tencentStart, 1),
    sourceTimeZone: localTimeZone(),
    importance: 4,
    type: "assessment",
    status: "upcoming",
    subCalendarId: "sub-pm-social",
    prep: {
      focusAreas: ["SQL 限时题", "业务分析", "图表解读"],
      note: "在线测评，找一个安静的环境并提前登录系统。",
      meetingUrl: "https://example.com/assessment/tencent-ds",
      resumeUrl: "/mocks/mock-resume.pdf",
      jdNotes:
        "腾讯数据分析师 JD 要点：SQL 熟练、AB 实验理解、业务指标体系。面试官关注：如何定义指标、如何归因波动。",
    },
  },
  {
    id: "iv-001",
    company: "字节跳动",
    position: "数据分析师（校招）",
    startUtc: byteDanceStart,
    endUtc: addHours(byteDanceStart, 1),
    sourceTimeZone: "America/New_York",
    importance: 5,
    type: "video",
    status: "upcoming",
    subCalendarId: "sub-ds-autumn",
    prep: {
      focusAreas: ["SQL 实战", "A/B 实验设计", "业务指标拆解"],
      note: "视频面试，提前 10 分钟调试摄像头与麦克风。",
      meetingUrl: "https://example.com/meet/byte-dance-ds",
      resumeUrl: null,
      jdNotes: null,
    },
  },
  {
    id: "iv-002",
    company: "美团",
    position: "数据产品经理",
    startUtc: meituanStart,
    endUtc: addHours(meituanStart, 1.5),
    sourceTimeZone: "America/Los_Angeles",
    importance: 3,
    type: "online-test",
    status: "upcoming",
    subCalendarId: "sub-ds-autumn",
    prep: {
      focusAreas: ["SQL 笔试", "统计学基础", "产品数据分析"],
      note: "线上笔试 90 分钟，准备好纸笔与草稿。",
      meetingUrl: null,
      resumeUrl: null,
      jdNotes: "美团数据产品 JD 要点：指标体系设计、实验平台、数据产品方法论。",
    },
  },
  {
    id: "iv-003",
    company: "Airbnb",
    position: "Data Analyst（HR 初面）",
    startUtc: airbnbStart,
    endUtc: addHours(airbnbStart, 0.75),
    sourceTimeZone: "Europe/London",
    importance: 2,
    type: "hr-screen",
    status: "upcoming",
    subCalendarId: "sub-ds-autumn",
    prep: {
      focusAreas: ["自我介绍", "简历项目梳理", "行为面试问题"],
      note: "HR 初面 45 分钟，准备好自我介绍。",
      meetingUrl: null,
      resumeUrl: null,
      jdNotes: null,
    },
  },
];
