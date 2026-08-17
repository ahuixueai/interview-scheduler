"use client";

import { ArrowUpWideNarrow } from "lucide-react";
import type { SubCalendar } from "@/types";
import FilterChips from "./FilterChips";
import ScaleButton from "./ScaleButton";

interface ListControlsProps {
  subCalendars: SubCalendar[];
  selectedId: string | null;
  visibleCount: number;
  onSelectFilter: (id: string | null) => void;
  onSortByPriority: () => void;
}

/** 列表头部：子日历筛选 + 计数 + 按优先级重排 */
export default function ListControls({
  subCalendars,
  selectedId,
  visibleCount,
  onSelectFilter,
  onSortByPriority,
}: ListControlsProps) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <FilterChips subCalendars={subCalendars} selectedId={selectedId} onSelect={onSelectFilter} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-ink-secondary">
          共 {visibleCount} 场 · 上下拖动排序 · 左右滑动改状态
        </p>
        <ScaleButton
          onClick={onSortByPriority}
          ariaLabel="按优先级重新排序"
          className="bg-primary/15 text-ink-secondary hover:bg-primary/25"
        >
          <ArrowUpWideNarrow size={14} aria-hidden />
          按优先级重排
        </ScaleButton>
      </div>
    </div>
  );
}
