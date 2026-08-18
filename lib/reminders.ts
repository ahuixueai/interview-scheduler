/** 提醒时间预设与格式化 */

/** 默认：提前 1 天 + 1 小时 */
export const DEFAULT_REMINDERS: number[] = [1440, 60];

/** 可选预设（分钟） */
export const REMINDER_PRESETS: readonly number[] = [2880, 1440, 120, 60, 30];

export function formatReminderLabel(minutes: number): string {
  if (minutes % 1440 === 0) return `提前 ${minutes / 1440} 天`;
  if (minutes % 60 === 0) return `提前 ${minutes / 60} 小时`;
  return `提前 ${minutes} 分钟`;
}

/** 一组提醒的展示文案；空数组 = 不提醒 */
export function formatReminders(reminders: number[] | undefined): string {
  const list = reminders ?? DEFAULT_REMINDERS;
  if (list.length === 0) return "不提醒";
  return [...list].sort((a, b) => b - a).map(formatReminderLabel).join("、");
}
