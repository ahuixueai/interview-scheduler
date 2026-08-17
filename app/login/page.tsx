"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion, motion } from "framer-motion";
import { CalendarCheck } from "lucide-react";
import { INPUT_CLASS } from "@/lib/ui";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion() ?? false;
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? { email, password, name } : { email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "操作失败，请重试");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("网络异常，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full rounded-card bg-card px-6 py-8 shadow-card"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
            <CalendarCheck size={22} className="text-primary-strong" aria-hidden />
          </span>
          <h1 className="text-lg font-bold text-ink">面试与笔试日程</h1>
          <p className="text-xs text-ink-tertiary">
            任意邮箱可注册：QQ / 163 / Outlook / Gmail 等
          </p>
        </div>

        <div className="mt-6 flex rounded-full bg-surface p-1" role="tablist" aria-label="登录或注册">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              aria-label={m === "login" ? "切换到登录" : "切换到注册"}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
                mode === m ? "bg-card text-ink shadow-sm" : "text-ink-tertiary"
              }`}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mode === "register" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-ink-tertiary">昵称（可选）</span>
              <input
                className={INPUT_CLASS}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="怎么称呼你"
                aria-label="昵称"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-tertiary">邮箱</span>
            <input
              className={INPUT_CLASS}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="邮箱"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-tertiary">密码（至少 8 位）</span>
            <input
              className={INPUT_CLASS}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-label="密码"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error ? (
            <p className="text-xs font-medium text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            aria-label={mode === "login" ? "登录" : "注册并登录"}
            className="mt-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "请稍候…" : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
