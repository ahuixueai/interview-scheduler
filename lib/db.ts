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
  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });
  globalForDb.__interviewSchedulerDb = db;
  return db;
}
