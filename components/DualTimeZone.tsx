"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  getLocalTimeZone,
  getTimeZoneAbbr,
  rendersSameWallTime,
} from "@/lib/time";

interface DualTimeZoneProps {
  startUtc: string;
  endUtc: string;
  sourceTimeZone: string;
}

function zoneLabel(timeZone: string): string {
  const last = timeZone.split("/").pop();
  return last ? last.replace(/_/g, " ") : timeZone;
}

/** 双时区并排展示：左为面试所在地时区，右为用户本机时区（挂载后由 resolvedOptions().timeZone 检测） */
export default function DualTimeZone({ startUtc, endUtc, sourceTimeZone }: DualTimeZoneProps) {
  const [localTz, setLocalTz] = useState<string | null>(null);

  useEffect(() => {
    setLocalTz(getLocalTimeZone());
  }, []);

  const durationMinutes = Math.round((Date.parse(endUtc) - Date.parse(startUtc)) / 60_000);
  const sameAsLocal = localTz !== null && rendersSameWallTime(startUtc, sourceTimeZone, localTz);

  return (
    // suppressHydrationWarning：动态 mock（25 分钟后）在 SSR 与客户端可能跨越分钟边界，
    // 挂载后 useNow 驱动的重渲染会以客户端时钟为准修正显示。
    <div suppressHydrationWarning className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface/80 px-3.5 py-3">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-ink-tertiary">
          面试所在地 · {zoneLabel(sourceTimeZone)}
        </p>
        <p suppressHydrationWarning className="mt-1 text-base font-semibold tabular-nums text-ink">
          {formatTimeInTimeZone(startUtc, sourceTimeZone)}
        </p>
        <p suppressHydrationWarning className="mt-0.5 truncate text-xs tabular-nums text-ink-secondary">
          {formatDateInTimeZone(startUtc, sourceTimeZone)} · {getTimeZoneAbbr(startUtc, sourceTimeZone)}
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-tertiary">
          <Clock size={11} aria-hidden />
          时长 {durationMinutes} 分钟
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-ink-tertiary">你的本地时间</p>
        {localTz === null ? (
          <p className="mt-1 text-base font-semibold text-ink-tertiary">…</p>
        ) : sameAsLocal ? (
          <p className="mt-1 text-sm font-medium leading-6 text-ink-secondary">与你所在时区相同</p>
        ) : (
          <>
            <p suppressHydrationWarning className="mt-1 text-base font-semibold tabular-nums text-ink">
              {formatTimeInTimeZone(startUtc, localTz)}
            </p>
            <p suppressHydrationWarning className="mt-0.5 truncate text-xs tabular-nums text-ink-secondary">
              {formatDateInTimeZone(startUtc, localTz)} · {getTimeZoneAbbr(startUtc, localTz)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
