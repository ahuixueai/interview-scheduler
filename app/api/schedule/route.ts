import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ensureSeeded } from "@/lib/seed";

/** GET /api/schedule：当前用户的日程快照（首次自动播种演示数据） */
export async function GET(): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const snapshot = await ensureSeeded(session.userId);
    return NextResponse.json(snapshot);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "服务异常" }, { status: 500 });
  }
}
