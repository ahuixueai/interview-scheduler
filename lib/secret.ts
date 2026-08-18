/** 会话与签名共用的密钥来源；用 || 而非 ??（Vercel 空字符串环境变量也要兜底） */
export const DEV_AUTH_SECRET = "dev-only-secret-0123456789abcdef0123456789abcdef";

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET?.trim() || DEV_AUTH_SECRET;
}
