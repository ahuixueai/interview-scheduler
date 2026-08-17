import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { interviews, rowToInterview } from "@/lib/schema";
import { requireUser } from "@/lib/auth/session";

const patchSchema = z.object({
  company: z.string().min(1).max(120).optional(),
  position: z.string().min(1).max(120).optional(),
  type: z.enum(["video", "online-test", "hr-screen", "assessment"]).optional(),
  importance: z.number().int().min(1).max(5).optional(),
  subCalendarId: z.string().min(1).optional(),
  status: z.enum(["upcoming", "offer", "declined"]).optional(),
  startUtc: z.string().optional(),
  endUtc: z.string().optional(),
  sourceTimeZone: z.string().min(1).optional(),
  meetingUrl: z.string().max(500).nullable().optional(),
  jdNotes: z.string().max(5000).nullable().optional(),
  externalEventId: z.string().nullable().optional(),
});

/** PATCH /api/interviews/[id]：更新（按用户隔离，越权返回 404） */
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
    .select({ id: interviews.id })
    .from(interviews)
    .where(and(eq(interviews.id, id), eq(interviews.userId, session.userId)))
    .limit(1);
  if (owned.length === 0) {
    return NextResponse.json({ error: "面试不存在" }, { status: 404 });
  }

  await db
    .update(interviews)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(interviews.id, id));

  const row = await db.select().from(interviews).where(eq(interviews.id, id)).limit(1);
  return NextResponse.json({ ok: true, interview: rowToInterview(row[0]) });
}

/** DELETE /api/interviews/[id]：删除（按用户隔离） */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const owned = await db
    .select({ id: interviews.id })
    .from(interviews)
    .where(and(eq(interviews.id, id), eq(interviews.userId, session.userId)))
    .limit(1);
  if (owned.length === 0) {
    return NextResponse.json({ error: "面试不存在" }, { status: 404 });
  }
  await db.delete(interviews).where(eq(interviews.id, id));
  return NextResponse.json({ ok: true });
}
