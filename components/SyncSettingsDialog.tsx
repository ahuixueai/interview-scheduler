"use client";

import { useEffect, useMemo } from "react";
import { RefreshCw, X } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { useUiStore } from "@/store/useUiStore";
import { INPUT_CLASS } from "@/lib/ui";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useGoogleSync } from "@/lib/useGoogleSync";
import type { RemoteCalendarEvent } from "@/lib/integrations/google-calendar";
import ScaleButton from "./ScaleButton";
import RemoteEventsList, { remoteEventToDraft } from "./RemoteEventsList";

/** 日历同步设置：Client ID 配置、OAuth 连接、远端事件拉取与导入（未配置时显示三步指引） */
export default function SyncSettingsDialog() {
  const syncDialogOpen = useUiStore((s) => s.syncDialogOpen);
  const closeSyncDialog = useUiStore((s) => s.closeSyncDialog);
  const subCalendars = useScheduleStore((s) => s.subCalendars);
  const interviews = useScheduleStore((s) => s.interviews);
  const addInterview = useScheduleStore((s) => s.addInterview);
  const updateInterview = useScheduleStore((s) => s.updateInterview);
  const dialogRef = useFocusTrap<HTMLDivElement>(syncDialogOpen);

  const sync = useGoogleSync(syncDialogOpen);

  // 已导入的远端事件 id（防重复导入）
  const importedEventIds = useMemo(
    () =>
      new Set(
        interviews
          .map((iv) => iv.externalEventId)
          .filter((id): id is string => typeof id === "string" && id !== ""),
      ),
    [interviews],
  );
  const importableEvents = sync.remoteEvents.filter((event) => !importedEventIds.has(event.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSyncDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSyncDialog]);

  if (!syncDialogOpen) return null;

  const handleImport = (event: RemoteCalendarEvent) => {
    const target = subCalendars[0]?.id;
    if (!target) return;
    const draft = remoteEventToDraft(event, target);
    if (!draft) return;
    const id = addInterview(draft);
    if (id) updateInterview(id, { externalEventId: event.id });
    sync.removeEvent(event.id);
    sync.setStatusNote(`已导入「${event.summary.slice(0, 20)}」。`);
  };

  const configured = sync.clientId.trim() !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={closeSyncDialog} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="日历同步设置"
        className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-card bg-card p-5 shadow-card"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Google 日历同步</h2>
          <ScaleButton
            onClick={closeSyncDialog}
            ariaLabel="关闭同步设置"
            className="bg-transparent p-1.5 text-ink-tertiary hover:bg-ink/5 hover:text-ink-secondary"
          >
            <X size={16} aria-hidden />
          </ScaleButton>
        </div>

        <div className="mt-4 flex flex-col gap-3 overflow-y-auto pr-1">
          <p className="text-xs leading-5 text-ink-tertiary">
            把面试自动放进你的 Google 日历。三步配置（一次性，约 3 分钟）：
            <br />
            ① console.cloud.google.com → 新建项目 → 启用 Calendar API；
            <br />
            ② 「凭据 → OAuth 客户端 ID → Web 应用」，授权来源填 http://localhost:3100；
            <br />
            ③ 把 Client ID 粘贴到下面并保存。
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-tertiary">OAuth Client ID</span>
            <input
              className={INPUT_CLASS}
              value={sync.clientId}
              onChange={(e) => sync.setClientId(e.target.value)}
              placeholder="xxxxx.apps.googleusercontent.com"
              aria-label="OAuth Client ID"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <ScaleButton
              onClick={sync.saveId}
              ariaLabel="保存 Client ID"
              disabled={!configured}
              className="bg-primary/15 text-ink-secondary"
            >
              保存 Client ID
            </ScaleButton>
            <ScaleButton
              onClick={sync.connect}
              ariaLabel="连接 Google 账号"
              disabled={sync.busy || !configured}
              className="bg-accent text-on-accent"
            >
              连接 Google 账号
            </ScaleButton>
            <ScaleButton onClick={sync.disconnect} ariaLabel="断开 Google 连接" className="bg-ink/5 text-ink-secondary">
              断开
            </ScaleButton>
            <ScaleButton
              onClick={sync.pull}
              ariaLabel="拉取远端事件"
              disabled={sync.busy}
              className="bg-ink/5 text-ink-secondary"
            >
              <RefreshCw size={13} aria-hidden />
              拉取最近事件
            </ScaleButton>
          </div>

          {sync.status ? (
            <p className="text-xs font-medium leading-5 text-success" role="status">
              {sync.status}
            </p>
          ) : null}

          {importableEvents.length > 0 ? (
            <RemoteEventsList
              events={importableEvents}
              fallbackSubCalendarId={subCalendars[0]?.id ?? ""}
              onImport={handleImport}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
