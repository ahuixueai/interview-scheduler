import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  email: string;
}

const DEV_SECRET = "dev-only-secret-0123456789abcdef0123456789abcdef";

/** 会话 cookie 配置（生产环境必须设置 AUTH_SECRET） */
export const sessionOptions = {
  password: process.env.AUTH_SECRET ?? DEV_SECRET,
  cookieName: "interview-scheduler-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
  },
};

/** 读取当前会话（未登录时 userId 为空字符串） */
export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** 服务端接口守卫：未登录返回 null，已登录返回会话 */
export async function requireUser(): Promise<IronSession<SessionData> | null> {
  const session = await getSession();
  return session.userId ? session : null;
}
