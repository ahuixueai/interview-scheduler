"use client";

import { create } from "zustand";
import type { Interview, InterviewDraft, InterviewUpdatePatch, SubCalendar } from "@/types";
import { calcPriority } from "@/lib/priority";
import { api } from "@/lib/api";

export type DeleteCalendarMode = "migrate" | "cascade";

interface ScheduleSnapshot {
  interviews: Interview[];
  subCalendars: SubCalendar[];
  order: string[];
}

interface ScheduleStore {
  interviews: Interview[];
  subCalendars: SubCalendar[];
  order: string[];
  loaded: boolean;
  loadError: string | null;
  /** 筛选与胶囊折叠是纯 UI 偏好，保留在客户端 */
  selectedSubCalendarId: string | null;
  capsuleCollapsedUntil: Record<string, number>;
  load: () => Promise<void>;
  reorder: (ids: string[]) => void;
  markOffer: (id: string) => void;
  markDeclined: (id: string) => void;
  restore: (id: string) => void;
  sortByPriority: () => void;
  setSelectedSubCalendar: (id: string | null) => void;
  addSubCalendar: (name: string, color: string) => Promise<string>;
  updateSubCalendar: (id: string, patch: { name?: string; color?: string }) => void;
  deleteSubCalendar: (id: string, mode: DeleteCalendarMode, migrateTargetId?: string) => void;
  collapseCapsule: (interviewId: string, untilMs: number) => void;
  addInterview: (draft: InterviewDraft) => Promise<string>;
  updateInterview: (id: string, patch: InterviewUpdatePatch) => void;
  deleteInterview: (id: string) => void;
}

function patchInterview(list: Interview[], id: string, patch: InterviewUpdatePatch): Interview[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

/** 按优先级降序；已挂/取消沉底 */
function sortIdsByPriority(interviews: Interview[], nowMs: number): string[] {
  return [...interviews]
    .sort((a, b) => {
      if (a.status === "declined" && b.status !== "declined") return 1;
      if (a.status !== "declined" && b.status === "declined") return -1;
      return calcPriority(b, nowMs) - calcPriority(a, nowMs);
    })
    .map((item) => item.id);
}

export const useScheduleStore = create<ScheduleStore>()((set, get) => ({
  interviews: [],
  subCalendars: [],
  order: [],
  loaded: false,
  loadError: null,
  selectedSubCalendarId: null,
  capsuleCollapsedUntil: {},

  load: async () => {
    set({ loadError: null });
    try {
      const snapshot = await api<ScheduleSnapshot>("/api/schedule");
      set({ ...snapshot, loaded: true });
    } catch (e) {
      set({
        loaded: true,
        loadError: e instanceof Error ? e.message : "加载失败，请刷新重试",
      });
    }
  },

  reorder: (ids) => {
    set({ order: ids });
    void api("/api/schedule/order", { method: "PUT", body: JSON.stringify({ ids }) }).catch((e) =>
      console.error("保存顺序失败", e),
    );
  },

  markOffer: (id) => {
    set((s) => ({ interviews: patchInterview(s.interviews, id, { status: "offer" }) }));
    void api(`/api/interviews/${id}`, { method: "PATCH", body: JSON.stringify({ status: "offer" }) }).catch(
      (e) => console.error("更新状态失败", e),
    );
  },
  markDeclined: (id) => {
    set((s) => ({ interviews: patchInterview(s.interviews, id, { status: "declined" }) }));
    void api(`/api/interviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "declined" }),
    }).catch((e) => console.error("更新状态失败", e));
  },
  restore: (id) => {
    set((s) => ({ interviews: patchInterview(s.interviews, id, { status: "upcoming" }) }));
    void api(`/api/interviews/${id}`, { method: "PATCH", body: JSON.stringify({ status: "upcoming" }) }).catch(
      (e) => console.error("更新状态失败", e),
    );
  },

  sortByPriority: () => {
    const { interviews } = get();
    const ids = sortIdsByPriority(interviews, Date.now());
    get().reorder(ids);
  },

  setSelectedSubCalendar: (id) => set({ selectedSubCalendarId: id }),

  addSubCalendar: async (name, color) => {
    const data = await api<{ subCalendar: SubCalendar }>("/api/sub-calendars", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
    set((s) => ({ subCalendars: [...s.subCalendars, data.subCalendar] }));
    return data.subCalendar.id;
  },
  updateSubCalendar: (id, patch) => {
    set((s) => ({
      subCalendars: s.subCalendars.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    void api(`/api/sub-calendars/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch((e) =>
      console.error("更新子日历失败", e),
    );
  },
  deleteSubCalendar: (id, mode, migrateTargetId) => {
    void api<ScheduleSnapshot>(`/api/sub-calendars/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ mode, targetId: migrateTargetId }),
    })
      .then((snapshot) =>
        set({
          ...snapshot,
          selectedSubCalendarId: get().selectedSubCalendarId === id ? null : get().selectedSubCalendarId,
        }),
      )
      .catch((e) => console.error("删除子日历失败", e));
  },

  collapseCapsule: (interviewId, untilMs) =>
    set((s) => {
      const cutoff = Date.now() - 10 * 60_000;
      const next: Record<string, number> = {};
      for (const [id, ts] of Object.entries(s.capsuleCollapsedUntil)) {
        if (ts > cutoff) next[id] = ts;
      }
      next[interviewId] = untilMs;
      return { capsuleCollapsedUntil: next };
    }),

  addInterview: async (draft) => {
    const data = await api<{ interview: Interview }>("/api/interviews", {
      method: "POST",
      body: JSON.stringify(draft),
    });
    set((s) => ({
      interviews: [...s.interviews, data.interview],
      order: [...s.order, data.interview.id],
    }));
    return data.interview.id;
  },
  updateInterview: (id, patch) => {
    set((s) => ({ interviews: patchInterview(s.interviews, id, patch) }));
    void api(`/api/interviews/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch((e) =>
      console.error("更新面试失败", e),
    );
  },
  deleteInterview: (id) => {
    set((s) => ({
      interviews: s.interviews.filter((iv) => iv.id !== id),
      order: s.order.filter((interviewId) => interviewId !== id),
    }));
    void api(`/api/interviews/${id}`, { method: "DELETE" }).catch((e) =>
      console.error("删除面试失败", e),
    );
  },
}));
