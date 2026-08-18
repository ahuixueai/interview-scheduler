import { Resend } from "resend";

export interface MailResult {
  ok: boolean;
  error?: string;
}

/** 验证码邮件 HTML（内联样式，兼容各邮箱客户端） */
export function verificationEmailHtml(code: string): string {
  return [
    "<div style=\"font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1a2634\">",
    "<h2 style=\"font-size:18px;margin:0 0 12px\">面试与笔试日程 · 验证码</h2>",
    "<p style=\"font-size:14px;margin:0 0 16px\">你的注册验证码是：</p>",
    "<div style=\"font-size:28px;font-weight:700;letter-spacing:6px;background:#f2f8fd;border-radius:10px;padding:14px 20px;text-align:center\">" + code + "</div>",
    "<p style=\"font-size:13px;color:#5b6b7d;margin:16px 0 0\">10 分钟内有效，请勿转发给他人。如非本人操作，请忽略此邮件。</p>",
    "</div>",
  ].join("");
}

/**
 * 发送验证码邮件：走 Resend；未配置 API Key 时开发环境打印到日志（方便本地联调），
 * 生产环境未配置则拒绝发送（注册安全要求，fail-closed）。
 */
export async function sendVerificationEmail(email: string, code: string): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim() || "面试与笔试日程 <onboarding@resend.dev>";

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "邮件服务未配置，请联系管理员" };
    }
    console.log(`[DEV] 验证码 ${code} → ${email}`);
    return { ok: true };
  }

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: [email],
    subject: "你的验证码 · 面试与笔试日程",
    html: verificationEmailHtml(code),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
