export type ThemeName = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export const THEME_LABELS: Record<ThemeName, string> = {
  light: "清醒蓝黄",
  dark: "暗黑极客",
};

/** 主题色板：与 globals.css 中的 CSS 变量一一对应 */
export interface ThemeColors {
  primary: string;
  surface: string;
  card: string;
  accent: string;
  onAccent: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  success: string;
  border: string;
}

/**
 * 预留接口：应用自定义主题色板。
 * TODO(下一轮)：实现取色逻辑——将 colors 写入 CSS 变量并持久化。
 */
export function applyCustomTheme(colors: ThemeColors): void {
  void colors;
}
