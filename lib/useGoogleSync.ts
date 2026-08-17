"use client";

import { useEffect, useState } from "react";
import {
  authorizeWithGoogle,
  disconnectGoogleCalendar,
  getConfiguredClientId,
  saveClientId,
} from "@/lib/integrations/google-auth";
import { pullGoogleEventsSince, type RemoteCalendarEvent } from "@/lib/integrations/google-calendar";

/** 日历同步的运行时状态与操作（从 SyncSettingsDialog 抽出） */
export function useGoogleSync(active: boolean) {
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remoteEvents, setRemoteEvents] = useState<RemoteCalendarEvent[]>([]);

  // 每次打开重置瞬时状态（busy 卡死等跨次残留）
  useEffect(() => {
    if (active) {
      setClientId(getConfiguredClientId());
      setBusy(false);
      setStatus(null);
    }
  }, [active]);

  const saveId = () => {
    saveClientId(clientId.trim());
    setStatus("Client ID 已保存。请点击「连接 Google 账号」完成授权。");
  };

  const connect = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await authorizeWithGoogle();
      setStatus("已连接 ✅ 现在可以把面试推送到你的 Google 日历。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "连接失败");
    } finally {
      setBusy(false);
    }
  };

  const pull = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
      const events = await pullGoogleEventsSince(since);
      setRemoteEvents(events);
      setStatus(events.length === 0 ? "近两周没有查到远端事件。" : `查到 ${events.length} 条远端事件，可导入。`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "拉取失败");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    disconnectGoogleCalendar();
    setStatus("已断开连接。");
  };

  const removeEvent = (id: string) =>
    setRemoteEvents((prev) => prev.filter((event) => event.id !== id));

  const setStatusNote = (note: string) => setStatus(note);

  return {
    clientId,
    setClientId,
    status,
    busy,
    remoteEvents,
    removeEvent,
    setStatusNote,
    saveId,
    connect,
    pull,
    disconnect,
  };
}
