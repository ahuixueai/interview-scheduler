import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type { Interview, SubCalendar } from "@/types";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  image: text("image"),
  /** 订阅日历的私有 token（生成后作为只读 .ics 地址的一部分） */
  calendarFeedToken: text("calendar_feed_token"),
  /** 是否已播种演示数据（只播一次：清空全部面试后不再复活演示数据） */
  seededAt: text("seeded_at"),
  createdAt: text("created_at").notNull(),
});

export const subCalendars = pgTable("sub_calendars", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: text("created_at").notNull(),
});

export const interviews = pgTable("interviews", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subCalendarId: text("sub_calendar_id"),
  company: text("company").notNull(),
  position: text("position").notNull(),
  type: text("type").notNull(),
  importance: integer("importance").notNull(),
  status: text("status").notNull().default("upcoming"),
  startUtc: text("start_utc").notNull(),
  endUtc: text("end_utc").notNull(),
  sourceTimeZone: text("source_time_zone").notNull(),
  meetingUrl: text("meeting_url"),
  resumeUrl: text("resume_url"),
  jdNotes: text("jd_notes"),
  note: text("note"),
  focusAreas: jsonb("focus_areas").$type<string[]>().default([]),
  externalEventId: text("external_event_id"),
  /** 提醒时间（开始前分钟数）；默认 [1440, 60] = 提前 1 天 + 1 小时 */
  reminderMinutes: jsonb("reminder_minutes").$type<number[]>().default([1440, 60]),
  /** 列表展示顺序（手动拖拽排序 + 优先级重排持久化） */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type InterviewRow = typeof interviews.$inferSelect;
export type SubCalendarRow = typeof subCalendars.$inferSelect;

/** 数据库行 → 领域模型（null/JSON 归一） */
export function rowToInterview(row: InterviewRow): Interview {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    startUtc: row.startUtc,
    endUtc: row.endUtc,
    sourceTimeZone: row.sourceTimeZone,
    importance: (row.importance >= 1 && row.importance <= 5 ? row.importance : 3) as Interview["importance"],
    type: row.type as Interview["type"],
    status: row.status as Interview["status"],
    subCalendarId: row.subCalendarId ?? "",
    prep: {
      focusAreas: row.focusAreas ?? [],
      note: row.note ?? "",
      meetingUrl: row.meetingUrl ?? null,
      resumeUrl: row.resumeUrl ?? null,
      jdNotes: row.jdNotes ?? null,
    },
    reminders: row.reminderMinutes ?? [1440, 60],
    ...(row.externalEventId ? { externalEventId: row.externalEventId } : {}),
  };
}

export function rowToSubCalendar(row: SubCalendarRow): SubCalendar {
  return { id: row.id, name: row.name, color: row.color, description: "" };
}
