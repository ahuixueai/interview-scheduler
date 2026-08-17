"use client";

import { create } from "zustand";

interface UiStore {
  syncDialogOpen: boolean;
  openSyncDialog: () => void;
  closeSyncDialog: () => void;
}

/** 跨组件的轻量 UI 状态（日历同步设置对话框的开关） */
export const useUiStore = create<UiStore>()((set) => ({
  syncDialogOpen: false,
  openSyncDialog: () => set({ syncDialogOpen: true }),
  closeSyncDialog: () => set({ syncDialogOpen: false }),
}));
