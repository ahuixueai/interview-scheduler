import { eq } from "drizzle-orm";
import type { Interview, SubCalendar } from "@/types";
import { getLocalTimeZone, zonedWallToUtc, wallDateInZone } from "@/lib/time-core";
import { calcPriority } from "@/lib/priority";
import { getDb } from "@/lib/db";
import { interviews, rowToInterview, rowToSubCalendar, subCalendars, users } from "@/lib/schema";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** 「N 天后该时区上午 hour 点」对应的 UTC 时刻 */
function utcAtWallTime(timeZone: string, daysFromNow: number, hour: number, minute = 0): string {
  const targetMs = Date.now() + daysFromNow * DAY_MS;
  const dateStr = wallDateInZone(new Date(targetMs).toISOString(), timeZone);
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return zonedWallToUtc(dateStr, timeStr, timeZone) ?? new Date(targetMs).toISOString();
}

function addHours(isoUtc: string, hours: number): string {
  return new Date(Date.parse(isoUtc) + hours * 3_600_000).toISOString();
}

/** 「N 分钟后」开始：按分钟取整，保证服务端与客户端渲染一致 */
function utcAfterMinutes(minutes: number): string {
  const nowMs = Date.now();
  const rounded = Math.floor(nowMs / MINUTE_MS) * MINUTE_MS;
  return new Date(rounded + minutes * MINUTE_MS).toISOString();
}

/**
 * 为新用户播种演示数据（4 场面试 + 2 个子日历）。
 * 已存在数据时跳过；返回用户当前的日程快照。
 */
export async function ensureSeeded(userId: string): Promise<{
  interviews: Interview[];
  subCalendars: SubCalendar[];
  order: string[];
}> {
  const db = getDb();
  const [user] = await db
    .select({ seededAt: users.seededAt })
    .from(users)
    .where(eq(users.id, userId));
  const existing = await db
    .select({ id: interviews.id })
    .from(interviews)
    .where(eq(interviews.userId, userId))
    .limit(1);

  // 只播一次：用户清空全部面试后进入真正的空状态，演示数据不再复活
  if (existing.length === 0 && !user?.seededAt) {
    const now = new Date().toISOString();
    // 每个用户独立 UUID：固定 id 会在第二个用户播种时撞主键
    const subDsId = crypto.randomUUID();
    const subPmId = crypto.randomUUID();
    const calendarRows = [
      { id: subDsId, userId, name: "秋招 - 数据分析岗", color: "#7DB8E8", createdAt: now },
      { id: subPmId, userId, name: "社招 - 产品方向", color: "#FF9F6B", createdAt: now },
    ];
    await db.insert(subCalendars).values(calendarRows);

    const byteDanceStart = utcAtWallTime("America/New_York", 1, 10);
    const meituanStart = utcAtWallTime("America/Los_Angeles", 5, 14);
    const airbnbStart = utcAtWallTime("Europe/London", 21, 9, 30);
    const tencentStart = utcAfterMinutes(25);
    const serverTz = getLocalTimeZone();

    const rows = [
      {
        id: crypto.randomUUID(), userId, subCalendarId: subPmId, company: "腾讯",
        position: "数据分析师（在线测评）", type: "assessment", importance: 4,
        startUtc: tencentStart, endUtc: addHours(tencentStart, 1), sourceTimeZone: serverTz,
        meetingUrl: "https://example.com/assessment/tencent-ds",
        resumeUrl: "/mocks/mock-resume.pdf",
        jdNotes: "腾讯数据分析师 JD 要点：SQL 熟练、AB 实验理解、业务指标体系。",
        focusAreas: ["SQL 限时题", "业务分析", "图表解读"],
        note: "在线测评，找一个安静的环境并提前登录系统。",
        status: "upcoming", positionIndex: 0, createdAt: now, updatedAt: now,
      },
      {
        id: crypto.randomUUID(), userId, subCalendarId: subDsId, company: "字节跳动",
        position: "数据分析师（校招）", type: "video", importance: 5,
        startUtc: byteDanceStart, endUtc: addHours(byteDanceStart, 1), sourceTimeZone: "America/New_York",
        meetingUrl: "https://example.com/meet/byte-dance-ds",
        focusAreas: ["SQL 实战", "A/B 实验设计", "业务指标拆解"],
        note: "视频面试，提前 10 分钟调试摄像头与麦克风。",
        status: "upcoming", positionIndex: 1, createdAt: now, updatedAt: now,
      },
      {
        id: crypto.randomUUID(), userId, subCalendarId: subDsId, company: "美团",
        position: "数据产品经理", type: "online-test", importance: 3,
        startUtc: meituanStart, endUtc: addHours(meituanStart, 1.5), sourceTimeZone: "America/Los_Angeles",
        jdNotes: "美团数据产品 JD 要点：指标体系设计、实验平台、数据产品方法论。",
        focusAreas: ["SQL 笔试", "统计学基础", "产品数据分析"],
        note: "线上笔试 90 分钟，准备好纸笔与草稿。",
        status: "upcoming", positionIndex: 2, createdAt: now, updatedAt: now,
      },
      {
        id: crypto.randomUUID(), userId, subCalendarId: subDsId, company: "Airbnb",
        position: "Data Analyst（HR 初面）", type: "hr-screen", importance: 2,
        startUtc: airbnbStart, endUtc: addHours(airbnbStart, 0.75), sourceTimeZone: "Europe/London",
        focusAreas: ["自我介绍", "简历项目梳理", "行为面试问题"],
        note: "HR 初面 45 分钟，准备好自我介绍。",
        status: "upcoming", positionIndex: 3, createdAt: now, updatedAt: now,
      },
    ];
    // 初始顺序 = 优先级降序（与旧版客户端行为一致）
    const toInterview = (row: (typeof rows)[number]): Interview => ({
      id: row.id,
      company: row.company,
      position: row.position,
      startUtc: row.startUtc,
      endUtc: row.endUtc,
      sourceTimeZone: row.sourceTimeZone,
      importance: row.importance as Interview["importance"],
      type: row.type as Interview["type"],
      status: row.status as Interview["status"],
      subCalendarId: row.subCalendarId,
      prep: { focusAreas: [], note: "", meetingUrl: null, resumeUrl: null, jdNotes: null },
    });
    const ordered = [...rows].sort(
      (a, b) => calcPriority(toInterview(b), Date.now()) - calcPriority(toInterview(a), Date.now()),
    );
    await db.insert(interviews).values(
      ordered.map((row, index) => {
        const { positionIndex: _unused, ...rest } = row;
        void _unused;
        return { ...rest, sortOrder: index };
      }),
    );
  }

  // 记录已播种（含迁移前的存量用户），之后清空面试不再触发演示数据
  if (!user?.seededAt) {
    await db
      .update(users)
      .set({ seededAt: new Date().toISOString() })
      .where(eq(users.id, userId));
  }

  const interviewRows = await db
    .select()
    .from(interviews)
    .where(eq(interviews.userId, userId))
    .orderBy(interviews.sortOrder);
  const calendarRows = await db
    .select()
    .from(subCalendars)
    .where(eq(subCalendars.userId, userId))
    .orderBy(subCalendars.createdAt);

  return {
    interviews: interviewRows.map(rowToInterview),
    subCalendars: calendarRows.map(rowToSubCalendar),
    order: interviewRows.map((row) => row.id),
  };
}
