"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useReducedMotion } from "framer-motion";
import type { Interview } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { calcPriority } from "@/lib/priority";
import { celebrateWithConfetti, vibrate } from "@/lib/feedback";
import { useNow } from "@/lib/useNow";
import { FALLBACK_SUB_CALENDAR } from "@/lib/labels";
import ScheduleItem from "./ScheduleItem";
import ListControls from "./ListControls";
import ListOverlays from "./ListOverlays";

/** 距开始 ≤60 分钟进入备战窗口 */
const PREP_WINDOW_MS = 60 * 60_000;

interface FocusTarget {
  interview: Interview;
  trigger: HTMLElement | null;
}

export default function InterviewList() {
  const interviews = useScheduleStore((s) => s.interviews);
  const order = useScheduleStore((s) => s.order);
  const subCalendars = useScheduleStore((s) => s.subCalendars);
  const selectedSubCalendarId = useScheduleStore((s) => s.selectedSubCalendarId);
  const capsuleCollapsedUntil = useScheduleStore((s) => s.capsuleCollapsedUntil);
  const reorder = useScheduleStore((s) => s.reorder);
  const markOffer = useScheduleStore((s) => s.markOffer);
  const markDeclined = useScheduleStore((s) => s.markDeclined);
  const restore = useScheduleStore((s) => s.restore);
  const sortByPriority = useScheduleStore((s) => s.sortByPriority);
  const setSelectedSubCalendar = useScheduleStore((s) => s.setSelectedSubCalendar);
  const collapseCapsule = useScheduleStore((s) => s.collapseCapsule);
  const deleteInterview = useScheduleStore((s) => s.deleteInterview);
  const load = useScheduleStore((s) => s.load);
  const loaded = useScheduleStore((s) => s.loaded);
  const loadError = useScheduleStore((s) => s.loadError);
  const reducedMotion = useReducedMotion() ?? false;
  const now = useNow(60_000);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [deletingInterview, setDeletingInterview] = useState<Interview | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  // 重排 epoch：重排后重挂载列表，清掉 framer 高卡片上移时的投影残留（e2e 实测复现）；代价是重排动效瞬时化
  const [layoutEpoch, setLayoutEpoch] = useState(0);

  // 挂载后从服务端加载当前用户的日程（含首次自动播种的演示数据）
  useEffect(() => {
    void load();
  }, [load]);

  // 筛选偏好：客户端 localStorage（UI 偏好，非业务数据）
  const filterHydrated = useRef(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("subcalendar-filter");
      if (stored) setSelectedSubCalendar(stored);
    } catch {
      /* 私密模式降级 */
    }
    filterHydrated.current = true;
  }, [setSelectedSubCalendar]);
  useEffect(() => {
    if (!filterHydrated.current) return;
    try {
      if (selectedSubCalendarId === null) window.localStorage.removeItem("subcalendar-filter");
      else window.localStorage.setItem("subcalendar-filter", selectedSubCalendarId);
    } catch {
      /* 私密模式降级 */
    }
  }, [selectedSubCalendarId]);

  const byId = useMemo(() => new Map(interviews.map((i) => [i.id, i])), [interviews]);
  const items = useMemo(
    () => order.map((id) => byId.get(id)).filter((i): i is Interview => i !== undefined),
    [order, byId],
  );
  const visibleItems = useMemo(
    () =>
      selectedSubCalendarId === null
        ? items
        : items.filter((i) => i.subCalendarId === selectedSubCalendarId),
    [items, selectedSubCalendarId],
  );
  const visibleIds = useMemo(() => new Set(visibleItems.map((i) => i.id)), [visibleItems]);

  const maxScore = useMemo(() => {
    if (now === null) return 0;
    return items
      .filter((i) => i.status !== "declined")
      .reduce((max, i) => Math.max(max, calcPriority(i, now)), 0);
  }, [items, now]);

  // 筛选态下的排序：把可见子集的新顺序合并回全量顺序
  const handleReorder = useCallback(
    (nextVisible: string[]) => {
      const full = [...order];
      let k = 0;
      for (let i = 0; i < full.length; i++) {
        if (visibleIds.has(full[i])) full[i] = nextVisible[k++] ?? full[i];
      }
      reorder(full);
    },
    [order, visibleIds, reorder],
  );

  const closeFocus = useCallback(() => {
    const trigger = focusTarget?.trigger ?? null;
    setFocusTarget(null);
    window.setTimeout(() => trigger?.focus(), 80);
  }, [focusTarget]);

  // 稳定引用链：配合 memo，60s tick 只重渲染真正变化的卡片
  const celebrate = useCallback(() => celebrateWithConfetti(reducedMotion), [reducedMotion]);

  const handleOffer = useCallback(
    (id: string) => {
      markOffer(id);
      vibrate([20, 50, 20]);
      celebrate();
    },
    [markOffer, celebrate],
  );

  const handleDeclined = useCallback(
    (id: string) => {
      markDeclined(id);
      vibrate(60);
    },
    [markDeclined],
  );

  const handleSortByPriority = useCallback(() => {
    sortByPriority();
    setLayoutEpoch((epoch) => epoch + 1);
  }, [sortByPriority]);

  const handleRestore = useCallback((id: string) => restore(id), [restore]);
  const handleCollapse = useCallback(
    (id: string, untilMs: number) => collapseCapsule(id, untilMs),
    [collapseCapsule],
  );
  const handleEdit = useCallback((iv: Interview) => setEditingInterview(iv), []);
  const handleDelete = useCallback((iv: Interview) => setDeletingInterview(iv), []);
  const handleFocus = useCallback(
    (iv: Interview, trigger: HTMLElement) => setFocusTarget({ interview: iv, trigger }),
    [],
  );

  if (!loaded) {
    return (
      <section aria-label="面试与笔试列表" tabIndex={-1} ref={sectionRef}>
        {loadError ? (
          <p className="rounded-card bg-card px-5 py-4 text-sm text-danger shadow-card" role="alert">
            {loadError}
          </p>
        ) : (
          <p className="text-sm text-ink-tertiary">正在加载你的日程…</p>
        )}
      </section>
    );
  }

  return (
    <section aria-label="面试与笔试列表" tabIndex={-1} ref={sectionRef}>
      <ListControls
        subCalendars={subCalendars}
        selectedId={selectedSubCalendarId}
        visibleCount={visibleItems.length}
        onSelectFilter={setSelectedSubCalendar}
        onSortByPriority={handleSortByPriority}
      />
      <Reorder.Group
        key={`group-${layoutEpoch}`}
        axis="y"
        values={visibleItems.map((i) => i.id)}
        onReorder={handleReorder}
        className="flex flex-col gap-3"
      >
        {visibleItems.map((iv) => {
          const score = now === null ? null : calcPriority(iv, now);
          const sub = subCalendars.find((c) => c.id === iv.subCalendarId) ?? FALLBACK_SUB_CALENDAR;
          // 备战窗口布尔统一在此计算（唯一时间源）
          const startMs = Date.parse(iv.startUtc);
          const inPrepWindow =
            iv.status === "upcoming" && now !== null && startMs - now > 0 && startMs - now <= PREP_WINDOW_MS;
          const capsuleAutoExpand = inPrepWindow && (capsuleCollapsedUntil[iv.id] ?? 0) <= (now ?? 0);
          return (
            <ScheduleItem
              key={iv.id}
              interview={iv}
              subCalendar={sub}
              score={score}
              isTopPriority={score !== null && iv.status !== "declined" && score === maxScore}
              inPrepWindow={inPrepWindow}
              capsuleAutoExpand={capsuleAutoExpand}
              reducedMotion={reducedMotion}
              onOffer={handleOffer}
              onDeclined={handleDeclined}
              onRestore={handleRestore}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCollapseCapsule={handleCollapse}
              onFocusMode={handleFocus}
            />
          );
        })}
      </Reorder.Group>

      <ListOverlays
        focusTarget={focusTarget}
        editingInterview={editingInterview}
        deletingInterview={deletingInterview}
        onCloseFocus={closeFocus}
        onCloseEdit={() => setEditingInterview(null)}
        onCancelDelete={() => setDeletingInterview(null)}
        onConfirmDelete={(iv) => {
          deleteInterview(iv.id);
          setDeletingInterview(null);
          // 删除后焦点回到列表区
          sectionRef.current?.focus({ preventScroll: true });
        }}
      />
    </section>
  );
}
