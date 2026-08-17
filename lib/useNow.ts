"use client";

import { useEffect, useState } from "react";

/**
 * 全站唯一时间源（SSR 时间锚点机制，第一阶段 InterviewList 内联实现提取而来）。
 * - 首帧返回 null（SSR 与客户端首帧一致，避免 hydration mismatch）；
 * - 全局只注册一个 1s interval（惰性启动），各组件按自己的 intervalMs 粒度「分桶」订阅，
 *   只有跨过自己粒度的时刻才会触发重渲染（如 60s 粒度每分钟最多重渲染一次）；
 * - 所有「距开始时间」类判断（优先级、备战胶囊、专注倒计时、文案模块）一律复用本 hook。
 */
const TICK_MS = 1000;

let tickerStarted = false;
const tickListeners = new Set<() => void>();

function ensureTicker(): void {
  if (tickerStarted || typeof window === "undefined") return;
  tickerStarted = true;
  // e2e/性能探针用：证明全站只有一个时钟实例
  (window as Window & { __NOW_TICKERS__?: number }).__NOW_TICKERS__ = 1;
  window.setInterval(() => {
    for (const listener of tickListeners) listener();
  }, TICK_MS);
}

function subscribeTick(listener: () => void): () => void {
  ensureTicker();
  tickListeners.add(listener);
  return () => {
    tickListeners.delete(listener);
  };
}

export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (intervalMs <= 0) return;
    let prevBucket = Math.floor(Date.now() / intervalMs);
    const unsubscribe = subscribeTick(() => {
      const bucket = Math.floor(Date.now() / intervalMs);
      if (bucket !== prevBucket) {
        prevBucket = bucket;
        setNow(Date.now());
      }
    });
    return unsubscribe;
  }, [intervalMs]);

  return now;
}
