import { describe, expect, it } from "vitest";
import { generateCode, hashCode, hashIp, hashesEqual } from "../lib/verification";

describe("验证码生成与哈希", () => {
  it("生成 6 位数字验证码", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it("验证码足够随机（50 个样本不重复）", () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateCode()));
    expect(seen.size).toBe(50);
  });

  it("codeHash 稳定且不同输入不同输出", () => {
    expect(hashCode("123456")).toBe(hashCode("123456"));
    expect(hashCode("123456")).not.toBe(hashCode("654321"));
    expect(hashCode("123456")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("IP 哈希为 64 位十六进制且不泄露明文", () => {
    const h = hashIp("203.0.113.7");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("203.0.113.7");
    expect(h).toBe(hashIp("203.0.113.7"));
  });

  it("hashesEqual 恒定时间比较", () => {
    expect(hashesEqual(hashCode("123456"), hashCode("123456"))).toBe(true);
    expect(hashesEqual(hashCode("123456"), hashCode("000000"))).toBe(false);
    expect(hashesEqual("ab", "cd")).toBe(false);
  });
});
