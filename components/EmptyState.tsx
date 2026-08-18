"use client";

import { CalendarPlus } from "lucide-react";
import { useUiStore } from "@/store/useUiStore";
import ScaleButton from "./ScaleButton";

/** 空状态：没有任何面试时给出引导与创建入口 */
export default function EmptyState() {
  const openCreateDialog = useUiStore((s) => s.openCreateDialog);

  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-card px-6 py-14 text-center shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
        <CalendarPlus size={22} className="text-primary-strong" aria-hidden />
      </span>
      <h2 className="text-base font-semibold text-ink">还没有任何面试安排</h2>
      <p className="max-w-xs text-sm leading-6 text-ink-secondary">
        添加第一场面试：填好公司、岗位和时间，之后可以订阅到手机日历、自动提醒。
      </p>
      <ScaleButton
        onClick={openCreateDialog}
        ariaLabel="新建第一场面试"
        className="mt-2 bg-accent text-on-accent shadow-sm"
      >
        <CalendarPlus size={14} aria-hidden />
        新建第一场面试
      </ScaleButton>
    </div>
  );
}
