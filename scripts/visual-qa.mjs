/**
 * 程序化视觉 QA：代替人眼做布局/配色基础审查（无头浏览器 + 几何与计算样式断言）。
 * 覆盖：主题 token 生效、横向溢出、卡片重叠、按钮可点击尺寸、专注遮罩覆盖、对话框居中、倒计时格式。
 * 用法：node scripts/visual-qa.mjs [BASE_URL]
 */
import puppeteer from "puppeteer-core";

const BASE_URL = process.env.E2E_BASE_URL || process.argv[2] || "http://localhost:3100";
const CHROME_PATH =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const failures = [];
function check(name, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--no-first-run", "--password-store=basic"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1400 });

async function layoutAudit() {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const cards = Array.from(document.querySelectorAll("ul li")).map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    });
    const overlaps = [];
    for (let i = 0; i + 1 < cards.length; i++) {
      const gap = cards[i + 1].top - cards[i].bottom;
      if (gap < 8) overlaps.push(`卡${i + 1}-卡${i + 2} gap=${Math.round(gap)}`);
    }
    const wideButtons = Array.from(document.querySelectorAll("button:not([disabled])"))
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return r.height > 0 && r.height < 24;
      })
      .map((b) => b.getAttribute("aria-label") ?? "(无标签)");
    const overflowers = [];
    for (const el of Array.from(document.querySelectorAll("main *"))) {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1) overflowers.push(el.tagName + "." + el.className?.toString().slice(0, 40));
    }
    // 卡片底部操作提示：按钮过多时曾被挤成竖排（宽度 <120px 视为挤压）
    const hint = Array.from(document.querySelectorAll("p")).find((p) =>
      (p.textContent ?? "").includes("左右滑动改状态"),
    );
    const hintWidth = hint ? Math.round(hint.getBoundingClientRect().width) : -1;
    const theme = () => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--color-surface)";
      document.body.appendChild(probe);
      const surface = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return {
        surface,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        cardBg: getComputedStyle(document.querySelector(".shadow-card")).backgroundColor,
        ink: getComputedStyle(document.querySelector("h3")).color,
      };
    };
    return {
      scrollWidth: document.documentElement.scrollWidth,
      vw,
      overlaps,
      wideButtons,
      overflowers,
      hintWidth,
      theme: theme(),
    };
  });
}

// 浅色
await page.goto(BASE_URL, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2500));
const light = await layoutAudit();
check("浅色：无横向溢出", light.scrollWidth <= light.vw + 1, `scrollWidth=${light.scrollWidth}`);
check("浅色：卡片无重叠（间距 ≥8px）", light.overlaps.length === 0, light.overlaps.join("; "));
check("浅色：所有可见按钮高度 ≥24px", light.wideButtons.length === 0, light.wideButtons.join(", "));
check("浅色：无元素超出视口", light.overflowers.length === 0, light.overflowers.join("; "));
check("浅色：操作提示未被挤成竖排（宽度 ≥120px）", light.hintWidth >= 120, `hintWidth=${light.hintWidth}`);
check("浅色：body 背景 = surface token", light.theme.bodyBg === light.theme.surface, light.theme.bodyBg);
check("浅色：卡片背景 = card token", light.theme.cardBg === "rgb(255, 255, 255)", light.theme.cardBg);
check("浅色：标题颜色 = ink token", light.theme.ink === "rgb(26, 38, 52)", light.theme.ink);

// 暗色
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
await new Promise((r) => setTimeout(r, 400));
const dark = await layoutAudit();
check("暗色：body 背景切换为暗色", dark.theme.bodyBg === "rgb(11, 18, 32)", dark.theme.bodyBg);
check("暗色：卡片背景切换", dark.theme.cardBg === "rgb(20, 30, 48)", dark.theme.cardBg);
check("暗色：标题颜色切换为浅色 ink", dark.theme.ink === "rgb(232, 238, 247)", dark.theme.ink);
check("浅/暗背景确有差异", light.theme.bodyBg !== dark.theme.bodyBg);
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
await new Promise((r) => setTimeout(r, 400));

// 专注模式：遮罩覆盖视口、倒计时格式
await page.click("button[aria-label='进入 腾讯 的专注模式']");
await new Promise((r) => setTimeout(r, 1000));
const focus = await page.evaluate(() => {
  const overlay = document.querySelector("[role='dialog']");
  const r = overlay?.getBoundingClientRect();
  const body = document.body.innerText;
  return {
    covers: r ? Math.abs(r.left) < 2 && Math.abs(r.top) < 2 && Math.abs(r.width - window.innerWidth) < 2 && Math.abs(r.height - window.innerHeight) < 2 : false,
    countdownOk: /\d{2}:\d{2}:\d{2}/.test(body),
    hasControls: body.includes("白噪音") && body.includes("退出专注"),
  };
});
check("专注模式：遮罩覆盖整个视口", focus.covers);
check("专注模式：倒计时格式 HH:MM:SS", focus.countdownOk);
check("专注模式：白噪音与退出控件存在", focus.hasControls);
await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 600));

// 子日历管理：对话框在视口内、焦点进入对话框
await page.click("button[aria-label='管理子日历']");
await new Promise((r) => setTimeout(r, 600));
const manager = await page.evaluate(() => {
  const dialog = document.querySelector("[role='dialog'][aria-label='管理子日历']");
  const r = dialog?.getBoundingClientRect();
  const active = document.activeElement;
  return {
    inViewport: r ? r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight : false,
    focusInside: dialog?.contains(active) ?? false,
  };
});
check("子日历管理：对话框完全在视口内", manager.inViewport);
check("子日历管理：打开后焦点在对话框内", manager.focusInside);
await page.evaluate(() => document.querySelector("[aria-label='关闭子日历管理']")?.click());
await new Promise((r) => setTimeout(r, 400));
const focusReturned = await page.evaluate(
  () => document.activeElement?.getAttribute("aria-label") === "管理子日历",
);
check("子日历管理：关闭后焦点归还触发按钮", focusReturned);

await browser.close();
console.log(`
${failures.length === 0 ? "ALL PASS" : failures.length + " FAILED"}`);
process.exit(failures.length === 0 ? 0 : 1);
