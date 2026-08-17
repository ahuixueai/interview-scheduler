"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import ScaleButton from "./ScaleButton";

/**
 * 标记完全静态（aria-label 不随主题变化，避免 SSR/客户端水合错配）；
 * 图标与 sr-only 的当前主题文案由 CSS 按 data-theme 决定显示哪一个。
 */
export default function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <ScaleButton
      onClick={toggleTheme}
      ariaLabel="切换主题"
      title="切换主题"
      className="bg-ink/5 text-ink-secondary hover:bg-ink/10"
    >
      <span className="sr-only theme-label-light">当前：清醒蓝黄</span>
      <span className="sr-only theme-label-dark">当前：暗黑极客</span>
      <Sun size={14} aria-hidden className="theme-icon-sun h-3.5 w-3.5" />
      <Moon size={14} aria-hidden className="theme-icon-moon h-3.5 w-3.5" />
    </ScaleButton>
  );
}
