const puppeteer = require("puppeteer-core");

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3100";
const CHROME_PATH =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeReporter() {
  const failures = [];
  return {
    failures,
    check(name, ok, detail = "") {
      console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
      if (!ok) failures.push(name);
    },
    finish() {
      console.log(`
${this.failures.length === 0 ? "ALL PASS" : `${this.failures.length} FAILED`}`);
      return this.failures.length === 0;
    },
  };
}

function collectConsole(page) {
  const msgs = [];
  page.on("console", (m) => msgs.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => msgs.push(`PAGEERROR: ${e.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400) msgs.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  return msgs;
}

/** 过滤第三方噪音：React DevTools 提示、framer-motion 在 reduced-motion 下的 dev-only 提示 */
function filterNoise(msgs, extraAllow = []) {
  const allowed = ["Download the React DevTools", ...extraAllow];
  return msgs.filter((m) => !allowed.some((a) => m.includes(a)));
}

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--no-first-run",
      "--password-store=basic",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
}

async function openPage(browser, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1100 });
  if (opts.colorScheme) {
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: opts.colorScheme }]);
  }
  if (opts.reducedMotion) {
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  }
  const msgs = collectConsole(page);
  await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(2000);
  return { page, msgs };
}

async function cardBoxes(page) {
  return page.$$eval("ul li", (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
}

/** 带状态校验的点击重试：layout 弹簧动画期间按钮会位移，单次点击可能落空 */
async function clickUntil(page, selector, isDone, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    const handles = await page.$$(selector);
    if (handles.length > 0) await handles[0].click();
    await sleep(700);
    if (await isDone()) return true;
  }
  return false;
}

/** 把第 index 张卡滚到视口中央（胶囊展开后卡片很高，可能把后面的卡挤出视口） */
async function scrollToCard(page, index) {
  await page.$$eval("ul li", (els, i) => els[i]?.scrollIntoView({ block: "center" }), index);
  await sleep(300);
}

/** 取全部卡片的公司名顺序；折叠卡（已挂）没有 h3，按 li 文本识别兼容所有状态 */
async function cardOrder(page) {
  return page.$$eval("ul li", (els) =>
    els.map((el) => {
      const t = el.textContent || "";
      if (t.includes("字节跳动")) return "字节跳动";
      if (t.includes("美团")) return "美团";
      if (t.includes("Airbnb")) return "Airbnb";
      if (t.includes("腾讯")) return "腾讯";
      return "?";
    }),
  );
}

async function swipeLeftByMouse(page, box) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(cx - i * 65, cy, { steps: 3 });
    await sleep(25);
  }
  await page.mouse.up();
}

async function swipeRightByMouse(page, box) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(cx + i * 65, cy, { steps: 3 });
    await sleep(25);
  }
  await page.mouse.up();
}

async function swipeLeftByTouch(page, box) {
  const client = await page.createCDPSession();
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] });
  for (let i = 1; i <= 8; i++) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: cx - i * 65, y: cy }],
    });
    await sleep(25);
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** 垂直拖拽 distancePx 像素（默认 330，高卡片邻居时可传更大值） */
async function dragVertically(page, box, distancePx = 330) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const steps = Math.max(4, Math.ceil(distancePx / 55));
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx, cy - i * (distancePx / steps), { steps: 3 });
    await sleep(25);
  }
  await page.mouse.up();
}

/** 以原生 value setter + input 事件驱动 React 受控 range/input */
async function setReactInputValue(page, selector, value) {
  await page.$eval(selector, (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

module.exports = {
  BASE_URL,
  sleep,
  makeReporter,
  collectConsole,
  filterNoise,
  launchBrowser,
  openPage,
  cardBoxes,
  scrollToCard,
  clickUntil,
  cardOrder,
  swipeLeftByMouse,
  swipeRightByMouse,
  swipeLeftByTouch,
  dragVertically,
  setReactInputValue,
};
