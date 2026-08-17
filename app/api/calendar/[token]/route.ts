import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { interviews, rowToInterview, users } from "@/lib/schema";
import { buildCalendarFeed } from "@/lib/feed";

/**
 * GET /api/calendar/[token].ics：用户的订阅日历（只读，token 即访问凭证）。
 * 手机/日历客户端会定期拉取此地址自动同步。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const raw = (await params).token;
  // 路由参数会吞掉 .ics 后缀（如 /api/calendar/TOKEN.ics），先剥离再校验
  const token = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    return NextResponse.json({ error: "无效的订阅地址" }, { status: 404 });
  }

  const db = getDb();
  const owners = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.calendarFeedToken, token))
    .limit(1);
  const userId = owners[0]?.id;
  if (!userId) {
    return NextResponse.json({ error: "订阅地址不存在或已失效" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(interviews)
    .where(eq(interviews.userId, userId))
    .orderBy(interviews.sortOrder);
  const feed = buildCalendarFeed(rows.map(rowToInterview));

  return new NextResponse(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=interview-scheduler.ics",
      "Cache-Control": "no-store",
    },
  });
}
