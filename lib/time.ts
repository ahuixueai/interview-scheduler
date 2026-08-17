"use client";

/** 展示层时间转换统一走 Intl.DateTimeFormat 的 timeZone 选项，由它自动处理夏令时，不做手工偏移量加减。
 *  格式化器按 (locale, timeZone, options) 缓存复用：Intl.DateTimeFormat 构造是毫秒级开销，
 *  此前每次渲染重复构造（基线实测单页加载 93 次），缓存后只构造一次。 */

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  weekday: "short",
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getCachedFormatter(
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const parts: string[] = [locale, timeZone];
  for (const key of Object.keys(options).sort() as (keyof Intl.DateTimeFormatOptions)[]) {
    parts.push(key + ":" + String(options[key]));
  }
  const cacheKey = parts.join("|");
  const cached = formatterCache.get(cacheKey);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(locale, { timeZone, ...options });
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

/** 检测用户本机时区（IANA 名），不硬编码任何时区 */
export function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatInTimeZone(
  isoUtc: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return getCachedFormatter("zh-CN", timeZone, options).format(new Date(isoUtc));
}

export function formatDateInTimeZone(isoUtc: string, timeZone: string): string {
  return formatInTimeZone(isoUtc, timeZone, DATE_OPTIONS);
}

export function formatTimeInTimeZone(isoUtc: string, timeZone: string): string {
  return formatInTimeZone(isoUtc, timeZone, TIME_OPTIONS);
}

/** 该时刻在指定时区下的缩写（如 EST / PST / GMT），由运行时自动推导，无需手写映射。
 *  注意：zh-CN 下 short timeZoneName 会输出 "GMT-4" 这类偏移格式，故缩写统一用 en-US（缩写本就是英文惯例）。 */
export function getTimeZoneAbbr(isoUtc: string, timeZone: string): string {
  const parts = getCachedFormatter("en-US", timeZone, {
    hour: "2-digit",
    timeZoneName: "short",
  }).formatToParts(new Date(isoUtc));
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

/** 两个时区在指定时刻渲染出的「日期+时间」是否一致（同一刻钟表时间） */
export function rendersSameWallTime(isoUtc: string, zoneA: string, zoneB: string): boolean {
  const options: Intl.DateTimeFormatOptions = { ...DATE_OPTIONS, ...TIME_OPTIONS };
  return formatInTimeZone(isoUtc, zoneA, options) === formatInTimeZone(isoUtc, zoneB, options);
}

/** 读取某 UTC 时刻在指定时区下的墙上时钟，反推该时区的偏移量（夏令时由 Intl 自动处理） */
export function getZoneOffsetMs(atUtcMs: number, timeZone: string): number {
  const parts = getCachedFormatter("en-GB", timeZone, {
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
 * 偏移量迭代两次收敛，覆盖夏令时边界；格式非法时返回 null。
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

/** 编辑回填：该 UTC 时刻在指定时区下的墙上日期（yyyy-mm-dd） */
export function wallDateInZone(isoUtc: string, timeZone: string): string {
  return getCachedFormatter("en-CA", timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtc));
}

/** 编辑回填：该 UTC 时刻在指定时区下的墙上时间（HH:mm） */
export function wallTimeInZone(isoUtc: string, timeZone: string): string {
  const parts = getCachedFormatter("en-GB", timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoUtc));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${String(hour).padStart(2, "0")}:${minute}`;
}
