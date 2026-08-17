import { NextResponse } from "next/server";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { interviews, rowToInterview, subCalendars } from "@/lib/schema";
import { requireUser } from "@/lib/auth/session";
import { zonedWallToUtc } from "@/lib/time-core";

const draftSchema = z.object({
  company: z.string().min(1, "公司名称不能为空").max(120),
  position: z.string().min(1, "岗位名称不能为空").max(120),
  type: z.enum(["video", "online-test", "hr-screen", "assessment"]),
  importance: z.number().int().min(1).max(5),
  subCalendarId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不正确"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "时间格式不正确"),
  sourceTimeZone: z.string().min(1),
  durationMinutes: z.number().int().min(15).max(480),
  meetingUrl: z.string().max(500).optional(),
  jdNotes: z.string().max(5000).optional(),
});

/** POST /api/interviews：创建面试（墙上时间由服务端统一转 UTC 存储） */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数不合法" }, { status: 400 });
  }
  const draft = parsed.data;

  const startUtc = zonedWallToUtc(draft.startDate, draft.startTime, draft.sourceTimeZone);
  if (!startUtc) {
    return NextResponse.json({ error: "时间解析失败，请检查日期与时间" }, { status: 400 });
  }

  const db = getDb();
  // 子日历必须属于当前用户（防脏数据）
  const ownedCalendar = await db
    .select({ id: subCalendars.id })
    .from(subCalendars)
    .where(and(eq(subCalendars.userId, session.userId), eq(subCalendars.id, draft.subCalendarId)))
    .limit(1);
  if (ownedCalendar.length === 0) {
    return NextResponse.json({ error: "子日历不存在或不属于当前用户" }, { status: 400 });
  }

  const last = await db
    .select({ value: max(interviews.sortOrder) })
    .from(interviews)
    .where(eq(interviews.userId, session.userId));
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(interviews).values({
    id,
    userId: session.userId,
    subCalendarId: draft.subCalendarId,
    company: draft.company.trim(),
    position: draft.position.trim(),
    type: draft.type,
    importance: draft.importance,
    status: "upcoming",
    startUtc,
    endUtc: new Date(Date.parse(startUtc) + draft.durationMinutes * 60_000).toISOString(),
    sourceTimeZone: draft.sourceTimeZone,
    meetingUrl: draft.meetingUrl?.trim() || null,
    jdNotes: draft.jdNotes?.trim() || null,
    focusAreas: [],
    sortOrder: (last[0]?.value ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  });

  const row = await db.select().from(interviews).where(eq(interviews.id, id)).limit(1);
  return NextResponse.json({ ok: true, interview: rowToInterview(row[0]) }, { status: 201 });
}
