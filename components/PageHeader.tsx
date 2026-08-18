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
  const syncDialogOpen = useUiStore((s) => s.syncDialogOpen);
  const createDialogOpen = useUiStore((s) => s.createDialogOpen);
  const openCreateDialog = useUiStore((s) => s.openCreateDialog);
  const closeCreateDialog = useUiStore((s) => s.closeCreateDialog);
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

  // 新建对话框关闭后焦点归还触发按钮（首次渲染不触发；空状态也会打开该对话框）
  const prevCreateOpen = useRef(false);
  useEffect(() => {
    if (prevCreateOpen.current && !createDialogOpen) createButtonRef.current?.focus();
    prevCreateOpen.current = createDialogOpen;
  }, [createDialogOpen]);

  return (
    <header className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">面试与笔试日程</h1>
          <p className="mt-1 truncate text-sm text-ink-secondary">
            {userEmail ? `${userEmail} · ` : ""}向左滑标记 Offer，向右滑挂掉
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <ScaleButton
            onClick={openCreateDialog}
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
      {createDialogOpen ? (
        <InterviewFormDialog mode={{ kind: "create" }} onClose={closeCreateDialog} />
      ) : null}
      {managerOpen ? <SubCalendarManager onClose={closeManager} /> : null}
      <SyncSettingsDialog />
    </header>
  );
}
