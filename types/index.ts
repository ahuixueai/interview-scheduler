export type ImportanceLevel = 1 | 2 | 3 | 4 | 5;

export type InterviewType = "video" | "online-test" | "hr-screen" | "assessment";

export type InterviewStatus = "upcoming" | "offer" | "declined";

/** 备战信息（供一键备战胶囊使用） */
export interface PrepInfo {
  focusAreas: string[];
  note: string;
  /** 会议/测评直达链接；null 表示未提供 */
  meetingUrl: string | null;
  /** 简历 PDF 地址（站内静态资源）；null 表示未上传 */
  resumeUrl: string | null;
  /** 岗位 JD 笔记文本；null 表示暂无 */
  jdNotes: string | null;
}

/** 子日历（带独立主题色） */
export interface SubCalendar {
  id: string;
  name: string;
  color: string;
  description: string;
}

/** 面试 / 笔试日程。所有时间点一律以 UTC ISO 8601 字符串存储，另存所在地 IANA 时区。 */
export interface Interview {
  id: string;
  company: string;
  position: string;
  /** 开始时间，UTC ISO 8601（如 "2025-12-16T15:00:00.000Z"） */
  startUtc: string;
  /** 结束时间，UTC ISO 8601 */
  endUtc: string;
  /** 面试所在地 IANA 时区名（如 America/New_York），由 Intl.DateTimeFormat 的 timeZone 选项负责夏令时转换 */
  sourceTimeZone: string;
  importance: ImportanceLevel;
  type: InterviewType;
  status: InterviewStatus;
  subCalendarId: string;
  prep: PrepInfo;
  /** Google Calendar 远端事件 id（已推送时存在），用于后续更新/删除而非重复创建 */
  externalEventId?: string | null;
}

/** 新建/编辑面试的表单草稿（墙上时间；提交时由 store 转为 UTC ISO 存储，禁止直接存本地时间字符串） */
export interface InterviewDraft {
  company: string;
  position: string;
  type: InterviewType;
  importance: ImportanceLevel;
  subCalendarId: string;
  /** yyyy-mm-dd，面试所在地时区的墙上日期 */
  startDate: string;
  /** HH:mm，面试所在地时区的墙上时间 */
  startTime: string;
  sourceTimeZone: string;
  durationMinutes: number;
  /** 可空串 → null */
  meetingUrl: string;
  /** 可空串 → null */
  jdNotes: string;
}

/** 编辑面试时的局部更新 */
export interface InterviewUpdatePatch {
  company?: string;
  position?: string;
  status?: InterviewStatus;
  type?: InterviewType;
  importance?: ImportanceLevel;
  subCalendarId?: string;
  startUtc?: string;
  endUtc?: string;
  sourceTimeZone?: string;
  meetingUrl?: string | null;
  jdNotes?: string | null;
  externalEventId?: string | null;
}
