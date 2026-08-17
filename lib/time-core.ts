/** 时区核心函数（无 "use client"，服务端/客户端共用）：墙上时间 ↔ UTC 转换 */

/** 检测本机时区（IANA 名），不硬编码任何时区 */
export function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** 读取某 UTC 时刻在指定时区下的墙上时钟，反推该时区的偏移量（夏令时由 Intl 自动处理） */
export function getZoneOffsetMs(atUtcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(atUtcMs));
  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const wallAsUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );
  return wallAsUtc - Math.floor(atUtcMs / 1000) * 1000;
}

/**
 * 指定时区的墙上时间（表单输入）→ UTC ISO 8601。
 * 偏移量迭代两次收敛，覆盖夏令时边界；格式/日历日期非法时返回 null。
 */
export function zonedWallToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  // 回环校验真实日历日期：2026-02-30 这类输入 Date.UTC 会静默滚动到 3 月，必须拒绝
  const probe = new Date(wallAsUtc);
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  let utcMs = wallAsUtc - getZoneOffsetMs(Date.now(), timeZone);
  utcMs = wallAsUtc - getZoneOffsetMs(utcMs, timeZone);
  utcMs = wallAsUtc - getZoneOffsetMs(utcMs, timeZone);
  return new Date(utcMs).toISOString();
}

/** 该 UTC 时刻在指定时区下的墙上日期（yyyy-mm-dd） */
export function wallDateInZone(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtc));
}

/** 该 UTC 时刻在指定时区下的墙上时间（HH:mm） */
export function wallTimeInZone(isoUtc: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoUtc));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${String(hour).padStart(2, "0")}:${minute}`;
}
