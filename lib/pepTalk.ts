import type { Interview } from "@/types";
import { calcPriority } from "@/lib/priority";

const HOUR_MS = 3_600_000;
/** 高优先级分数线：importance×10 + urgency×15 ≥ 100 */
const HIGH_PRIORITY_SCORE = 100;
/** 「未来 3 天」窗口 */
const DENSE_WINDOW_MS = 72 * HOUR_MS;

/** 密集档（未来 3 天 ≥2 场高优先级面试）。基调：把注意力收回到眼前这一件事，克制、平实。 */
export const INTENSE_LINES: readonly string[] = [
  "这三天排得密，但每一场都只占用你一个具体的小时。",
  "排得满不等于要绷得紧。把今天的这一场讲清楚就够了。",
  "几场面试不是一座山，是几个排着队的房间，一个一个进。",
  "不用预演三天，只预演明天上午那场的前十五分钟。",
  "日程表看着热闹，身体只需要坐在下一场的位置上。",
  "紧张的反面不是放松，是具体。把下一件事具体到几点、哪个链接、第一句说什么。",
];

/** 日常档。 */
export const DAILY_LINES: readonly string[] = [
  "明天上午一场。今天不用想后面那几场。",
  "简历已经替你说过一遍了，剩下的只是聊聊。",
  "准备到八成就够了，剩下的两成交给现场。",
  "今天最值得做的事：把自我介绍练得能随口说出来。",
  "面试官想招的，是一个能正常聊天的同事。",
  "不用变成另一个人，把你做过的事讲清楚就行。",
];

function hashString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * 规则触发：未来 3 天内有 ≥2 场高优先级面试 → 密集档；否则日常档。
 * 同一天内保持稳定：以当天日期字符串为种子选条，不随渲染次数变化。
 * 纯函数（nowMs 由调用方传入）。
 */
export function pickPepTalk(nowMs: number, interviews: Interview[]): string {
  const highCount = interviews.filter((iv) => {
    if (iv.status !== "upcoming") return false;
    const untilMs = Date.parse(iv.startUtc) - nowMs;
    return untilMs > 0 && untilMs <= DENSE_WINDOW_MS && calcPriority(iv, nowMs) >= HIGH_PRIORITY_SCORE;
  }).length;

  const bucket = highCount >= 2 ? INTENSE_LINES : DAILY_LINES;
  const dayKey = new Date(nowMs).toDateString();
  return bucket[hashString(dayKey) % bucket.length];
}
