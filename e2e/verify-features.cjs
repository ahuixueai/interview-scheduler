#!/usr/bin/env node
/**
 * E2E 第二阶段功能验证：
 * A 主题：首帧无 FOUC、跟随系统偏好、显式选择持久化
 * B 专注模式：全屏倒计时、白噪音播放/停止、AudioContext 退出即 close、Esc 退出并归还焦点、reduced-motion 可用
 * C 子日历：创建/编辑/删除、有关联面试时迁移确认、筛选持久化
 * D 文案模块：规则触发、开关持久化
 * 前置：dev server 已运行。用法：node e2e/verify-features.cjs
 */
const H = require("./helpers.cjs");
const { sleep } = H;

const INTENSE = [
  "这三天排得密，但每一场都只占用你一个具体的小时。",
  "排得满不等于要绷得紧。把今天的这一场讲清楚就够了。",
  "几场面试不是一座山，是几个排着队的房间，一个一个进。",
  "不用预演三天，只预演明天上午那场的前十五分钟。",
  "日程表看着热闹，身体只需要坐在下一场的位置上。",
  "紧张的反面不是放松，是具体。把下一件事具体到几点、哪个链接、第一句说什么。",
];

async function themePage(browser, colorScheme) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1100 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: colorScheme }]);
  const msgs = H.collectConsole(page);
  await page.goto(H.BASE_URL, { waitUntil: "networkidle0", timeout: 30000 });
  await sleep(1500);
  return { page, msgs };
}

const themeOf = (page) =>
  page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-theme"),
    bg: getComputedStyle(document.body).backgroundColor,
  }));

