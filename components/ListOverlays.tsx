"use client";

import type { Interview } from "@/types";
import FocusMode from "./FocusMode";
import ConfirmDialog from "./ConfirmDialog";
import InterviewFormDialog from "./InterviewFormDialog";

interface ListOverlaysProps {
  focusTarget: { interview: Interview } | null;
  editingInterview: Interview | null;
  deletingInterview: Interview | null;
  onCloseFocus: () => void;
  onCloseEdit: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: (interview: Interview) => void;
}

/** 列表之上的全局覆盖层：专注模式、编辑表单、删除确认（从 InterviewList 拆出） */
export default function ListOverlays({
  focusTarget,
  editingInterview,
  deletingInterview,
  onCloseFocus,
  onCloseEdit,
  onCancelDelete,
  onConfirmDelete,
}: ListOverlaysProps) {
  return (
    <>
      {focusTarget ? <FocusMode interview={focusTarget.interview} onClose={onCloseFocus} /> : null}

      {editingInterview ? (
        <InterviewFormDialog
          mode={{ kind: "edit", interview: editingInterview }}
          onClose={onCloseEdit}
        />
      ) : null}

      {deletingInterview ? (
        <ConfirmDialog
          title="删除这场面试"
          description={`「${deletingInterview.company} · ${deletingInterview.position}」将从日程中移除，此操作无法撤销。`}
          confirmLabel="确认删除"
          onConfirm={() => onConfirmDelete(deletingInterview)}
          onCancel={onCancelDelete}
        />
      ) : null}
    </>
  );
}
