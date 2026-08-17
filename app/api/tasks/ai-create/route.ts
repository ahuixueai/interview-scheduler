import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/tasks/ai-create
 *
 * 「AI 打气筒」任务创建接口占位（下一轮接入真实 AI）。
 * 预期入参 schema（JSON body）：
 * {
 *   taskTitle:     string  必填，1~120 字符，任务标题
 *   dueUtc:        string  必填，UTC ISO 8601（以 Z 结尾），如 "2025-08-18T14:00:00.000Z"
 *   importance:    number  必填，1~5 整数
 *   subCalendarId: string  可选，归属子日历 id
 * }
 *
 * 成功：201 + { ok: true, task: {...} }
 * 失败：400 + { ok: false, errors: { 字段: 错误信息 } }
 */

const createTaskSchema = z.object({
  taskTitle: z
    .string({ required_error: "taskTitle 必填", invalid_type_error: "taskTitle 必须是字符串" })
    .min(1, "taskTitle 不能为空")
    .max(120, "taskTitle 不能超过 120 字符"),
  dueUtc: z
    .string({ required_error: "dueUtc 必填", invalid_type_error: "dueUtc 必须是字符串" })
    .refine(
      (value) => value.endsWith("Z") && !Number.isNaN(Date.parse(value)),
      "dueUtc 必须是 UTC ISO 8601 字符串（以 Z 结尾）",
    ),
  importance: z
    .number({ required_error: "importance 必填", invalid_type_error: "importance 必须是数字" })
    .int("importance 必须是整数")
    .min(1, "importance 不能小于 1")
    .max(5, "importance 不能大于 5"),
  subCalendarId: z.string().min(1).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, errors: { body: "请求体必须是合法 JSON" } },
      { status: 400 },
    );
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.length > 0 ? issue.path.join(".") : "body";
      if (!(field in errors)) errors[field] = issue.message;
    }
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const { taskTitle, dueUtc, importance, subCalendarId } = parsed.data;
  // Mock 响应：不调用任何真实 AI API
  return NextResponse.json(
    {
      ok: true,
      task: {
        id: `mock-ai-task-${Date.now()}`,
        taskTitle,
        dueUtc,
        importance,
        subCalendarId: subCalendarId ?? null,
        createdAtUtc: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}
