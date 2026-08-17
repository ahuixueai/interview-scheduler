"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { FileText, NotebookPen, Video } from "lucide-react";
import type { PrepInfo } from "@/types";
import { ACTION_CHIP_CLASS } from "@/lib/ui";

function DisabledAction({ label, reason }: { label: string; reason: string }) {
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled
        aria-label={`${label}（不可用）`}
        className={`${ACTION_CHIP_CLASS} cursor-not-allowed opacity-40`}
      >
        {label}
      </button>
      <span className="text-[10px] text-ink-tertiary">{reason}</span>
    </span>
  );
}

interface PrepCapsuleProps {
  prep: PrepInfo;
  company: string;
}

/** 一键备战胶囊：距开始 ≤60 分钟展开；三个行动点数据为 null 时置灰并说明原因 */
export default function PrepCapsule({ prep, company }: PrepCapsuleProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [showJd, setShowJd] = useState(false);
  const transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 300, damping: 30 };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
      className="overflow-hidden"
    >
      <div className="mt-4 rounded-xl bg-surface/80 p-3.5">
        <p className="text-xs font-semibold text-ink-secondary">备战清单 · 距开始不足 60 分钟</p>
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {prep.meetingUrl ? (
            <a
              href={prep.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`直达 ${company} 会议/测评链接`}
              className={ACTION_CHIP_CLASS}
            >
              <Video size={13} aria-hidden />
              进入会议
            </a>
          ) : (
            <DisabledAction label="进入会议" reason="未提供会议链接" />
          )}
          {prep.resumeUrl ? (
            <Link
              href={prep.resumeUrl}
              target="_blank"
              aria-label={`预览 ${company} 的简历 PDF`}
              className={ACTION_CHIP_CLASS}
            >
              <FileText size={13} aria-hidden />
              简历 PDF
            </Link>
          ) : (
            <DisabledAction label="简历 PDF" reason="未上传简历" />
          )}
          {prep.jdNotes ? (
            <button
              type="button"
              onClick={() => setShowJd((v) => !v)}
              aria-label={showJd ? "收起 JD 笔记" : "查看 JD 笔记"}
              className={ACTION_CHIP_CLASS}
            >
              <NotebookPen size={13} aria-hidden />
              JD 笔记
            </button>
          ) : (
            <DisabledAction label="JD 笔记" reason="暂无 JD 笔记" />
          )}
        </div>
        {showJd && prep.jdNotes ? (
          <p className="mt-3 rounded-lg bg-card/60 p-3 text-xs leading-5 text-ink-secondary">
            {prep.jdNotes}
          </p>
        ) : null}
        {prep.note ? (
          <p className="mt-3 text-[11px] leading-5 text-ink-tertiary">{prep.note}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
