"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { SubCalendar } from "@/types";
import { useScheduleStore } from "@/store/useScheduleStore";
import { INPUT_CLASS } from "@/lib/ui";
import { useFocusTrap } from "@/lib/useFocusTrap";
import ScaleButton from "./ScaleButton";
import DeleteCalendarDialog from "./DeleteCalendarDialog";

interface SubCalendarManagerProps {
  onClose: () => void;
}

/** 子日历管理：创建 / 编辑 / 删除（删除有关联面试时走确认弹窗，迁移或一并删除）；含焦点陷阱 */
export default function SubCalendarManager({ onClose }: SubCalendarManagerProps) {
  const subCalendars = useScheduleStore((s) => s.subCalendars);
  const interviews = useScheduleStore((s) => s.interviews);
  const addSubCalendar = useScheduleStore((s) => s.addSubCalendar);
  const updateSubCalendar = useScheduleStore((s) => s.updateSubCalendar);
  const deleteSubCalendar = useScheduleStore((s) => s.deleteSubCalendar);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#7DB8E8");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#7DB8E8");
  const [pendingDelete, setPendingDelete] = useState<SubCalendar | null>(null);

  const dialogRef = useFocusTrap<HTMLDivElement>(pendingDelete === null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const iv of interviews) map.set(iv.subCalendarId, (map.get(iv.subCalendarId) ?? 0) + 1);
    return map;
  }, [interviews]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingDelete) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pendingDelete]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    addSubCalendar(name, newColor);
    setNewName("");
  };

  const startEdit = (c: SubCalendar) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateSubCalendar(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="管理子日历"
        className="relative z-10 w-full max-w-md rounded-card bg-card p-5 shadow-card"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">子日历管理</h2>
          <ScaleButton
            onClick={onClose}
            ariaLabel="关闭子日历管理"
            className="bg-transparent p-1.5 text-ink-tertiary hover:bg-ink/5 hover:text-ink-secondary"
          >
            <X size={16} aria-hidden />
          </ScaleButton>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {subCalendars.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-xl bg-surface/70 px-3 py-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: c.color }}
                aria-hidden
              />
              {editingId === c.id ? (
                <>
                  <input
                    className={`${INPUT_CLASS} min-w-0 flex-1`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="日历名称"
                  />
                  <input
                    type="color"
                    className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    aria-label="日历颜色"
                  />
                  <ScaleButton
                    onClick={saveEdit}
                    ariaLabel="保存"
                    className="bg-accent text-on-accent"
                  >
                    保存
                  </ScaleButton>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}</span>
                  <span className="shrink-0 text-xs text-ink-tertiary">{counts.get(c.id) ?? 0} 场</span>
                  <ScaleButton
                    onClick={() => startEdit(c)}
                    ariaLabel={`编辑 ${c.name}`}
                    className="bg-transparent p-1.5 text-ink-tertiary hover:bg-ink/5 hover:text-ink-secondary"
                  >
                    <Pencil size={13} aria-hidden />
                  </ScaleButton>
                  <ScaleButton
                    onClick={() => setPendingDelete(c)}
                    ariaLabel={`删除 ${c.name}`}
                    className="bg-transparent p-1.5 text-ink-tertiary hover:bg-ink/5 hover:text-ink-secondary"
                  >
                    <Trash2 size={13} aria-hidden />
                  </ScaleButton>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[11px] text-ink-tertiary">新建子日历</span>
            <input
              className={INPUT_CLASS}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="名称，如 春招 - 算法岗"
              aria-label="新子日历名称"
            />
          </label>
          <input
            type="color"
            className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            aria-label="新子日历颜色"
          />
          <ScaleButton
            onClick={handleCreate}
            ariaLabel="添加子日历"
            disabled={!newName.trim()}
            className="bg-accent text-on-accent"
          >
            <Plus size={13} aria-hidden />
            添加
          </ScaleButton>
        </div>
      </div>
      {pendingDelete ? (
        <DeleteCalendarDialog
          calendar={pendingDelete}
          relatedCount={counts.get(pendingDelete.id) ?? 0}
          otherCalendars={subCalendars.filter((c) => c.id !== pendingDelete.id)}
          onConfirm={(mode, targetId) => {
            deleteSubCalendar(pendingDelete.id, mode, targetId);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  );
}
