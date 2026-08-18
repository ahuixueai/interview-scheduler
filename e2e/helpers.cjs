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
  // 只把 error/warn 视为问题；info/log/verbose（Chrome 内部提示、HMR 日志）是环境噪音
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warn") msgs.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => msgs.push(`PAGEERROR: ${e.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400) msgs.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  return msgs;
}

/** 轮询等待条件成立（抛错带标签） */
async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await fn()) return true;
    } catch {
      /* 继续等 */
    }
    await sleep(150);
  }
  throw new Error("waitFor 超时: " + (label || "条件未满足"));
}

/** 解出拼图 token 里的正确拖动距离（base64url 负载） */
function decodePuzzleToken(token) {
  const body = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
  const padded = body + "=".repeat((4 - (body.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

/** 完整走一遍注册人机验证：点获取验证码 → 拖拼图对齐缺口 → 等验证码发送响应 */
async function solvePuzzleOnPage(page) {
  let challenge = null;
  const onChallenge = (res) => {
    if (res.url().includes("/api/verification/puzzle") && res.request().method() === "POST") {
      res.json().then((j) => (challenge = j)).catch(() => {});
    }
  };
  page.on("response", onChallenge);
  await page.click("button[aria-label='获取验证码']");
  await waitFor(() => challenge !== null, 10000, "拼图谜题响应");
  page.off("response", onChallenge);

  const answer = decodePuzzleToken(challenge.token).x;
  const canvas = await page.$("canvas[aria-label*='拼图滑块']");
  if (!canvas) throw new Error("拼图画布未出现");
  const box = await canvas.boundingBox();
  // 滑块初始位置 (16, 57)、尺寸 46，画布 320×160 与 CSS 等大
  const startX = box.x + 16 + 23;
  const startY = box.y + 57 + 23;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + answer, startY, { steps: 24 });
  await sleep(150);
  await page.mouse.up();

  let sendResult = null;
  const onSend = (res) => {
    if (res.url().includes("/api/verification/send") && res.request().method() === "POST") {
      res.json().then((j) => (sendResult = j)).catch(() => {});
    }
  };
  page.on("response", onSend);
  await waitFor(() => sendResult !== null, 15000, "验证码发送响应");
  page.off("response", onSend);
  return sendResult;
}

/** 通过注册表单完成登录（注册需拼图滑块 + 邮箱验证码；开发环境验证码随响应返回） */
async function ensureLoggedIn(page, email, password) {
  await page.goto(BASE_URL + "/login", { waitUntil: "networkidle0" });
  await page.click("button[aria-label='切换到注册']");
  await page.type("input[aria-label='邮箱']", email);
  await page.type("input[aria-label='密码']", password);
  const send = await solvePuzzleOnPage(page);
  if (!send || send.status !== "sent" || !send.debugCode) {
    throw new Error("注册验证码发送失败: " + JSON.stringify(send));
  }
  await page.type("input[aria-label='验证码']", String(send.debugCode));
  await page.click("button[aria-label='注册并登录']");
  await page.waitForFunction(() => window.location.pathname === "/", { timeout: 20000 });
  await page.waitForSelector("ul li", { timeout: 20000 });
  await sleep(2500);
}

/** 过滤第三方噪音：React DevTools 提示、framer-motion 在 reduced-motion 下的 dev-only 提示 */
function filterNoise(msgs, extraAllow = []) {
  const allowed = ["Download the React DevTools", ...extraAllow];
  return msgs.filter((m) => !allowed.some((a) => m.includes(a)));
}

/** 清空本地验证码表，避免 e2e 反复运行触发 IP 频率限制；非本地环境静默跳过 */
function resetVerificationState() {
  try {
    require("node:child_process").execSync(
      'psql "postgresql://localhost:5432/interview_scheduler" -c "DELETE FROM email_verifications;"',
      { stdio: "ignore" },
    );
  } catch {
    /* 线上/无 psql 环境跳过 */
  }
}

async function launchBrowser() {
  resetVerificationState();
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
  ensureLoggedIn,
  solvePuzzleOnPage,
  decodePuzzleToken,
  waitFor,
  cardOrder,
  swipeLeftByMouse,
  swipeRightByMouse,
  swipeLeftByTouch,
  dragVertically,
  setReactInputValue,
};
