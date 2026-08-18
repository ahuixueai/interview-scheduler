"use client";

import { create } from "zustand";
import type { Interview, InterviewDraft, InterviewUpdatePatch, SubCalendar } from "@/types";
import { calcPriority } from "@/lib/priority";
import { api } from "@/lib/api";
import { wallDateInZone, wallTimeInZone } from "@/lib/time-core";
import { useUiStore } from "@/store/useUiStore";

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
  /** 撤销最近删除（仅内存暂存） */
  restoreDeleted: (id: string) => void;
}

function patchInterview(list: Interview[], id: string, patch: InterviewUpdatePatch): Interview[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

/** 最近删除的面试暂存（撤销删除用；仅内存，刷新即失效） */
const pendingDeletions = new Map<string, Interview>();

function interviewToDraft(iv: Interview): InterviewDraft {
  const duration = Math.round((Date.parse(iv.endUtc) - Date.parse(iv.startUtc)) / 60_000);
  return {
    company: iv.company,
    position: iv.position,
    type: iv.type,
    importance: iv.importance,
    subCalendarId: iv.subCalendarId,
    startDate: wallDateInZone(iv.startUtc, iv.sourceTimeZone),
    startTime: wallTimeInZone(iv.startUtc, iv.sourceTimeZone),
    sourceTimeZone: iv.sourceTimeZone,
    durationMinutes: duration >= 15 && duration <= 480 ? duration : 60,
    reminders: iv.reminders ?? [1440, 60],
    meetingUrl: iv.prep.meetingUrl ?? "",
    jdNotes: iv.prep.jdNotes ?? "",
  };
}

const toast = (
  text: string,
  kind?: "success" | "error",
  options?: { actionLabel?: string; onAction?: () => void },
) => useUiStore.getState().pushToast(text, kind, options);

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
      (e) => toast(e instanceof Error ? e.message : "更新失败", "error"),
    );
  },
  markDeclined: (id) => {
    set((s) => ({ interviews: patchInterview(s.interviews, id, { status: "declined" }) }));
    void api(`/api/interviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "declined" }),
    }).catch((e) => toast(e instanceof Error ? e.message : "更新失败", "error"));
  },
  restore: (id) => {
    set((s) => ({ interviews: patchInterview(s.interviews, id, { status: "upcoming" }) }));
    void api(`/api/interviews/${id}`, { method: "PATCH", body: JSON.stringify({ status: "upcoming" }) }).catch(
      (e) => toast(e instanceof Error ? e.message : "更新失败", "error"),
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
    void api(`/api/sub-calendars/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
      .then(() => toast("子日历已保存"))
      .catch((e) => toast(e instanceof Error ? e.message : "更新子日历失败", "error"));
  },
  deleteSubCalendar: (id, mode, migrateTargetId) => {
    void api<ScheduleSnapshot>(`/api/sub-calendars/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ mode, targetId: migrateTargetId }),
    })
      .then((snapshot) => {
        set({
          ...snapshot,
          selectedSubCalendarId: get().selectedSubCalendarId === id ? null : get().selectedSubCalendarId,
        });
        toast("子日历已删除");
      })
      .catch((e) => toast(e instanceof Error ? e.message : "删除子日历失败", "error"));
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
    toast(`已创建「${data.interview.company} · ${data.interview.position}」`);
    return data.interview.id;
  },
  updateInterview: (id, patch) => {
    set((s) => ({ interviews: patchInterview(s.interviews, id, patch) }));
    void api(`/api/interviews/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
      .then(() => toast("已保存修改"))
      .catch((e) => toast(e instanceof Error ? e.message : "更新面试失败", "error"));
  },
  deleteInterview: (id) => {
    const target = get().interviews.find((iv) => iv.id === id);
    if (target) pendingDeletions.set(id, target);
    set((s) => ({
      interviews: s.interviews.filter((iv) => iv.id !== id),
      order: s.order.filter((interviewId) => interviewId !== id),
    }));
    void api(`/api/interviews/${id}`, { method: "DELETE" }).catch((e) =>
      toast(e instanceof Error ? e.message : "删除失败", "error"),
    );
    if (target) {
      toast(`已删除「${target.company} · ${target.position}」`, "success", {
        actionLabel: "撤销",
        onAction: () => get().restoreDeleted(id),
      });
    }
  },
  restoreDeleted: (id) => {
    const target = pendingDeletions.get(id);
    if (!target) return;
    pendingDeletions.delete(id);
    void get()
      .addInterview(interviewToDraft(target))
      .then(() => toast("已恢复删除的面试"))
      .catch((e) => toast(e instanceof Error ? e.message : "恢复失败", "error"));
  },
}));
