import { FileText, Timer, UserRound, Video, type LucideIcon } from "lucide-react";
import type { InterviewStatus, InterviewType, SubCalendar } from "@/types";

/** 面试所属子日历缺失时的兜底展示 */
export const FALLBACK_SUB_CALENDAR: SubCalendar = {
  id: "unknown",
  name: "未分类",
  color: "var(--color-muted)",
  description: "",
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  video: "视频面试",
  "online-test": "在线笔试",
  "hr-screen": "HR 初面",
  assessment: "在线测评",
};

export const INTERVIEW_TYPE_ICONS: Record<InterviewType, LucideIcon> = {
  video: Video,
  "online-test": FileText,
  "hr-screen": UserRound,
  assessment: Timer,
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  upcoming: "待进行",
  offer: "已拿到 Offer",
  declined: "已挂 / 已取消",
};
