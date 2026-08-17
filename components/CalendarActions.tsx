"use client";

import { useState } from "react";
import { CalendarPlus, Check, Cloud, Download, RefreshCw } from "lucide-react";
import type { Interview } from "@/types";
import { buildGoogleCalendarUrl, downloadIcsFile } from "@/lib/ics";
import { getConfiguredClientId } from "@/lib/integrations/google-auth";
import { pushInterviewToGoogleCalendar } from "@/lib/integrations/google-calendar";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useUiStore } from "@/store/useUiStore";
import ScaleButton from "./ScaleButton";

type SyncState = "idle" | "busy" | "done" | "error";

function SyncButton({ interview }: { interview: Interview }) {
  const updateInterview = useScheduleStore((s) => s.updateInterview);
  const openSyncDialog = useUiStore((s) => s.openSyncDialog);
  const [state, setState] = useState<SyncState>("idle");

  const handleSync = async () => {
    if (!getConfiguredClientId()) {
      openSyncDialog();
      return;
    }
    setState("busy");
    try {
      const eventId = await pushInterviewToGoogleCalendar(interview);
      updateInterview(interview.id, { externalEventId: eventId });
      setState("done");
      window.setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 3500);
    }
  };

  const labels: Record<SyncState, string> = {
    idle: `同步 ${interview.company} 到 Google 日历`,
    busy: "正在同步…",
    done: "已同步到 Google 日历",
    error: "同步失败，请检查连接（点击重试）",
  };

  return (
    <ScaleButton
      onClick={handleSync}
      ariaLabel={labels[state]}
      title={labels[state]}
      disabled={state === "busy"}
      className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
    >
      {state === "done" ? (
        <Check size={13} aria-hidden />
      ) : state === "busy" ? (
        <RefreshCw size={13} aria-hidden />
      ) : (
        <Cloud size={13} aria-hidden />
      )}
    </ScaleButton>
  );
}

/** 卡片上的日历三件套：免登录模板链接、.ics 下载、OAuth 推送 */
export default function CalendarActions({ interview }: { interview: Interview }) {
  return (
    <>
      <a
        href={buildGoogleCalendarUrl(interview)}
        suppressHydrationWarning
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`在 Google 日历中打开 ${interview.company}`}
        title="在 Google 日历中打开（免登录预填）"
        className="inline-flex select-none items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <CalendarPlus size={13} aria-hidden />
      </a>
      <ScaleButton
        onClick={() => downloadIcsFile(interview)}
        ariaLabel={`下载 ${interview.company} 的 .ics 日历文件`}
        className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
      >
        <Download size={13} aria-hidden />
      </ScaleButton>
      <SyncButton interview={interview} />
    </>
  );
}