(async () => {
  const browser = await H.launchBrowser();
  const r = H.makeReporter();

  // ================= A. 主题系统 =================
  {
    // A1. 原始 HTML：内联初始化脚本位于正文内容之前（FOUC 防护的前提）
    const raw = await (await fetch(H.BASE_URL)).text();
    const scriptPos = raw.indexOf("data-theme");
    const mainPos = raw.indexOf("<main");
    r.check("FOUC 防护：内联脚本先于正文内容", scriptPos > 0 && scriptPos < mainPos);
    r.check("FOUC 防护：脚本含系统偏好回退", raw.includes("prefers-color-scheme"));

    // A2. 首次访问跟随系统偏好（暗色），首帧即正确（此时落在登录页，主题机制全局生效）
    const { page, msgs } = await themePage(browser, "dark");
    const first = await themeOf(page);
    r.check("首访跟随系统偏好：data-theme=dark", first.attr === "dark");
    r.check("首帧背景即为暗色", first.bg === "rgb(11, 18, 32)", first.bg);
    const stored0 = await page.evaluate(() => localStorage.getItem("theme"));
    r.check("首次访问不写入显式选择", stored0 === null);

    // 注册登录（同一会话，后续场景复用登录态）
    await H.ensureLoggedIn(page, `e2e-${Date.now()}@test.local`, "e2e-pass-123");

    // A3. 显式切到浅色并持久化（刷新后仍浅色，覆盖系统偏好）
    await page.click("button[aria-label='切换主题']");
    await sleep(500);
    const toggled = await themeOf(page);
    r.check("切换后 data-theme=light", toggled.attr === "light");
    r.check("切换后背景为浅色", toggled.bg === "rgb(242, 248, 253)", toggled.bg);
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(1500);
    const reloaded = await themeOf(page);
    r.check("刷新后保持浅色（显式选择优先于系统偏好）", reloaded.attr === "light");
    const stored1 = await page.evaluate(() => localStorage.getItem("theme"));
    r.check("localStorage 已持久化显式选择", stored1 === "light");

    // A4. 切回暗色再刷新
    await page.click("button[aria-label='切换主题']");
    await sleep(500);
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(1500);
    const back = await themeOf(page);
    r.check("切回暗色并刷新后保持", back.attr === "dark");
    r.check("主题场景 console 干净", H.filterNoise(msgs).length === 0, H.filterNoise(msgs).join(" | "));
    await page.close();
  }

  // ================= B. 沉浸式专注模式 =================
  {
    const { page, msgs } = await H.openPage(browser);
    // 白噪音必须由用户手势触发：先点击开关
    await page.click("button[aria-label='进入 腾讯 的专注模式']");
    await sleep(800);
    let h = await page.content();
    r.check("专注模式打开（全屏倒计时）", h.includes("距开始还有") && /\d{2}:\d{2}:\d{2}/.test(h));
    let noise = await page.evaluate(() =>
      window.__PINK_NOISE__ ? { state: window.__PINK_NOISE__.state(), volume: window.__PINK_NOISE__.volume() } : null,
    );
    r.check("未开启时引擎状态 closed", noise !== null && noise.state === "closed");

    await page.click("button[aria-label='开启白噪音']");
    await sleep(600);
    noise = await page.evaluate(() =>
      window.__PINK_NOISE__ ? { state: window.__PINK_NOISE__.state(), volume: window.__PINK_NOISE__.volume() } : null,
    );
    r.check("点击后白噪音运行（AudioContext running）", noise !== null && noise.state === "running", JSON.stringify(noise));

    // 音量滑块
    await H.setReactInputValue(page, "input[aria-label='白噪音音量']", "0.62");
    await sleep(300);
    noise = await page.evaluate(() =>
      window.__PINK_NOISE__ ? { state: window.__PINK_NOISE__.state(), volume: window.__PINK_NOISE__.volume() } : null,
    );
    r.check("音量滑块生效（≈0.62）", noise !== null && Math.abs(noise.volume - 0.62) < 0.01, JSON.stringify(noise));

    // Esc 退出：AudioContext close + 焦点归还触发按钮
    await page.keyboard.press("Escape");
    await sleep(900);
    h = await page.content();
    r.check("Esc 退出专注模式", !h.includes("距开始还有"));
    const last = await page.evaluate(() => window.__PINK_NOISE_LAST__ ?? null);
    r.check("退出后 AudioContext 已 close", last !== null && last.state === "closed", JSON.stringify(last));
    const focusBack = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    r.check("退出后焦点归还触发按钮", focusBack === "进入 腾讯 的专注模式", focusBack);
    r.check("专注模式场景 console 干净", H.filterNoise(msgs).length === 0, H.filterNoise(msgs).join(" | "));
    await page.close();

    // reduced-motion 下专注模式仍可用（呼吸动效关闭、倒计时保留）
    const { page: rPage, msgs: rMsgs } = await H.openPage(browser, { reducedMotion: true });
    await rPage.click("button[aria-label='进入 腾讯 的专注模式']");
    await sleep(800);
    const rh = await rPage.content();
    r.check("reduced-motion 下专注模式可用", rh.includes("距开始还有") && /\d{2}:\d{2}:\d{2}/.test(rh));
    r.check(
      "reduced-motion 下无额外警告",
      H.filterNoise(rMsgs, ["Reduced Motion enabled"]).length === 0,
    );
    await rPage.close();
  }

  // ================= C. 子日历管理 =================
  {
    const { page, msgs } = await H.openPage(browser);
    const initialOrderC = await H.cardOrder(page);

    // 筛选持久化（内置日历，先于内存态 CRUD 测试）
    await page.click("button[aria-label='只看 社招 - 产品方向']");
    await sleep(800);
    r.check("按子日历筛选", (await H.cardOrder(page)).join("|") === "腾讯");
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(2000);
    r.check("筛选状态刷新后保持", (await H.cardOrder(page)).join("|") === "腾讯");
    await page.click("button[aria-label='显示全部子日历']");
    await sleep(800);
    r.check("切回全部", (await H.cardOrder(page)).join("|") === initialOrderC.join("|"));

    // 创建 + 编辑（内存态，之后不再 reload）
    await page.click("button[aria-label='管理子日历']");
    await sleep(600);
    await page.type("input[aria-label='新子日历名称']", "测试日历");
    await page.click("button[aria-label='添加子日历']");
    await sleep(500);
    let h = await page.content();
    r.check("创建子日历", h.includes("测试日历"));
    await page.click("button[aria-label='编辑 测试日历']");
    await sleep(300);
    await H.setReactInputValue(page, "input[aria-label='日历名称']", "测试日历改");
    await page.click("button[aria-label='保存']");
    await sleep(500);
    h = await page.content();
    r.check("编辑子日历", h.includes("测试日历改</span>"));

    // 删除空日历：直接确认
    await page.click("button[aria-label='删除 测试日历改']");
    await sleep(400);
    h = await page.content();
    r.check("空日历删除提示（无面试）", h.includes("该日历下没有面试"));
    await page.click("button[aria-label='确认删除子日历']");
    await sleep(500);
    h = await page.content();
    r.check("空日历已删除", !h.includes("测试日历改"));

    // 删除有关联面试的日历：必须选择迁移或一并删除（迁移路径）
    await page.click("button[aria-label='删除 社招 - 产品方向']");
    await sleep(400);
    h = await page.content();
    r.check("有关联面试时出现处理方式确认", h.includes("该日历下还有 1 场面试") && h.includes("迁移到其他子日历"));
    await page.click("button[aria-label='确认删除子日历']");
    await sleep(600);
    h = await page.content();
    r.check("迁移后日历已删除", !h.includes("社招 - 产品方向"));
    await page.click("button[aria-label='关闭子日历管理']");
    await sleep(400);
    h = await page.content();
    r.check("腾讯面试已迁移到目标日历", h.includes("秋招 - 数据分析岗"));
    r.check("子日历场景 console 干净", H.filterNoise(msgs).length === 0, H.filterNoise(msgs).join(" | "));
    await page.close();
  }

  // ================= D. 动态文案模块 =================
  {
    const { page, msgs } = await H.openPage(browser);
    const bannerText = await page.evaluate((intense) => {
      const el = document.querySelector("p.flex-1");
      return el ? el.textContent ?? "" : "";
    }, INTENSE);
    r.check("文案命中密集档（未来 3 天 ≥2 场高优先级）", INTENSE.includes(bannerText), bannerText);

    await page.click("button[aria-label='关闭文案模块']");
    await sleep(400);
    let h = await page.content();
    r.check("关闭文案模块", h.includes("文案模块已关闭"));
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(2000);
    h = await page.content();
    r.check("关闭状态刷新后保持", h.includes("文案模块已关闭"));
    await page.click("button[aria-label='开启文案模块']");
    await sleep(400);
    h = await page.content();
    r.check("重新开启文案模块", h.includes("文案模块已关闭") === false);
    r.check("文案场景 console 干净", H.filterNoise(msgs).length === 0, H.filterNoise(msgs).join(" | "));
    await page.close();
  }

  // ================= E. 面试 CRUD 与持久化 =================
  {
    const { page, msgs } = await H.openPage(browser);

    // 新建
    await page.click("button[aria-label='新建面试']");
    await sleep(600);
    await page.type("input[aria-label='公司名称']", "测试公司");
    await page.type("input[aria-label='岗位名称']", "测试岗位");
    await H.setReactInputValue(page, "input[aria-label='面试日期']", "2026-09-05");
    await H.setReactInputValue(page, "input[aria-label='面试时间']", "09:30");
    await page.click("button[aria-label='创建面试']");
    await sleep(800);
    let h = await page.content();
    r.check("新建面试出现在列表", h.includes("测试公司 · 测试岗位"));

    // 刷新后仍存在（zustand persist）
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(2500);
    h = await page.content();
    r.check("新建面试刷新后仍存在（持久化）", h.includes("测试公司 · 测试岗位"));

    // 编辑：岗位与时间
    await page.click("button[aria-label='编辑 测试公司 面试']");
    await sleep(600);
    await H.setReactInputValue(page, "input[aria-label='岗位名称']", "测试岗位改");
    await H.setReactInputValue(page, "input[aria-label='面试时间']", "14:00");
    await page.click("button[aria-label='保存修改']");
    await sleep(800);
    const editedTitle = await page.evaluate(() => {
      const h3s = Array.from(document.querySelectorAll("h3"));
      return h3s.find((el) => (el.textContent ?? "").includes("测试公司"))?.textContent ?? "";
    });
    r.check("编辑后岗位名称已更新", editedTitle === "测试公司 · 测试岗位改", editedTitle);

    // 删除（确认对话框）
    await page.click("button[aria-label='删除 测试公司 面试']");
    await sleep(500);
    h = await page.content();
    r.check("删除前有确认对话框", h.includes("此操作无法撤销"));
    await page.click("button[aria-label='确认删除']");
    await sleep(800);
    h = await page.content();
    r.check("删除后从列表移除", !h.includes("测试岗位改"));
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(2500);
    h = await page.content();
    r.check("删除状态刷新后保持", !h.includes("测试岗位改"));
    r.check("CRUD 场景 console 干净", H.filterNoise(msgs).length === 0, H.filterNoise(msgs).join(" | "));
    await page.close();
  }

  // ================= F. 日历导出与同步设置 =================
  {
    const { page, msgs } = await H.openPage(browser);

    // 免登录 Google 模板链接
    const templateHref = await page.evaluate(() => {
      const anchor = document.querySelector("a[aria-label^='在 Google 日历中打开']");
      return anchor?.getAttribute("href") ?? "";
    });
    const templateUrl = new URL(templateHref);
    r.check(
      "Google 模板链接存在且参数正确",
      templateUrl.origin + templateUrl.pathname === "https://calendar.google.com/calendar/render" &&
        templateUrl.searchParams.get("action") === "TEMPLATE" &&
        (templateUrl.searchParams.get("dates") ?? "").includes("/") &&
        (templateUrl.searchParams.get("ctz") ?? "").length > 0,
      templateHref.slice(0, 80),
    );

    // .ics 下载按钮存在
    const icsButtons = await page.$$("button[aria-label*='.ics']");
    r.check("每张卡有 .ics 下载按钮", icsButtons.length > 0, String(icsButtons.length));

    // 同步设置：未配置指引 → 保存 Client ID → 状态反馈（不实际弹 OAuth 授权窗）
    await page.click("button[aria-label='日历同步设置']");
    await sleep(600);
    let h = await page.content();
    r.check("未配置时显示三步指引", h.includes("OAuth 客户端 ID") && h.includes("console.cloud.google.com"));
    await page.type("input[aria-label='OAuth Client ID']", "demo-client-id.apps.googleusercontent.com");
    await page.click("button[aria-label='保存 Client ID']");
    await sleep(400);
    h = await page.content();
    r.check("保存 Client ID 后有状态反馈", h.includes("Client ID 已保存"));
    r.check("连接按钮可用（授权需真实账号，不自动点击）", h.includes("连接 Google 账号"));
    await page.keyboard.press("Escape");
    await sleep(400);
    const closed = await page.evaluate(() => document.querySelector("[aria-label='日历同步设置'][role='dialog']") === null);
    r.check("Esc 可关闭同步设置", closed);
    r.check("日历场景 console 干净", H.filterNoise(msgs).length === 0, H.filterNoise(msgs).join(" | "));
    await page.close();
  }

  // ================= G. 用户数据隔离（阶段 1 核心验收） =================
  {
    const pageA = await browser.newPage();
    await pageA.setViewport({ width: 900, height: 1100 });
    await pageA.goto(H.BASE_URL, { waitUntil: "networkidle0" });
    await sleep(2000);

    // 用户 A 创建一条私有面试（直接走 API，避免 UI 干扰）
    const createdA = await pageA.evaluate(async () => {
      const schedule = await (await fetch("/api/schedule")).json();
      const draft = {
        company: "A私有数据",
        position: "A的岗位",
        type: "video",
        importance: 3,
        subCalendarId: schedule.subCalendars[0].id,
        startDate: "2026-10-01",
        startTime: "10:00",
        sourceTimeZone: "America/New_York",
        durationMinutes: 60,
        meetingUrl: "",
        jdNotes: "",
      };
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      return res.status;
    });
    r.check("用户 A 可通过 API 创建面试", createdA === 201, String(createdA));
    const idA = await pageA.evaluate(async () => {
      const schedule = await (await fetch("/api/schedule")).json();
      return schedule.interviews.find((iv) => iv.company === "A私有数据")?.id ?? "";
    });

    // 全新浏览器上下文 = 全新会话，注册用户 B
    const ctxB = await browser.createBrowserContext();
    const pageB = await ctxB.newPage();
    await pageB.setViewport({ width: 900, height: 1100 });
    await H.ensureLoggedIn(pageB, `e2e-b-${Date.now()}@test.local`, "e2e-pass-123");

    const htmlB = await pageB.content();
    r.check("用户 B 看不到 A 的私有面试", !htmlB.includes("A私有数据"));

    // 越权防护：B 尝试修改 A 的面试 → 404
    const forbiddenStatus = await pageB.evaluate(async (targetId) => {
      const res = await fetch("/api/interviews/" + targetId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
      return res.status;
    }, idA);
    r.check("越权修改他人面试被拒绝（404）", forbiddenStatus === 404, String(forbiddenStatus));

    // B 创建自己的数据，A 刷新后也看不到
    await pageB.evaluate(async () => {
      const schedule = await (await fetch("/api/schedule")).json();
      await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: "B私有数据",
          position: "B的岗位",
          type: "hr-screen",
          importance: 2,
          subCalendarId: schedule.subCalendars[0].id,
          startDate: "2026-10-02",
          startTime: "14:00",
          sourceTimeZone: "Asia/Shanghai",
          durationMinutes: 45,
          meetingUrl: "",
          jdNotes: "",
        }),
      });
    });
    await pageA.reload({ waitUntil: "networkidle0" });
    await sleep(2000);
    const htmlA = await pageA.content();
    r.check("用户 A 看不到 B 的私有面试", !htmlA.includes("B私有数据"));
    r.check("用户 A 自己的数据仍可见", htmlA.includes("A私有数据"));

    await ctxB.close();
    await pageA.close();
  }

  // ================= H. 订阅日历（手机自带日历，2A 核心） =================
  {
    const { page, msgs } = await H.openPage(browser);
    await page.click("button[aria-label='日历同步设置']");
    await sleep(800);

    // 订阅链接自动生成
    const feedUrl = await page.evaluate(() => {
      const code = document.querySelector("code");
      return code?.textContent?.trim() ?? "";
    });
    r.check(
      "订阅链接已生成（私有 token）",
      /\/api\/calendar\/[A-Za-z0-9_-]{20,}\.ics$/.test(feedUrl),
      feedUrl.slice(0, 60),
    );

    // 抓取订阅源内容
    const feedBody = await (await fetch(feedUrl)).text();
    r.check("订阅源是合法日历", feedBody.includes("BEGIN:VCALENDAR") && feedBody.includes("END:VCALENDAR"));
    r.check("订阅源包含面试事件", feedBody.includes("字节跳动"));
    r.check("订阅源带 VALARM 提醒（提前 1 天/1 小时）", feedBody.includes("TRIGGER:-PT1440M") && feedBody.includes("TRIGGER:-PT60M"));

    // 挂掉一场 → 订阅源即时移除
    await page.evaluate(async () => {
      const schedule = await (await fetch("/api/schedule")).json();
      const target = schedule.interviews.find((iv) => iv.company === "美团");
      await fetch("/api/interviews/" + target.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
    });
    const feedAfter = await (await fetch(feedUrl)).text();
    r.check("已挂面试从订阅源移除", !feedAfter.includes("美团"));

    // 重置链接：旧地址立即失效、新地址生效
    await page.evaluate(async () => {
      await fetch("/api/calendar/feed-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
    });
    const oldStatus = (await fetch(feedUrl)).status;
    r.check("重置后旧链接失效（404）", oldStatus === 404, String(oldStatus));
    const newUrl = await page.evaluate(async () => {
      const data = await (await fetch("/api/calendar/feed-info")).json();
      return data.url;
    });
    r.check("重置后新链接生效", (await (await fetch(newUrl)).text()).includes("BEGIN:VCALENDAR"));

    // 恢复美团状态，避免污染
    await page.evaluate(async () => {
      const schedule = await (await fetch("/api/schedule")).json();
      const target = schedule.interviews.find((iv) => iv.company === "美团");
      if (target) {
        await fetch("/api/interviews/" + target.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "upcoming" }),
        });
      }
    });
    r.check("订阅场景 console 干净", H.filterNoise(msgs).length === 0, H.filterNoise(msgs).join(" | "));
    await page.close();
  }

  await browser.close();
  const ok = r.finish();
  process.exit(ok ? 0 : 1);
})().catch((err) => {
  console.error("FEATURES-FATAL:", err.message);
  process.exit(2);
});
