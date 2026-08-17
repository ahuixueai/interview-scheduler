"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCog, LogOut, Plus, RefreshCw } from "lucide-react";
import { useUiStore } from "@/store/useUiStore";
import ThemeToggle from "./ThemeToggle";
import PepTalkBanner from "./PepTalkBanner";
import ScaleButton from "./ScaleButton";
import SubCalendarManager from "./SubCalendarManager";
import InterviewFormDialog from "./InterviewFormDialog";
import SyncSettingsDialog from "./SyncSettingsDialog";

interface PageHeaderProps {
  userEmail?: string;
}

export default function PageHeader({ userEmail }: PageHeaderProps) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const syncDialogOpen = useUiStore((s) => s.syncDialogOpen);
  const managerButtonRef = useRef<HTMLButtonElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const syncButtonRef = useRef<HTMLButtonElement | null>(null);

  // 同步对话框关闭后焦点归还触发按钮（首次渲染不触发）
  const prevSyncOpen = useRef(false);
  useEffect(() => {
    if (prevSyncOpen.current && !syncDialogOpen) syncButtonRef.current?.focus();
    prevSyncOpen.current = syncDialogOpen;
  }, [syncDialogOpen]);

  const closeManager = () => {
    setManagerOpen(false);
    // 关闭对话框后焦点归还触发按钮（键盘可达性）
    managerButtonRef.current?.focus();
  };

  const closeCreate = () => {
    setCreateOpen(false);
    createButtonRef.current?.focus();
  };

  return (
    <header className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">面试与笔试日程</h1>
          <p className="mt-1 truncate text-sm text-ink-secondary">
            {userEmail ? `${userEmail} · ` : ""}向左滑标记 Offer，向右滑挂掉
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <ScaleButton
            onClick={() => setCreateOpen(true)}
            ariaLabel="新建面试"
            buttonRef={createButtonRef}
            className="bg-accent text-on-accent shadow-sm hover:bg-accent/90"
          >
            <Plus size={14} aria-hidden />
            新建面试
          </ScaleButton>
          <ScaleButton
            onClick={() => setManagerOpen(true)}
            ariaLabel="管理子日历"
            buttonRef={managerButtonRef}
            className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
          >
            <CalendarCog size={14} aria-hidden />
            子日历
          </ScaleButton>
          <ScaleButton
            onClick={() => useUiStore.getState().openSyncDialog()}
            ariaLabel="日历同步设置"
            buttonRef={syncButtonRef}
            className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
          >
            <RefreshCw size={14} aria-hidden />
            同步
          </ScaleButton>
          <ScaleButton
            onClick={() => {
              void fetch("/api/auth/logout", { method: "POST" }).then(() => {
                window.location.href = "/login";
              });
            }}
            ariaLabel="退出登录"
            title={`当前登录：${userEmail ?? ""}`}
            className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
          >
            <LogOut size={14} aria-hidden />
          </ScaleButton>
          <ThemeToggle />
        </div>
      </div>
      <PepTalkBanner />
      {createOpen ? <InterviewFormDialog mode={{ kind: "create" }} onClose={closeCreate} /> : null}
      {managerOpen ? <SubCalendarManager onClose={closeManager} /> : null}
      <SyncSettingsDialog />
    </header>
  );
}
