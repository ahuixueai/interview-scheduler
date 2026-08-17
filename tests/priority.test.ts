import { describe, expect, it } from "vitest";
import { calcPriority } from "../lib/priority";
import type { ImportanceLevel, Interview } from "../types";

const HOUR_MS = 3_600_000;
/** 固定基准时刻，保证测试与真实时钟无关 */
const NOW = Date.parse("2025-06-01T00:00:00Z");

function makeInterview(hoursUntil: number, importance: ImportanceLevel = 3): Interview {
  return {
    id: `iv-${hoursUntil}-${importance}`,
    company: "测试公司",
    position: "测试岗位",
    startUtc: new Date(NOW + hoursUntil * HOUR_MS).toISOString(),
    endUtc: new Date(NOW + (hoursUntil + 1) * HOUR_MS).toISOString(),
    sourceTimeZone: "America/New_York",
    importance,
    type: "video",
    status: "upcoming",
    subCalendarId: "sub-test",
    prep: { focusAreas: [], note: "", meetingUrl: null, resumeUrl: null, jdNotes: null },
  };
}

describe("calcPriority", () => {
  it("紧迫度档位：<24h → 5", () => {
    expect(calcPriority(makeInterview(23), NOW)).toBe(3 * 10 + 5 * 15);
  });

  it("紧迫度档位：24h 边界 → 4", () => {
    expect(calcPriority(makeInterview(24), NOW)).toBe(3 * 10 + 4 * 15);
  });

  it("紧迫度档位：24~72h → 4", () => {
    expect(calcPriority(makeInterview(71.9), NOW)).toBe(3 * 10 + 4 * 15);
  });

  it("紧迫度档位：72h 边界 → 3", () => {
    expect(calcPriority(makeInterview(72), NOW)).toBe(3 * 10 + 3 * 15);
  });

  it("紧迫度档位：3~7d → 3", () => {
    expect(calcPriority(makeInterview(96), NOW)).toBe(3 * 10 + 3 * 15);
  });

  it("紧迫度档位：168h 边界 → 2", () => {
    expect(calcPriority(makeInterview(168), NOW)).toBe(3 * 10 + 2 * 15);
  });

  it("紧迫度档位：7~14d → 2", () => {
    expect(calcPriority(makeInterview(200), NOW)).toBe(3 * 10 + 2 * 15);
  });

  it("紧迫度档位：336h 边界 → 1", () => {
    expect(calcPriority(makeInterview(336), NOW)).toBe(3 * 10 + 1 * 15);
  });

  it("紧迫度档位：>14d → 1", () => {
    expect(calcPriority(makeInterview(500), NOW)).toBe(3 * 10 + 1 * 15);
  });

  it("已过期（过去时间）视为最紧急", () => {
    expect(calcPriority(makeInterview(-5), NOW)).toBe(3 * 10 + 5 * 15);
  });

  it("紧急度权重高于重要度：重要度 5 但两周后 < 重要度 1 但 24h 内", () => {
    const highImportanceFarAway = calcPriority(makeInterview(500, 5), NOW);
    const lowImportanceUrgent = calcPriority(makeInterview(23, 1), NOW);
    expect(highImportanceFarAway).toBe(5 * 10 + 1 * 15);
    expect(lowImportanceUrgent).toBe(1 * 10 + 5 * 15);
    expect(lowImportanceUrgent).toBeGreaterThan(highImportanceFarAway);
  });

  it("纯函数：同输入同输出，且不修改入参", () => {
    const interview = makeInterview(30);
    const snapshot = JSON.stringify(interview);
    expect(calcPriority(interview, NOW)).toBe(calcPriority(interview, NOW));
    expect(JSON.stringify(interview)).toBe(snapshot);
  });

  it("now 参数同时支持 Date 与 number", () => {
    expect(calcPriority(makeInterview(30), new Date(NOW))).toBe(
      calcPriority(makeInterview(30), NOW),
    );
  });
});
