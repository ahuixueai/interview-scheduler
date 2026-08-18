import { z } from "zod";

export const credentialsSchema = z.object({
  email: z
    .string()
    .min(1, "邮箱不能为空")
    .max(254, "邮箱过长")
    .email("邮箱格式不正确"),
  password: z
    .string()
    .min(8, "密码至少 8 位")
    .max(72, "密码过长"),
});

export const registerSchema = credentialsSchema.extend({
  name: z.string().max(60).optional(),
  code: z
    .string({ required_error: "请输入 6 位验证码" })
    .regex(/^\d{6}$/, "请输入 6 位验证码"),
});

/** 发送验证码：邮箱 + 拼图 token + 拖动距离 */
export const verificationSendSchema = z.object({
  email: credentialsSchema.shape.email,
  puzzleToken: z.string().min(20, "验证已失效，请重试"),
  puzzleOffset: z.number().finite("拖动位置不合法"),
});
