"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import type { Interview } from "@/types";
import { useNow } from "@/lib/useNow";
import { PinkNoiseEngine } from "@/lib/pinkNoise";
import { formatDateInTimeZone, formatTimeInTimeZone, getTimeZoneAbbr } from "@/lib/time";
import BreathingGlow from "./BreathingGlow";
import ScaleButton from "./ScaleButton";

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

interface FocusModeProps {
  interview: Interview;
  onClose: () => void;
}

/** 沉浸式专注模式：全屏倒计时 + 呼吸灯光 + 白噪音（Web Audio 实时合成）；Esc 退出，焦点归还触发按钮 */
export default function FocusMode({ interview, onClose }: FocusModeProps) {
  const now = useNow(1000);
  const engineRef = useRef<PinkNoiseEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new PinkNoiseEngine();
  const engine = engineRef.current;
  const [noiseOn, setNoiseOn] = useState(false);
  const [volume, setVolume] = useState(0.35);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // e2e 调试桥：暴露引擎状态供无头浏览器断言（运行中 / AudioContext 已 close）
    const w = window as Window & {
      __PINK_NOISE__?: { state: () => string; volume: () => number };
      __PINK_NOISE_LAST__?: { state: string; volume: number };
    };
    w.__PINK_NOISE__ = { state: () => engine.state, volume: () => engine.getVolume() };
    return () => {
      document.body.style.overflow = previousOverflow;
      engine.close();
      w.__PINK_NOISE_LAST__ = { state: engine.state, volume: engine.getVolume() };
      if (w.__PINK_NOISE__) delete w.__PINK_NOISE__;
    };
  }, [engine]);

  const toggleNoise = () => {
    if (noiseOn) {
      engine.close();
      setNoiseOn(false);
    } else {
      engine.start();
      setNoiseOn(true);
    }
  };

  const handleVolume = (raw: string) => {
    const value = Number(raw);
    setVolume(value);
    engine.setVolume(value);
  };

  const remainingMs = now === null ? null : Date.parse(interview.startUtc) - now;
  const started = remainingMs !== null && remainingMs <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${interview.company} 专注模式`}
    >
      <BreathingGlow />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <p className="text-xs font-medium tracking-widest text-ink-tertiary">沉浸式专注 · 在线测评</p>
        <h2 className="mt-2 text-xl font-bold text-ink">
          {interview.company} · {interview.position}
        </h2>
        <p className="mt-8 text-sm text-ink-secondary">
          {started ? "已开始，稳住节奏，逐题推进。" : "距开始还有"}
        </p>
        <p className="mt-2 text-5xl font-bold tabular-nums text-ink">
          {remainingMs === null ? "--:--:--" : formatCountdown(remainingMs)}
        </p>
        <p className="mt-3 text-xs tabular-nums text-ink-tertiary">
          {formatDateInTimeZone(interview.startUtc, interview.sourceTimeZone)} ·{" "}
          {formatTimeInTimeZone(interview.startUtc, interview.sourceTimeZone)} ·{" "}
          {getTimeZoneAbbr(interview.startUtc, interview.sourceTimeZone)}
        </p>

        <div className="mt-10 flex items-center gap-3 rounded-full bg-card px-5 py-3 shadow-card">
          <ScaleButton
            onClick={toggleNoise}
            ariaLabel={noiseOn ? "关闭白噪音" : "开启白噪音"}
            className={noiseOn ? "bg-primary/20 text-ink-secondary" : "bg-ink/5 text-ink-secondary"}
          >
            {noiseOn ? <Volume2 size={14} aria-hidden /> : <VolumeX size={14} aria-hidden />}
            白噪音{noiseOn ? "开" : "关"}
          </ScaleButton>
          <label className="flex items-center gap-2 text-xs text-ink-tertiary">
            音量
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => handleVolume(e.target.value)}
              aria-label="白噪音音量"
              className="w-24"
              style={{ accentColor: "var(--color-primary)" }}
            />
          </label>
        </div>

        <div className="mt-10">
          <ScaleButton
            onClick={onClose}
            ariaLabel="退出专注模式"
            className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
          >
            <X size={14} aria-hidden />
            退出专注
          </ScaleButton>
        </div>
        <p className="mt-4 text-[11px] text-ink-tertiary">按 Esc 退出 · 退出后自动停止白噪音</p>
      </div>
    </div>
  );
}
