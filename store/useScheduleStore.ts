"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Interview,
  InterviewDraft,
  InterviewStatus,
  InterviewUpdatePatch,
  SubCalendar,
} from "@/types";
import { INTERVIEWS, SUB_CALENDARS } from "@/mocks/interviews";
import { calcPriority } from "@/lib/priority";
import { zonedWallToUtc } from "@/lib/time";

export type DeleteCalendarMode = "migrate" | "cascade";

interface ScheduleStore {
  interviews: Interview[];
  subCalendars: SubCalendar[];
  /** 列表展示顺序（面试 id），初始按优先级降序；用户拖拽排序后以手调顺序为准 */
  order: string[];
  /** 子日历筛选；null = 全部 */
  selectedSubCalendarId: string | null;
  /** 备战胶囊的手动折叠时间戳（interviewId → 折叠截止毫秒），5 分钟内不自动展开 */
  capsuleCollapsedUntil: Record<string, number>;
  reorder: (ids: string[]) => void;
  markOffer: (id: string) => void;
  markDeclined: (id: string) => void;
  restore: (id: string) => void;
  sortByPriority: () => void;
  setSelectedSubCalendar: (id: string | null) => void;
  addSubCalendar: (name: string, color: string) => string;
  updateSubCalendar: (id: string, patch: { name?: string; color?: string }) => void;
  deleteSubCalendar: (id: string, mode: DeleteCalendarMode, migrateTargetId?: string) => void;
  collapseCapsule: (interviewId: string, untilMs: number) => void;
  /** 面试 CRUD：草稿为所在地时区的墙上时间，这里统一转 UTC ISO 存储 */
  addInterview: (draft: InterviewDraft) => string;
  updateInterview: (id: string, patch: InterviewUpdatePatch) => void;
  deleteInterview: (id: string) => void;
}

function setStatus(interviews: Interview[], id: string, status: InterviewStatus): Interview[] {
  return interviews.map((item) => (item.id === id ? { ...item, status } : item));
}

/** 按优先级降序排序；已挂/取消的卡片沉底，不参与分数排序 */
function sortIdsByPriority(interviews: Interview[], nowMs: number): string[] {
  return [...interviews]
    .sort((a, b) => {
      if (a.status === "declined" && b.status !== "declined") return 1;
      if (a.status !== "declined" && b.status === "declined") return -1;
      return calcPriority(b, nowMs) - calcPriority(a, nowMs);
    })
    .map((item) => item.id);
}

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 草稿 → Interview：墙上时间（所在地时区）转 UTC；meetingUrl/jdNotes 空串归一为 null */
function draftToInterview(draft: InterviewDraft, id: string): Interview | null {
  const startUtc = zonedWallToUtc(draft.startDate, draft.startTime, draft.sourceTimeZone);
  if (!startUtc) return null;
  return {
    id,
    company: draft.company.trim(),
    position: draft.position.trim(),
    startUtc,
    endUtc: new Date(Date.parse(startUtc) + draft.durationMinutes * 60_000).toISOString(),
    sourceTimeZone: draft.sourceTimeZone,
    importance: draft.importance,
    type: draft.type,
    status: "upcoming",
    subCalendarId: draft.subCalendarId,
    prep: {
      focusAreas: [],
      note: "",
      meetingUrl: draft.meetingUrl.trim() === "" ? null : draft.meetingUrl.trim(),
      resumeUrl: null,
      jdNotes: draft.jdNotes.trim() === "" ? null : draft.jdNotes.trim(),
    },
  };
}

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      interviews: INTERVIEWS,
      subCalendars: SUB_CALENDARS,
      order: sortIdsByPriority(INTERVIEWS, Date.now()),
      selectedSubCalendarId: null,
      capsuleCollapsedUntil: {},
      reorder: (ids) => set({ order: ids }),
      markOffer: (id) => set((s) => ({ interviews: setStatus(s.interviews, id, "offer") })),
      markDeclined: (id) => set((s) => ({ interviews: setStatus(s.interviews, id, "declined") })),
      restore: (id) => set((s) => ({ interviews: setStatus(s.interviews, id, "upcoming") })),
      sortByPriority: () => set((s) => ({ order: sortIdsByPriority(s.interviews, Date.now()) })),
      setSelectedSubCalendar: (id) => set({ selectedSubCalendarId: id }),
      addSubCalendar: (name, color) => {
        const id = newId("sub");
        set((s) => ({ subCalendars: [...s.subCalendars, { id, name, color, description: "" }] }));
        return id;
      },
      updateSubCalendar: (id, patch) =>
        set((s) => ({
          subCalendars: s.subCalendars.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteSubCalendar: (id, mode, migrateTargetId) => {
        const state = get();
        if (mode === "migrate" && migrateTargetId) {
          set({
            interviews: state.interviews.map((iv) =>
              iv.subCalendarId === id ? { ...iv, subCalendarId: migrateTargetId } : iv,
            ),
            subCalendars: state.subCalendars.filter((c) => c.id !== id),
            selectedSubCalendarId:
              state.selectedSubCalendarId === id ? null : state.selectedSubCalendarId,
          });
          return;
        }
        // cascade：一并删除关联面试
        const removedIds = new Set(
          state.interviews.filter((iv) => iv.subCalendarId === id).map((iv) => iv.id),
        );
        set({
          interviews: state.interviews.filter((iv) => iv.subCalendarId !== id),
          order: state.order.filter((interviewId) => !removedIds.has(interviewId)),
          subCalendars: state.subCalendars.filter((c) => c.id !== id),
          selectedSubCalendarId: state.selectedSubCalendarId === id ? null : state.selectedSubCalendarId,
        });
      },
      collapseCapsule: (interviewId, untilMs) =>
        set((s) => {
          // 修剪超过 10 分钟的过期折叠记录，避免无界增长
          const cutoff = Date.now() - 10 * 60_000;
          const next: Record<string, number> = {};
          for (const [id, ts] of Object.entries(s.capsuleCollapsedUntil)) {
            if (ts > cutoff) next[id] = ts;
          }
          next[interviewId] = untilMs;
          return { capsuleCollapsedUntil: next };
        }),
      addInterview: (draft) => {
        const id = newId("iv");
        const interview = draftToInterview(draft, id);
        if (!interview) return "";
        set((s) => ({
          interviews: [...s.interviews, interview],
          order: [...s.order, id],
        }));
        return id;
      },
      updateInterview: (id, patch) =>
        set((s) => ({
          interviews: s.interviews.map((iv) => (iv.id === id ? { ...iv, ...patch } : iv)),
        })),
      deleteInterview: (id) =>
        set((s) => ({
          interviews: s.interviews.filter((iv) => iv.id !== id),
          order: s.order.filter((interviewId) => interviewId !== id),
        })),
    }),
    {
      name: "schedule-store-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        interviews: s.interviews,
        subCalendars: s.subCalendars,
        order: s.order,
        selectedSubCalendarId: s.selectedSubCalendarId,
        capsuleCollapsedUntil: s.capsuleCollapsedUntil,
      }),
      // 挂载后再 rehydrate：首帧用 mock（与 SSR 一致），避免水合错配
      skipHydration: true,
    },
  ),
);
