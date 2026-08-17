import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation";

/** POST /api/auth/register：邮箱+密码注册（任意邮箱），成功即建立会话 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数不合法" }, { status: 400 });
  }

  const db = getDb();
  const email = parsed.data.email.trim().toLowerCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);
  await db.insert(users).values({
    id,
    email,
    name: parsed.data.name?.trim() || null,
    passwordHash,
    createdAt: new Date().toISOString(),
  });

  const session = await getSession();
  session.userId = id;
  session.email = email;
  await session.save();

  return NextResponse.json({ ok: true });
}
