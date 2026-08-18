"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import ScaleButton from "./ScaleButton";

const DISMISS_KEY = "demo-banner-dismissed";

/** 新用户演示数据说明条：一次性展示，关闭后不再出现（localStorage） */
export default function DemoBanner({ visible }: { visible: boolean }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!visible || dismissed !== false) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* 私密模式降级 */
    }
  };

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-card bg-card px-4 py-3 shadow-card">
      <Info size={15} className="mt-0.5 shrink-0 text-primary-strong" aria-hidden />
      <p className="min-w-0 flex-1 text-xs leading-5 text-ink-secondary">
        这些是演示数据：4 场示例面试。点卡片上的「删除」清掉它们，或点右上角「新建面试」添加你自己的日程。
      </p>
      <ScaleButton
        onClick={dismiss}
        ariaLabel="关闭演示数据说明"
        className="shrink-0 bg-transparent p-1 text-ink-tertiary hover:bg-ink/5"
      >
        <X size={14} aria-hidden />
      </ScaleButton>
    </div>
  );
}
