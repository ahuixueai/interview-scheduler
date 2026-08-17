import type { Interview } from "@/types";

const HOUR_MS = 3_600_000;

/**
 * 纯函数：计算面试优先级分数（无副作用，now 由参数传入，便于测试）。
 * urgencyScore（距开始小时数）：<24h → 5；24~72h → 4；3~7d → 3；7~14d → 2；>14d → 1
 * score = importance × 10 + urgencyScore × 15（紧急度权重高于重要度）
 */
export function calcPriority(interview: Interview, now: Date | number): number {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const hoursUntil = (Date.parse(interview.startUtc) - nowMs) / HOUR_MS;

  let urgencyScore = 1;
  if (hoursUntil < 24) urgencyScore = 5;
  else if (hoursUntil < 72) urgencyScore = 4;
  else if (hoursUntil < 168) urgencyScore = 3;
  else if (hoursUntil < 336) urgencyScore = 2;

  return interview.importance * 10 + urgencyScore * 15;
}
