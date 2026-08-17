"use client";

import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import ScaleButton from "./ScaleButton";

/** 订阅日历区块：复制私有订阅链接 + 重置 + 手机订阅指引（SyncSettingsDialog 内使用） */
export default function CalendarFeedSection({ active }: { active: boolean }) {
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!active) return;
    setError(null);
    void fetch("/api/calendar/feed-info")
      .then((res) => res.json())
      .then((data: { url?: string; error?: string }) => {
        if (data.url) setFeedUrl(data.url);
        else setError(data.error ?? "获取订阅链接失败");
      })
      .catch(() => setError("网络异常，请重试"));
  }, [active]);

  const copy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
    } catch {
      // 剪贴板不可用时降级：选中文本手动复制
      const input = document.createElement("input");
      input.value = feedUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const reset = async () => {
    setError(null);
    try {
      const res = await fetch("/api/calendar/feed-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) setFeedUrl(data.url);
      else setError(data.error ?? "重置失败");
    } catch {
      setError("网络异常，请重试");
    }
  };

  return (
    <div className="rounded-xl bg-surface/70 p-3.5">
      <p className="text-xs font-semibold text-ink-secondary">📱 手机日历订阅（推荐）</p>
      <p className="mt-1 text-[11px] leading-5 text-ink-tertiary">
        订阅一次，面试自动同步到手机自带日历，到点弹原生提醒（提前 1 天 / 1 小时）。
        <br />
        iPhone：设置 → 日历 → 账户 → 添加账户 → 其他 → 添加订阅日历，粘贴下面的链接。
        <br />
        安卓（华为/小米/三星等）：日历 App → 设置 → 添加日历 → 通过网址添加。
      </p>
      {feedUrl ? (
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-card/70 px-2.5 py-1.5 text-[11px] text-ink-secondary">
            {feedUrl}
          </code>
          <ScaleButton
            onClick={copy}
            ariaLabel="复制订阅链接"
            className={copied ? "bg-success/15 text-success" : "bg-ink/5 text-ink-secondary"}
          >
            {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
            {copied ? "已复制" : "复制"}
          </ScaleButton>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-ink-tertiary">正在生成你的订阅链接…</p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-ink-tertiary">链接等同于只读钥匙：泄露了可随时重置</p>
        <ScaleButton
          onClick={reset}
          ariaLabel="重置订阅链接"
          className="bg-ink/5 text-ink-tertiary"
        >
          <RefreshCw size={12} aria-hidden />
          重置链接
        </ScaleButton>
      </div>
      {error ? (
        <p className="mt-2 text-[11px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
