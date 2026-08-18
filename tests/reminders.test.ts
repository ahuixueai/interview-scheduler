import { describe, expect, it } from "vitest";
import { formatReminderLabel, formatReminders } from "../lib/reminders";

describe("提醒时间格式化", () => {
  it("各档位标签正确", () => {
    expect(formatReminderLabel(2880)).toBe("提前 2 天");
    expect(formatReminderLabel(1440)).toBe("提前 1 天");
    expect(formatReminderLabel(120)).toBe("提前 2 小时");
    expect(formatReminderLabel(60)).toBe("提前 1 小时");
    expect(formatReminderLabel(30)).toBe("提前 30 分钟");
  });

  it("组合按时间降序展示", () => {
    expect(formatReminders([60, 1440])).toBe("提前 1 天、提前 1 小时");
  });

  it("空数组显示不提醒；缺失用默认", () => {
    expect(formatReminders([])).toBe("不提醒");
    expect(formatReminders(undefined)).toBe("提前 1 天、提前 1 小时");
  });
});
