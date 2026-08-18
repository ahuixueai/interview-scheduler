import { describe, expect, it } from "vitest";
import { formatRelativeStart } from "../lib/relative";

const NOW = Date.parse("2026-08-17T12:00:00Z");

function at(minutesFromNow: number): string {
  return new Date(NOW + minutesFromNow * 60_000).toISOString();
}

describe("相对时间标签", () => {
  it("各档位", () => {
    expect(formatRelativeStart(at(-10), NOW)).toBe("已开始");
    expect(formatRelativeStart(at(30), NOW)).toBe("不到 1 小时");
    expect(formatRelativeStart(at(90), NOW)).toBe("2 小时后");
    expect(formatRelativeStart(at(36 * 60), NOW)).toBe("明天");
    expect(formatRelativeStart(at(3 * 24 * 60 + 30), NOW)).toBe("4 天后");
    expect(formatRelativeStart(at(14 * 24 * 60), NOW)).toBe("2 周后");
  });
});
