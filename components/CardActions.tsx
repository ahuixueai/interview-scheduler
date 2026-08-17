"use client";

import {
  Check,
  PartyPopper,
  Pencil,
  RotateCcw,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import type { Interview, InterviewStatus } from "@/types";
import { INTERVIEW_STATUS_LABELS } from "@/lib/labels";
import ScaleButton from "./ScaleButton";
import CalendarActions from "./CalendarActions";

interface CardActionsProps {
  interview: Interview;
  status: InterviewStatus;
  isAssessment: boolean;
  onMarkOffer: () => void;
  onMarkDeclined: () => void;
  onRestore: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** 进入专注模式；参数为触发按钮元素（退出时焦点归还给它） */
  onFocusMode: (trigger: HTMLElement) => void;
}

/** 卡片底部操作区：键盘可达的可见按钮（手势的替代路径）+ 日历导出/同步 + 编辑/删除 + 专注入口 */
export default function CardActions({
  interview,
  status,
  isAssessment,
  onMarkOffer,
  onMarkDeclined,
  onRestore,
  onEdit,
  onDelete,
  onFocusMode,
}: CardActionsProps) {
  const company = interview.company;

  if (status === "offer") {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
          <PartyPopper size={12} aria-hidden />
          {INTERVIEW_STATUS_LABELS.offer}
        </span>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <CalendarActions interview={interview} />
          <ScaleButton
            onClick={onEdit}
            ariaLabel={`编辑 ${company} 面试`}
            className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
          >
            <Pencil size={13} aria-hidden />
            编辑
          </ScaleButton>
          <ScaleButton
            onClick={onDelete}
            ariaLabel={`删除 ${company} 面试`}
            className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
          >
            <Trash2 size={13} aria-hidden />
            删除
          </ScaleButton>
          <ScaleButton
            onClick={onRestore}
            ariaLabel={`撤销 ${company} 的 Offer 标记`}
            className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
          >
            <RotateCcw size={13} aria-hidden />
            撤销
          </ScaleButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap justify-end gap-2">
        {isAssessment ? (
          <ScaleButton
            onClick={(event) => onFocusMode(event.currentTarget)}
            ariaLabel={`进入 ${company} 的专注模式`}
            className="bg-primary/15 text-ink-secondary hover:bg-primary/25"
          >
            <Timer size={13} aria-hidden />
            专注模式
          </ScaleButton>
        ) : null}
        <CalendarActions interview={interview} />
        <ScaleButton
          onClick={onEdit}
          ariaLabel={`编辑 ${company} 面试`}
          className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
        >
          <Pencil size={13} aria-hidden />
          编辑
        </ScaleButton>
        <ScaleButton
          onClick={onDelete}
          ariaLabel={`删除 ${company} 面试`}
          className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
        >
          <Trash2 size={13} aria-hidden />
          删除
        </ScaleButton>
        <ScaleButton
          onClick={onMarkOffer}
          ariaLabel={`将 ${company} 标记为拿到 Offer`}
          className="bg-accent text-on-accent shadow-sm hover:bg-accent/90"
        >
          <Check size={13} aria-hidden />
          拿到 Offer
        </ScaleButton>
        <ScaleButton
          onClick={onMarkDeclined}
          ariaLabel={`将 ${company} 标记为已挂或取消`}
          className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
        >
          <X size={13} aria-hidden />
          挂掉/取消
        </ScaleButton>
      </div>
      {/* 提示文案独占一行，按钮再多也不会把它挤成竖排 */}
      <p className="text-[11px] leading-4 text-ink-tertiary">
        左右滑动改状态 · 也可用键盘操作按钮
      </p>
    </div>
  );
}
