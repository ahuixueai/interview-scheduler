import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../lib/password";
import { credentialsSchema } from "../lib/validation";

describe("密码哈希（bcrypt）", () => {
  it("哈希后可正确校验，且不保存明文", async () => {
    const hash = await hashPassword("my-secret-123");
    expect(hash).not.toContain("my-secret-123");
    expect(await verifyPassword("my-secret-123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("同一密码两次哈希结果不同（加盐）", async () => {
    const a = await hashPassword("same-pass-123");
    const b = await hashPassword("same-pass-123");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-pass-123", a)).toBe(true);
    expect(await verifyPassword("same-pass-123", b)).toBe(true);
  });
});

describe("登录/注册参数校验", () => {
  it("拒绝非法邮箱与过短密码", () => {
    expect(credentialsSchema.safeParse({ email: "not-an-email", password: "12345678" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
  });

  it("接受合法邮箱（任意域名，含国内邮箱）", () => {
    for (const email of ["a@qq.com", "b@163.com", "c@outlook.com", "d@gmail.com"]) {
      expect(credentialsSchema.safeParse({ email, password: "pass-123456" }).success).toBe(true);
    }
  });
});
