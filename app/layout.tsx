import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Toasts from "@/components/Toasts";

export const metadata: Metadata = {
  title: "面试与笔试日程管理",
  description: "面试与笔试日程管理 Web App 原型：主题切换、备战胶囊、专注模式、子日历管理。",
};

/**
 * FOUC 防护：在 hydration 前设置 data-theme（首次按 prefers-color-scheme，之后按显式选择）。
 * 脚本在首帧绘制前执行，避免浅色闪一下再切暗色；异常时静默降级为 light。
 */
const themeInitScript = `(function(){try{var t=window.localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // suppressHydrationWarning：内联脚本会在 hydration 前给 <html> 写入 data-theme，React 无需校验该属性
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-surface font-sans text-ink antialiased">
        {/* 普通内联 <script>（而非 next/script）：确保在 HTML 解析期、首帧绘制前同步执行，
            next/script 的 beforeInteractive 会被包进 RSC payload，要等 hydration 后才运行，无法防 FOUC */}
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          {children}
          <Toasts />
        </ThemeProvider>
      </body>
    </html>
  );
}
