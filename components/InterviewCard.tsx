"use client";

import { memo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { Interview, SubCalendar } from "@/types";
import { INTERVIEW_TYPE_ICONS, INTERVIEW_TYPE_LABELS } from "@/lib/labels";
import DualTimeZone from "./DualTimeZone";
import ScaleButton from "./ScaleButton";
import PrepCapsule from "./PrepCapsule";
import CardActions from "./CardActions";
import DeclinedCardBar from "./DeclinedCardBar";

/** 手动折叠后 5 分钟内不自动重新展开 */
const COLLAPSE_GRACE_MS = 5 * 60_000;

interface InterviewCardProps {
  interview: Interview;
  subCalendar: SubCalendar;
  score: number | null;
  isTopPriority: boolean;
  /** 是否处于「距开始 ≤60 分钟」窗口（由父级统一计算，避免每张卡持有时间源） */
  inPrepWindow: boolean;
  /** 备战胶囊是否允许自动展开（已过手动折叠的 5 分钟宽限） */
  capsuleAutoExpand: boolean;
  onCollapseCapsule: (untilMs: number) => void;
  onMarkOffer: () => void;
  onMarkDeclined: () => void;
  onRestore: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFocusMode: (trigger: HTMLElement) => void;
}

/** memo：60s 时钟 tick 只重渲染分数档位/备战窗口真正变化的卡片 */
const InterviewCard = memo(function InterviewCard({
  interview,
  subCalendar,
  score,
  isTopPriority,
  inPrepWindow,
  capsuleAutoExpand,
  onCollapseCapsule,
  onMarkOffer,
  onMarkDeclined,
  onRestore,
  onEdit,
  onDelete,
  onFocusMode,
}: InterviewCardProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [userExpanded, setUserExpanded] = useState(false);
  const TypeIcon = INTERVIEW_TYPE_ICONS[interview.type];
  const declined = interview.status === "declined";
  // 高度折叠/展开用短时缓动而非弹簧：连续打断的 layout 弹簧会让 framer 的投影（视觉位置与命中区域）错位，
  // 出现「绘制内容盖在邻居卡片上」的错位（e2e 几何探针实测复现）。滑动回弹/吸附仍是弹簧，不受影响。
  const layoutTransition = reducedMotion
    ? { layout: { duration: 0 } }
    : { layout: { duration: 0.22, ease: "easeOut" } };

  const capsuleOpen = userExpanded || capsuleAutoExpand;

  const toggleCapsule = () => {
    if (capsuleOpen) {
      setUserExpanded(false);
      onCollapseCapsule(Date.now() + COLLAPSE_GRACE_MS);
    } else {
      setUserExpanded(true);
      onCollapseCapsule(0);
    }
  };

  if (declined) {
    return (
      <DeclinedCardBar
        interview={interview}
        layoutTransition={layoutTransition}
        onEdit={onEdit}
        onDelete={onDelete}
        onRestore={onRestore}
      />
    );
  }

  return (
    <motion.div
      layout
      transition={layoutTransition}
      className={`rounded-card bg-card px-5 py-4 shadow-card transition-[filter] duration-300 ${
        interview.status === "offer" ? "ring-1 ring-accent/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: subCalendar.color }}
              aria-hidden
            />
            <span className="truncate text-xs text-ink-tertiary">{subCalendar.name}</span>
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-ink">
            {interview.company} · {interview.position}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-ink-secondary">
              <TypeIcon size={12} aria-hidden />
              {INTERVIEW_TYPE_LABELS[interview.type]}
            </span>
            <span
              role="img"
              aria-label={`重要度 ${interview.importance} / 5`}
              className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 w-1.5 rounded-full ${
                    n <= interview.importance ? "bg-primary-strong" : "bg-muted"
                  }`}
                />
              ))}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isTopPriority ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-on-accent">
              <Zap size={12} aria-hidden />
              最高优先级
            </span>
          ) : (
            <span className="text-xs tabular-nums text-ink-tertiary">
              {score === null ? "…" : `优先分 ${score}`}
            </span>
          )}
          {inPrepWindow || userExpanded ? (
            <ScaleButton
              onClick={toggleCapsule}
              ariaLabel={capsuleOpen ? "收起备战" : "展开备战"}
              className="bg-ink/5 px-2.5 py-1 text-ink-tertiary hover:bg-ink/10"
            >
              {capsuleOpen ? (
                <ChevronUp size={12} aria-hidden />
              ) : (
                <ChevronDown size={12} aria-hidden />
              )}
              {capsuleOpen ? "收起备战" : "展开备战"}
            </ScaleButton>
          ) : null}
        </div>
      </div>

      <DualTimeZone
        startUtc={interview.startUtc}
        endUtc={interview.endUtc}
        sourceTimeZone={interview.sourceTimeZone}
      />

      <AnimatePresence initial={false}>
        {capsuleOpen ? (
          <PrepCapsule key="prep-capsule" prep={interview.prep} company={interview.company} />
        ) : null}
      </AnimatePresence>

      <CardActions
        interview={interview}
        status={interview.status}
        isAssessment={interview.type === "assessment"}
        onMarkOffer={onMarkOffer}
        onMarkDeclined={onMarkDeclined}
        onRestore={onRestore}
        onEdit={onEdit}
        onDelete={onDelete}
        onFocusMode={onFocusMode}
      />
    </motion.div>
  );
});

export default InterviewCard;
