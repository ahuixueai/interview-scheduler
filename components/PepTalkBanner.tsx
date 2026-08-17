"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Quote } from "lucide-react";
import { useNow } from "@/lib/useNow";
import { pickPepTalk } from "@/lib/pepTalk";
import { readStorage, writeStorage } from "@/lib/storage";
import { useScheduleStore } from "@/store/useScheduleStore";
import ScaleButton from "./ScaleButton";

const PEP_TALK_KEY = "peptalk-enabled";

/** 动态文案模块：规则触发 + 当天稳定；默认开启，关闭状态持久化 */
export default function PepTalkBanner() {
  const now = useNow(60_000);
  const interviews = useScheduleStore((s) => s.interviews);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = readStorage(PEP_TALK_KEY);
    setEnabled(stored === null ? true : stored === "1");
  }, []);

  const toggle = () => {
    setEnabled((prev) => {
      const next = prev === null ? false : !prev;
      writeStorage(PEP_TALK_KEY, next ? "1" : "0");
      return next;
    });
  };

  const line = now !== null && enabled !== false ? pickPepTalk(now, interviews) : null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-card bg-card px-4 py-3.5 shadow-card">
      <Quote size={16} aria-hidden className="mt-0.5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm leading-6 text-ink-secondary">
        {enabled === false
          ? "文案模块已关闭，点击右侧开关重新开启。"
          : enabled === null || line === null
            ? "…"
            : line}
      </p>
      <ScaleButton
        onClick={toggle}
        ariaLabel={enabled === false ? "开启文案模块" : "关闭文案模块"}
        className="shrink-0 bg-ink/5 text-ink-tertiary"
      >
        {enabled === false ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
      </ScaleButton>
    </div>
  );
}
