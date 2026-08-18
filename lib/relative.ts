/** 距离开始时间的可读标签（供卡片展示，替代难以理解的「优先分」数字） */

export function formatRelativeStart(startUtc: string, nowMs: number): string {
  const diffMin = (Date.parse(startUtc) - nowMs) / 60_000;
  if (diffMin < 0) return "已开始";
  if (diffMin < 60) return "不到 1 小时";
  if (diffMin < 24 * 60) return Math.ceil(diffMin / 60) + " 小时后";
  if (diffMin < 48 * 60) return "明天";
  if (diffMin < 7 * 24 * 60) return Math.ceil(diffMin / (24 * 60)) + " 天后";
  return Math.ceil(diffMin / (7 * 24 * 60)) + " 周后";
}
