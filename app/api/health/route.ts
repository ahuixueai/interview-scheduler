import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/** 临时诊断接口：暴露 getSession 的真实错误（定位后移除） */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    return NextResponse.json({ ok: true, userId: session.userId ?? null, hasPassword: Boolean(process.env.AUTH_SECRET) });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? (e.stack ?? "").slice(0, 800) : "",
      hasSecret: Boolean(process.env.AUTH_SECRET),
      node: process.version,
    }, { status: 500 });
  }
}
