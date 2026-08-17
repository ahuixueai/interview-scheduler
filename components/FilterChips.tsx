"use client";

import type { SubCalendar } from "@/types";
import ScaleButton from "./ScaleButton";

interface FilterChipsProps {
  subCalendars: SubCalendar[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** 看板子日历筛选；选中态用主色底 + on-accent 文字（对比度见 scripts/contrast-check.mjs） */
export default function FilterChips({ subCalendars, selectedId, onSelect }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="按子日历筛选">
      <ScaleButton
        onClick={() => onSelect(null)}
        ariaLabel="显示全部子日历"
        className={selectedId === null ? "bg-primary text-on-accent" : "bg-ink/5 text-ink-secondary"}
      >
        <span className="h-2 w-2 rounded-full border border-current" aria-hidden />
        全部
      </ScaleButton>
      {subCalendars.map((c) => (
        <ScaleButton
          key={c.id}
          onClick={() => onSelect(c.id)}
          ariaLabel={`只看 ${c.name}`}
          className={selectedId === c.id ? "bg-primary text-on-accent" : "bg-ink/5 text-ink-secondary"}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
          {c.name}
        </ScaleButton>
      ))}
    </div>
  );
}
