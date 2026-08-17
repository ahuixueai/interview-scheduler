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

export { getLocalTimeZone } from "./time-core";

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

// 墙上时间 ↔ UTC 转换与回填：统一从 time-core（服务端/客户端共用）再导出
export {
  getZoneOffsetMs,
  wallDateInZone,
  wallTimeInZone,
  zonedWallToUtc,
} from "./time-core";
