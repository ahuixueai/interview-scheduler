import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __interviewSchedulerDb?: Db };

/**
 * 惰性连接：只在请求处理时创建（构建期/CI 无 DATABASE_URL 也不会报错），
 * 连接实例挂在 globalThis 上避免 dev 热更新时重复建立连接。
 */
export function getDb(): Db {
  const existing = globalForDb.__interviewSchedulerDb;
  if (existing) return existing;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL 环境变量（见 .env.example）");
  // 本地库（localhost）无需 SSL；云数据库（Supabase/Neon）强制 SSL，自动按主机名判断
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const client = postgres(url, { max: 10, ssl: isLocal ? false : "require" });
  const db = drizzle(client, { schema });
  globalForDb.__interviewSchedulerDb = db;
  return db;
}
