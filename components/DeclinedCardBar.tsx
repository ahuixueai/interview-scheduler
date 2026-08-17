"use client";

import { motion } from "framer-motion";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { Interview } from "@/types";
import { INTERVIEW_STATUS_LABELS } from "@/lib/labels";
import ScaleButton from "./ScaleButton";

interface DeclinedCardBarProps {
  interview: Interview;
  layoutTransition: { layout: { duration: number } } | { layout: { duration: number; ease: string } };
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}

/** 已挂/取消卡片的灰化折叠条（从 InterviewCard 拆出） */
export default function DeclinedCardBar({
  interview,
  layoutTransition,
  onEdit,
  onDelete,
  onRestore,
}: DeclinedCardBarProps) {
  return (
    <motion.div
      layout
      transition={layoutTransition}
      className="rounded-card bg-card px-5 py-4 shadow-card grayscale opacity-60"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-ink-secondary">
          <span className="font-semibold text-ink">{interview.company}</span>
          <span className="mx-1 text-ink-tertiary">·</span>
          {interview.position}
          <span className="mx-1 text-ink-tertiary">·</span>
          {INTERVIEW_STATUS_LABELS.declined}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <ScaleButton
            onClick={onEdit}
            ariaLabel={`编辑 ${interview.company} 面试`}
            className="bg-ink/5 p-2 text-ink-secondary hover:bg-ink/10"
          >
            <Pencil size={13} aria-hidden />
          </ScaleButton>
          <ScaleButton
            onClick={onDelete}
            ariaLabel={`删除 ${interview.company} 面试`}
            className="bg-ink/5 p-2 text-ink-secondary hover:bg-ink/10"
          >
            <Trash2 size={13} aria-hidden />
          </ScaleButton>
          <ScaleButton
            onClick={onRestore}
            ariaLabel={`恢复 ${interview.company} 的面试安排`}
            className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
          >
            <RotateCcw size={13} aria-hidden />
            撤销
          </ScaleButton>
        </div>
      </div>
    </motion.div>
  );
}
