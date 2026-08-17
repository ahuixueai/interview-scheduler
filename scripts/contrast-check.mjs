#!/usr/bin/env node
/**
 * WCAG 对比度实测：解析 app/globals.css 中 :root 与 [data-theme="dark"] 的 --color-* token，
 * 计算关键文字（目标 ≥4.5:1，正文）与 UI 组件（目标 ≥3:1，非文字）的对比度并输出实测数值。
 * 用法：node scripts/contrast-check.mjs
 */
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function extractTokens(block) {
  const tokens = {};
  for (const m of block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const hi = l1 >= l2 ? l1 : l2;
  const lo = l1 >= l2 ? l2 : l1;
  return (hi + 0.05) / (lo + 0.05);
}

/** bg 上叠加 alpha 比例的前景色（模拟 bg-primary/15 这类半透明底） */
function blend(fgHex, bgHex, alpha) {
  const f = hexToRgb(fgHex);
  const b = hexToRgb(bgHex);
  const out = f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const rootMatch = css.match(/:root\s*\{[^}]*\}|@theme\s*\{[^}]*\}/);
const darkMatch = css.match(/\[data-theme="dark"\]\s*\{[^}]*\}/);
const light = extractTokens(rootMatch?.[0] ?? "");
const dark = extractTokens(darkMatch?.[0] ?? "");

const TEXT_PAIRS = [
  ["ink", "card"],
  ["ink", "surface"],
  ["ink-secondary", "card"],
  ["ink-secondary", "surface"],
  ["ink-tertiary", "card"],
  ["ink-tertiary", "surface"],
  ["success", "success-tint"],
  ["danger", "card"],
  ["on-accent", "accent"],
  ["on-accent", "primary"],
  ["ink-secondary", "primary-tint"],
];
const UI_PAIRS = [
  ["border-strong", "card"],
  ["border-strong", "surface"],
  ["focus", "card"],
  ["focus", "surface"],
  ["primary-strong", "card"],
  ["primary-strong", "surface"],
];

let failures = 0;
const themes = [
  ["light", light],
  ["dark", dark],
];
for (const [name, tokens] of themes) {
  console.log("\n=== " + name + " 主题 ===");
  const tint = {
    "success-tint": blend(tokens["success"], tokens["card"], 0.15),
    "primary-tint": blend(tokens["primary"], tokens["card"], 0.15),
  };
  for (const [fg, bg] of TEXT_PAIRS) {
    const value = ratio(tokens[fg], tint[bg] ?? tokens[bg]);
    const ok = value >= 4.5;
    if (!ok) failures++;
    console.log("  " + (ok ? "PASS" : "FAIL") + "  " + fg + " / " + bg + ": " + value.toFixed(2) + ":1");
  }
  for (const [fg, bg] of UI_PAIRS) {
    const value = ratio(tokens[fg], tint[bg] ?? tokens[bg]);
    const ok = value >= 3;
    if (!ok) failures++;
    console.log("  " + (ok ? "PASS" : "FAIL") + "  " + fg + " / " + bg + ": " + value.toFixed(2) + ":1 (UI ≥3)");
  }
}

console.log("\n结果：" + (failures === 0 ? "全部达标" : failures + " 项不达标"));
process.exit(failures === 0 ? 0 : 1);
