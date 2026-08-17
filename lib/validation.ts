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
});
