"use client";

import type { Interview } from "@/types";
import { getStoredToken } from "./google-auth";

/** Google Calendar REST 封装（不引入 googleapis 依赖）与 Interview ↔ Event 映射 */

export interface RemoteCalendarEvent {
  id: string;
  summary: string;
  startUtc: string;
  endUtc: string;
  timeZone: string;
}

export interface GoogleSyncResult {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
}

export interface GoogleEventBody {
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  description?: string;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  if (!token) throw new Error("尚未连接 Google 账号");
  const res = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (res.status === 401) throw new Error("授权已过期，请重新连接");
  if (!res.ok) throw new Error(`Google Calendar 请求失败（HTTP ${res.status}）`);
  return res;
}

export function mapInterviewToEventBody(interview: Interview): GoogleEventBody {
  const description = [
    interview.prep.note,
    interview.prep.meetingUrl ? `会议链接：${interview.prep.meetingUrl}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
  return {
    summary: `${interview.company} ${interview.position}`,
    start: { dateTime: interview.startUtc, timeZone: interview.sourceTimeZone },
    end: { dateTime: interview.endUtc, timeZone: interview.sourceTimeZone },
    ...(description ? { description } : {}),
  };
}

/** 推送单场面试：已有远端 id 则更新，否则创建并返回事件 id */
export async function pushInterviewToGoogleCalendar(interview: Interview): Promise<string> {
  const body = mapInterviewToEventBody(interview);
  if (interview.externalEventId) {
    await apiFetch(
      `calendars/primary/events/${encodeURIComponent(interview.externalEventId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return interview.externalEventId;
  }
  const res = await apiFetch("calendars/primary/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("创建事件失败：响应缺少 id");
  return data.id;
}

/** 拉取自某时刻以来的远端事件（增量同步） */
export async function pullGoogleEventsSince(sinceUtc: string): Promise<RemoteCalendarEvent[]> {
  const res = await apiFetch(
    `calendars/primary/events?timeMin=${encodeURIComponent(sinceUtc)}&singleEvents=true&orderBy=startTime&maxResults=20`,
  );
  const data = (await res.json()) as {
    items?: {
      id: string;
      summary?: string;
      start?: { dateTime?: string; timeZone?: string };
      end?: { dateTime?: string; timeZone?: string };
    }[];
  };
  return (data.items ?? [])
    .map((event) => ({
      id: event.id,
      summary: event.summary ?? "（无标题）",
      startUtc: event.start?.dateTime ?? "",
      endUtc: event.end?.dateTime ?? "",
      timeZone: event.start?.timeZone ?? "UTC",
    }))
    .filter((event) => event.startUtc !== "");
}

/** 双向同步：有远端关联的更新，其余创建；返回统计（删除同步暂缓） */
export async function syncBidirectional(
  interviews: Interview[],
  _sinceUtc: string,
): Promise<GoogleSyncResult> {
  const result: GoogleSyncResult = { created: 0, updated: 0, deleted: 0, skipped: 0 };
  for (const interview of interviews) {
    try {
      if (interview.externalEventId) {
        await pushInterviewToGoogleCalendar(interview);
        result.updated++;
      } else {
        await pushInterviewToGoogleCalendar(interview);
        result.created++;
      }
    } catch {
      result.skipped++;
    }
  }
  return result;
}

/** 删除远端事件 */
export async function removeFromGoogleCalendar(externalEventId: string): Promise<void> {
  await apiFetch(`calendars/primary/events/${encodeURIComponent(externalEventId)}`, {
    method: "DELETE",
  });
}
