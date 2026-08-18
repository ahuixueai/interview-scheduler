import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { createPuzzleChallenge, PUZZLE_TOLERANCE_PX, verifyPuzzle } from "../lib/puzzle";
import { getAuthSecret } from "../lib/secret";

function decodeX(token: string): number {
  const body = token.split(".")[0];
  const json = Buffer.from(body, "base64url").toString("utf8");
  return (JSON.parse(json) as { x: number }).x;
}

describe("拼图滑块签名与校验", () => {
  it("生成合法谜题：x 在合理区间、token 三段式", () => {
    const { token, imageUrl } = createPuzzleChallenge();
    const x = decodeX(token);
    expect(x).toBeGreaterThanOrEqual(80);
    expect(x).toBeLessThan(170);
    expect(token.split(".")).toHaveLength(2);
    expect(imageUrl).toMatch(/^\/puzzles\/puzzle-\d\.jpg$/);
  });

  it("拖动位置准确（误差在容忍内）通过", () => {
    const { token } = createPuzzleChallenge();
    const x = decodeX(token);
    expect(verifyPuzzle(token, x).ok).toBe(true);
    expect(verifyPuzzle(token, x + PUZZLE_TOLERANCE_PX).ok).toBe(true);
    expect(verifyPuzzle(token, x - PUZZLE_TOLERANCE_PX).ok).toBe(true);
  });

  it("误差超过容忍值被拒绝", () => {
    const { token } = createPuzzleChallenge();
    const x = decodeX(token);
    const result = verifyPuzzle(token, x + PUZZLE_TOLERANCE_PX + 1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("拼图位置不对，请重试");
  });

  it("篡改负载或签名被拒绝", () => {
    const { token } = createPuzzleChallenge();
    const [body, sig] = token.split(".");
    const tamperedBody = (body[0] === "A" ? "B" : "A") + body.slice(1);
    expect(verifyPuzzle(tamperedBody + "." + sig, 100).ok).toBe(false);
    expect(verifyPuzzle(body + "." + sig.slice(0, -2) + "zz", 100).ok).toBe(false);
  });

  it("过期谜题被拒绝", () => {
    const payload = { x: 100, exp: Date.now() - 1000, img: "puzzle-1.jpg" };
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const sig = createHmac("sha256", getAuthSecret()).update(body).digest("base64url");
    const result = verifyPuzzle(body + "." + sig, 100);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("验证已过期，请重试");
  });

  it("畸形 token 被拒绝", () => {
    expect(verifyPuzzle("", 100).ok).toBe(false);
    expect(verifyPuzzle("abc", 100).ok).toBe(false);
    expect(verifyPuzzle("abc.", 100).ok).toBe(false);
    expect(verifyPuzzle("!!!.sig", 100).ok).toBe(false);
  });
});
