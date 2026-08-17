"use client";

import confetti from "canvas-confetti";

/** 震动反馈：先做特性检测再调用。iOS Safari 不支持 navigator.vibrate，检测失败时静默降级（无任何报错），由视觉反馈兜底。 */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

/** 撒花庆祝：颜色取自当前主题 CSS 变量；reduced-motion 时跳过 */
export function celebrateWithConfetti(reducedMotion: boolean): void {
  if (reducedMotion || typeof document === "undefined") return;
  const css = getComputedStyle(document.documentElement);
  void confetti({
    particleCount: 140,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.55 },
    colors: [
      css.getPropertyValue("--color-accent").trim(),
      css.getPropertyValue("--color-primary").trim(),
      css.getPropertyValue("--color-card").trim(),
    ],
    zIndex: 9999,
    disableForReducedMotion: true,
  });
}
