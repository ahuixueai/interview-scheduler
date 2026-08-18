"use client";

import { create } from "zustand";

export interface Toast {
  id: number;
  kind: "success" | "error";
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface UiStore {
  syncDialogOpen: boolean;
  createDialogOpen: boolean;
  toasts: Toast[];
  openSyncDialog: () => void;
  closeSyncDialog: () => void;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  pushToast: (text: string, kind?: Toast["kind"], options?: { actionLabel?: string; onAction?: () => void }) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 1;

/** 跨组件轻量 UI 状态：日历同步/新建面试对话框、全局 Toast 通知 */
export const useUiStore = create<UiStore>()((set, get) => ({
  syncDialogOpen: false,
  createDialogOpen: false,
  toasts: [],
  openSyncDialog: () => set({ syncDialogOpen: true }),
  closeSyncDialog: () => set({ syncDialogOpen: false }),
  openCreateDialog: () => set({ createDialogOpen: true }),
  closeCreateDialog: () => set({ createDialogOpen: false }),
  pushToast: (text, kind = "success", options) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text, ...options }] }));
    // 带撤销按钮的提示停留更久
    window.setTimeout(() => get().dismissToast(id), options?.actionLabel ? 6000 : 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
