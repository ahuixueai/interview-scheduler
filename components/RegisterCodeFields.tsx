"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { INPUT_CLASS } from "@/lib/ui";
import ScaleButton from "./ScaleButton";
import PuzzleCaptcha from "./PuzzleCaptcha";

interface RegisterCodeFieldsProps {
  email: string;
  code: string;
  onCodeChange: (value: string) => void;
  onSendError: (message: string) => void;
}

interface PuzzleChallenge {
  token: string;
  imageUrl: string;
}

interface SendResponse {
  status?: "sent" | "registered";
  error?: string;
  message?: string;
  cooldownMs?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 注册验证码行：获取验证码（先拼图）→ 60 秒倒计时 → 6 位码输入 */
export default function RegisterCodeFields({
  email,
  code,
  onCodeChange,
  onSendError,
}: RegisterCodeFieldsProps) {
  const [puzzle, setPuzzle] = useState<PuzzleChallenge | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldownLeft(seconds);
    timerRef.current = setInterval(() => {
      setCooldownLeft((left) => {
        if (left <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return left - 1;
      });
    }, 1000);
  };

  const handleSend = async () => {
    onSendError("");
    setSentMsg(null);
    if (!EMAIL_RE.test(email.trim())) {
      onSendError("请先填写正确的邮箱");
      return;
    }
    setSending(true);
    try {
      const challengeRes = await fetch("/api/verification/puzzle", { method: "POST" });
      if (!challengeRes.ok) throw new Error("验证加载失败");
      const challenge = (await challengeRes.json()) as PuzzleChallenge;
      setPuzzle(challenge);
    } catch {
      onSendError("网络异常，请重试");
    } finally {
      setSending(false);
    }
  };

  const handlePuzzleSuccess = async (token: string, offset: number) => {
    setSending(true);
    try {
      const res = await fetch("/api/verification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), puzzleToken: token, puzzleOffset: offset }),
      });
      const data = (await res.json().catch(() => ({}))) as SendResponse;
      setPuzzle(null);
      if (!res.ok) {
        onSendError(data.error ?? "验证码发送失败，请重试");
        return;
      }
      if (data.status === "registered") {
        onSendError(data.message ?? "该邮箱已注册，请直接登录");
        return;
      }
      setSentMsg("验证码已发送，10 分钟内有效（留意垃圾箱）");
      startCooldown(Math.round((data.cooldownMs ?? 60_000) / 1000));
    } catch {
      setPuzzle(null);
      onSendError("网络异常，请重试");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-ink-tertiary">验证码</span>
        <span className="flex gap-2">
          <input
            className={INPUT_CLASS + " flex-1 tracking-[0.4em]"}
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6 位数字"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="验证码"
          />
          <ScaleButton
            onClick={() => void handleSend()}
            disabled={cooldownLeft > 0 || sending}
            ariaLabel="获取验证码"
            className="shrink-0 bg-primary/15 text-primary-strong hover:bg-primary/25 disabled:opacity-60"
          >
            {cooldownLeft > 0 ? cooldownLeft + "s" : "获取验证码"}
          </ScaleButton>
        </span>
        {sentMsg ? <span className="text-[11px] text-success">{sentMsg}</span> : null}
      </label>

      {puzzle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setPuzzle(null)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="拖动滑块完成拼图"
            className="relative z-10 flex w-full max-w-[360px] flex-col gap-3 rounded-card bg-card p-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">人机验证</h2>
              <ScaleButton
                onClick={() => setPuzzle(null)}
                ariaLabel="关闭拼图验证"
                className="bg-transparent p-1 text-ink-tertiary hover:bg-ink/5 hover:text-ink-secondary"
              >
                <X size={15} aria-hidden />
              </ScaleButton>
            </div>
            <PuzzleCaptcha
              key={puzzle.token}
              token={puzzle.token}
              imageUrl={puzzle.imageUrl}
              onSuccess={(token, offset) => void handlePuzzleSuccess(token, offset)}
              onRefresh={async () => {
                try {
                  const res = await fetch("/api/verification/puzzle", { method: "POST" });
                  if (res.ok) setPuzzle((await res.json()) as PuzzleChallenge);
                } catch {
                  /* 保持现状，用户可以重试 */
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
