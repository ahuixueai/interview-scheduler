import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import { emailVerifications } from "./schema";

export const CODE_TTL_MS = 10 * 60_000;
export const CODE_MAX_ATTEMPTS = 5;
export const SEND_MIN_INTERVAL_MS = 60_000;
export const EMAIL_HOUR_LIMIT = 5;
export const IP_HOUR_LIMIT = 20;

export type VerificationPurpose = "register";

/** 6 位数字验证码（加密随机） */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/** 恒定时间比较两个哈希 */
export function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export interface RecentSendCount {
  byEmail: number;
  byIp: number;
}

/** 统计时间窗内该邮箱 / 该 IP 的验证码发送次数（频率限制依据） */
export async function countRecentSends(
  email: string,
  ipHash: string,
  windowMs: number,
  nowMs: number,
): Promise<RecentSendCount> {
  const db = getDb();
  const since = new Date(nowMs - windowMs).toISOString();
  const rows = await db
    .select({ email: emailVerifications.email, ipHash: emailVerifications.ipHash })
    .from(emailVerifications)
    .where(
      and(
        gte(emailVerifications.createdAt, since),
        or(eq(emailVerifications.email, email), eq(emailVerifications.ipHash, ipHash)),
      ),
    );
  let byEmail = 0;
  let byIp = 0;
  for (const row of rows) {
    if (row.email === email) byEmail += 1;
    if (row.ipHash === ipHash) byIp += 1;
  }
  return { byEmail, byIp };
}

/** 落库一条验证码（只存哈希）并返回明文（用于发送邮件/开发日志） */
export async function storeCode(
  email: string,
  ipHash: string,
  purpose: VerificationPurpose,
  nowMs: number,
): Promise<string> {
  const db = getDb();
  const code = generateCode();
  await db.insert(emailVerifications).values({
    id: crypto.randomUUID(),
    email,
    ipHash,
    purpose,
    codeHash: hashCode(code),
    expiresAt: new Date(nowMs + CODE_TTL_MS).toISOString(),
    createdAt: new Date(nowMs).toISOString(),
  });
  return code;
}

export interface CodeCheck {
  ok: boolean;
  error?: string;
}

const codeFail = (error: string): CodeCheck => ({ ok: false, error });

/** 校验并消费验证码：过期/超次/不匹配时返回具体错误；成功即标记已用（一次性） */
export async function verifyCode(
  email: string,
  code: string,
  purpose: VerificationPurpose,
  nowMs: number,
): Promise<CodeCheck> {
  const db = getDb();
  const rows = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, email),
        eq(emailVerifications.purpose, purpose),
        isNull(emailVerifications.consumedAt),
      ),
    )
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);
  const record = rows[0];
  if (!record) return codeFail("验证码错误或已过期，请重新获取");
  if (Date.parse(record.expiresAt) <= nowMs) return codeFail("验证码已过期，请重新获取");
  if (record.attempts >= CODE_MAX_ATTEMPTS) return codeFail("错误次数过多，请重新获取验证码");
  if (!hashesEqual(record.codeHash, hashCode(code))) {
    await db
      .update(emailVerifications)
      .set({ attempts: record.attempts + 1 })
      .where(eq(emailVerifications.id, record.id));
    return codeFail("验证码不正确");
  }
  await db
    .update(emailVerifications)
    .set({ consumedAt: new Date(nowMs).toISOString() })
    .where(eq(emailVerifications.id, record.id));
  return { ok: true };
}
