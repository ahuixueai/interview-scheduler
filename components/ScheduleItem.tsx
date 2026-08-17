"use client";

import { useCallback } from "react";
import type { Interview, SubCalendar } from "@/types";
import InterviewCard from "./InterviewCard";
import SwipeableReorderItem from "./SwipeableReorderItem";

interface ScheduleItemProps {
  interview: Interview;
  subCalendar: SubCalendar;
  score: number | null;
  isTopPriority: boolean;
  inPrepWindow: boolean;
  capsuleAutoExpand: boolean;
  reducedMotion: boolean;
  /** 以下回调均为父级 useCallback 固化的稳定引用（带 id/对象参数），保证 InterviewCard 的 memo 生效 */
  onOffer: (id: string) => void;
  onDeclined: (id: string) => void;
  onRestore: (id: string) => void;
  onEdit: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
  onCollapseCapsule: (id: string, untilMs: number) => void;
  onFocusMode: (interview: Interview, trigger: HTMLElement) => void;
}

/** 列表项：手势仲裁层 + 卡片内容（从 InterviewList 拆出，控制文件行数） */
export default function ScheduleItem({
  interview,
  subCalendar,
  score,
  isTopPriority,
  inPrepWindow,
  capsuleAutoExpand,
  reducedMotion,
  onOffer,
  onDeclined,
  onRestore,
  onEdit,
  onDelete,
  onCollapseCapsule,
  onFocusMode,
}: ScheduleItemProps) {
  const offer = useCallback(() => onOffer(interview.id), [onOffer, interview.id]);
  const declined = useCallback(() => onDeclined(interview.id), [onDeclined, interview.id]);
  const restore = useCallback(() => onRestore(interview.id), [onRestore, interview.id]);
  const edit = useCallback(() => onEdit(interview), [onEdit, interview]);
  const remove = useCallback(() => onDelete(interview), [onDelete, interview]);
  const collapse = useCallback(
    (untilMs: number) => onCollapseCapsule(interview.id, untilMs),
    [onCollapseCapsule, interview.id],
  );
  const focus = useCallback(
    (trigger: HTMLElement) => onFocusMode(interview, trigger),
    [onFocusMode, interview],
  );

  return (
    <SwipeableReorderItem
      value={interview.id}
      reducedMotion={reducedMotion}
      gesturesDisabled={interview.status !== "upcoming"}
      onSwipeLeft={offer}
      onSwipeRight={declined}
    >
      <InterviewCard
        interview={interview}
        subCalendar={subCalendar}
        score={score}
        isTopPriority={isTopPriority}
        inPrepWindow={inPrepWindow}
        capsuleAutoExpand={capsuleAutoExpand}
        onCollapseCapsule={collapse}
        onMarkOffer={offer}
        onMarkDeclined={declined}
        onRestore={restore}
        onEdit={edit}
        onDelete={remove}
        onFocusMode={focus}
      />
    </SwipeableReorderItem>
  );
}
