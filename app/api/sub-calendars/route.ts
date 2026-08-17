import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { rowToSubCalendar, subCalendars } from "@/lib/schema";
import { requireUser } from "@/lib/auth/session";

const createSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "颜色格式不正确"),
});

/** POST /api/sub-calendars：创建子日历 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数不合法" }, { status: 400 });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  await db.insert(subCalendars).values({
    id,
    userId: session.userId,
    name: parsed.data.name.trim(),
    color: parsed.data.color,
    createdAt: new Date().toISOString(),
  });

  const row = await db.select().from(subCalendars).where(eq(subCalendars.id, id)).limit(1);
  return NextResponse.json({ ok: true, subCalendar: rowToSubCalendar(row[0]) }, { status: 201 });
}
