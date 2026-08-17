"use client";

import type { Interview } from "@/types";
import { buildIcsEvent } from "./ics-core";

export { buildGoogleCalendarUrl, buildIcsEvent, escapeIcs, toIcsUtc } from "./ics-core";

/** 触发 .ics 文件下载（纯前端 Blob，不依赖后端） */
export function downloadIcsFile(interview: Interview): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([buildIcsEvent(interview)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${interview.company}-${interview.id}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // 延迟释放：立即 revoke 在部分浏览器会取消尚未开始的下载
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
