import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { requireUser } from "@/lib/auth/session";

const orderSchema = z.object({
  ids: z.array(z.string().min(1)).max(500),
});

/** PUT /api/schedule/order：持久化列表顺序（按用户隔离） */
export async function PUT(request: Request): Promise<NextResponse> {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ids 必须是字符串数组" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select({ id: interviews.id })
    .from(interviews)
    .where(eq(interviews.userId, session.userId));
  const owned = new Set(rows.map((row) => row.id));
  const ids = parsed.data.ids.filter((id) => owned.has(id));

  for (let index = 0; index < ids.length; index++) {
    await db
      .update(interviews)
      .set({ sortOrder: index, updatedAt: new Date().toISOString() })
      .where(eq(interviews.id, ids[index]));
  }
  return NextResponse.json({ ok: true });
}
