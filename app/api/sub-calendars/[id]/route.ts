import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { interviews, rowToInterview, rowToSubCalendar, subCalendars } from "@/lib/schema";
import { requireUser } from "@/lib/auth/session";

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const deleteSchema = z.object({
  mode: z.enum(["migrate", "cascade"]),
  targetId: z.string().min(1).optional(),
});

/** PATCH /api/sub-calendars/[id]：编辑 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数不合法" }, { status: 400 });
  }

  const db = getDb();
  const owned = await db
    .select({ id: subCalendars.id })
    .from(subCalendars)
    .where(and(eq(subCalendars.id, id), eq(subCalendars.userId, session.userId)))
    .limit(1);
  if (owned.length === 0) {
    return NextResponse.json({ error: "子日历不存在" }, { status: 404 });
  }
  await db.update(subCalendars).set(parsed.data).where(eq(subCalendars.id, id));

  const row = await db.select().from(subCalendars).where(eq(subCalendars.id, id)).limit(1);
  return NextResponse.json({ ok: true, subCalendar: rowToSubCalendar(row[0]) });
}

/** DELETE /api/sub-calendars/[id]：删除；mode=migrate 迁移关联面试，cascade 一并删除。
 *  返回最新快照供前端整体刷新（不静默丢数据）。 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "mode 必须是 migrate 或 cascade" }, { status: 400 });
  }

  const db = getDb();
  const owned = await db
    .select({ id: subCalendars.id })
    .from(subCalendars)
    .where(and(eq(subCalendars.id, id), eq(subCalendars.userId, session.userId)))
    .limit(1);
  if (owned.length === 0) {
    return NextResponse.json({ error: "子日历不存在" }, { status: 404 });
  }

  if (parsed.data.mode === "migrate" && parsed.data.targetId) {
    await db
      .update(interviews)
      .set({ subCalendarId: parsed.data.targetId, updatedAt: new Date().toISOString() })
      .where(eq(interviews.subCalendarId, id));
  }
  if (parsed.data.mode === "cascade") {
    await db.delete(interviews).where(eq(interviews.subCalendarId, id));
  }
  await db.delete(subCalendars).where(eq(subCalendars.id, id));

  const interviewRows = await db
    .select()
    .from(interviews)
    .where(eq(interviews.userId, session.userId))
    .orderBy(interviews.sortOrder);
  const calendarRows = await db
    .select()
    .from(subCalendars)
    .where(eq(subCalendars.userId, session.userId))
    .orderBy(subCalendars.createdAt);
  return NextResponse.json({
    ok: true,
    interviews: interviewRows.map(rowToInterview),
    subCalendars: calendarRows.map(rowToSubCalendar),
    order: interviewRows.map((row) => row.id),
  });
}
