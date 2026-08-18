import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/schema';
import { verifyPuzzle } from '@/lib/puzzle';
import { sendVerificationEmail } from '@/lib/mailer';
import {
  countRecentSends,
  EMAIL_HOUR_LIMIT,
  hashIp,
  IP_HOUR_LIMIT,
  SEND_MIN_INTERVAL_MS,
  storeCode,
} from '@/lib/verification';
import { verificationSendSchema } from '@/lib/validation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 从请求头取真实 IP（Vercel 走 x-forwarded-for），只存哈希 */
function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  const raw = fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return hashIp(raw);
}

/**
 * POST /api/verification/send：人机验证通过 + 频率限制通过后发送 6 位验证码。
 * 邮箱已注册时不再发送，直接提示登录（常见中文产品做法）。
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是合法 JSON' }, { status: 400 });
  }

  const parsed = verificationSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '参数不合法' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
  }

  // 第一道关：拼图结果（签名/有效期/误差 <=5px）
  const puzzle = verifyPuzzle(parsed.data.puzzleToken, parsed.data.puzzleOffset);
  if (!puzzle.ok) {
    return NextResponse.json({ error: puzzle.error ?? '验证失败' }, { status: 400 });
  }

  // 邮箱已注册：不发送，直接引导登录（同时避免刷验证码骚扰他人邮箱）
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ status: 'registered', message: '该邮箱已注册，请直接登录' });
  }

  // 频率限制：60 秒间隔 / 邮箱每小时 5 次 / 每 IP 每小时 10 次
  const nowMs = Date.now();
  const ipHash = clientIp(request);
  const recent = await countRecentSends(email, ipHash, 60 * 60_000, nowMs);
  const lastMinute = await countRecentSends(email, ipHash, SEND_MIN_INTERVAL_MS, nowMs);
  if (lastMinute.byEmail > 0) {
    return NextResponse.json({ error: '发送太频繁，请 60 秒后再试' }, { status: 429 });
  }
  if (recent.byEmail >= EMAIL_HOUR_LIMIT) {
    return NextResponse.json({ error: '该邮箱今天发送次数过多，请 1 小时后再试' }, { status: 429 });
  }
  if (recent.byIp >= IP_HOUR_LIMIT) {
    return NextResponse.json({ error: '当前网络发送次数过多，请稍后再试' }, { status: 429 });
  }

  const code = await storeCode(email, ipHash, 'register', nowMs);
  const sent = await sendVerificationEmail(email, code);
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error ?? '邮件发送失败，请稍后再试' }, { status: 503 });
  }

  const payload: Record<string, unknown> = { status: 'sent', cooldownMs: SEND_MIN_INTERVAL_MS };
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
    // 仅开发环境联调用：验证码随响应返回，生产环境绝不返回
    payload.debugCode = code;
  }
  return NextResponse.json(payload);
}
