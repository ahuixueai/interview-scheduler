import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireUser } from "@/lib/auth/session";

function newToken(): string {
  // 32 字符 base64url 随机 token
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** GET /api/calendar/feed-info：返回当前用户的订阅链接（不存在则生成） */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select({ token: users.calendarFeedToken })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  let token = rows[0]?.token ?? null;
  if (!token) {
    token = newToken();
    await db.update(users).set({ calendarFeedToken: token }).where(eq(users.id, session.userId));
  }
  return NextResponse.json({
    url: `${request.nextUrl.origin}/api/calendar/${token}.ics`,
    token,
  });
}

/** POST /api/calendar/feed-info { action: "reset" }：重置 token（旧链接立即失效） */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "reset") {
    return NextResponse.json({ error: "action 必须是 reset" }, { status: 400 });
  }

  const token = newToken();
  const db = getDb();
  await db.update(users).set({ calendarFeedToken: token }).where(eq(users.id, session.userId));

  return NextResponse.json({
    url: `${request.nextUrl.origin}/api/calendar/${token}.ics`,
    token,
  });
}
