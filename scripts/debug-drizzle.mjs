import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../lib/schema.js";

const client = postgres("postgresql://localhost:5432/interview_scheduler", { max: 1 });
const db = drizzle(client, { schema });

const uid = "zz-" + Date.now();
try {
  await db.insert(schema.users).values({
    id: uid,
    email: uid + "@t.local",
    createdAt: new Date().toISOString(),
  });
  await db.insert(schema.subCalendars).values({
    id: "sub-debug",
    userId: uid,
    name: "秋招 - 数据分析岗",
    color: "#7DB8E8",
    createdAt: new Date().toISOString(),
  });
  console.log("DRIZZLE INSERT OK");
} catch (e) {
  console.log("DRIZZLE ERROR:", e.message);
  console.log("CAUSE:", e.cause?.message ?? "(无)");
}
await client.end();
