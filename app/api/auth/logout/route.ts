import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/** POST /api/auth/logout：销毁会话 */
export async function POST(): Promise<NextResponse> {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
