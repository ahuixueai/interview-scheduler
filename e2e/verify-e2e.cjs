#!/usr/bin/env node
/**
 * E2E 回归（第一阶段手势断言 + 第二阶段备战胶囊）。
 * 注意：mock 的优先级顺序随运行时刻变化（如「明天上午」跨入 24h 窗口后分数反超），
 * 因此所有顺序断言均为「基于名字的相对断言」，与时点无关。
 * 覆盖：优先级降序、双时区、左滑 Offer+撒花、右滑灰化折叠、垂直拖拽排序、已挂沉底、
 *       备战胶囊自动展开 / 手动折叠（5 分钟宽限）/ 手动展开、控制台清洁度。
 * 前置：dev server 已运行（E2E_BASE_URL 可覆盖）。用法：node e2e/verify-e2e.cjs
 */
const H = require("./helpers.cjs");
const { sleep } = H;

const COMPANIES = ["腾讯", "字节跳动", "美团", "Airbnb"];

/** 在当前 DOM 中找到包含指定公司名的卡片下标 */
async function indexOf(page, name) {
  const order = await H.cardOrder(page);
  return order.indexOf(name);
}

(async () => {
  const browser = await H.launchBrowser();
  const r = H.makeReporter();

  const { page, msgs } = await H.openPage(browser);
  // 阶段 1：先注册登录（每个 run 唯一邮箱，触发服务端播种演示数据）
  await H.ensureLoggedIn(page, `e2e-${Date.now()}@test.local`, "e2e-pass-123");
  const html = await page.content();
  r.check("注册登录后进入主页", html.includes("面试与笔试日程"));
  r.check("水合后最高优先级徽章出现", html.includes("最高优先级"));
  r.check(
    "水合后相对时间标签出现（明天/天后/小时等）",
    ["小时后", "明天", "天后", "周后", "不到 1 小时"].some((kw) => html.includes(kw)),
  );
  r.check("同区卡片显示「与你所在时区相同」", html.includes("与你所在时区相同"));
  r.check("水合后无占位符残留", !(html.includes(">…</span>") || html.includes(">…</p>")));
  r.check("LA 卡本地列换算为 NY 17:00", html.includes("17:00"));
  r.check("London 卡本地列换算为 NY 04:30", html.includes("04:30"));

  const initialOrder = await H.cardOrder(page);
  r.check(
    "初始列表包含全部 4 场",
    COMPANIES.every((c) => initialOrder.includes(c)) && initialOrder.length === 4,
    initialOrder.join("|"),
  );
  const badgeOwner = await page.evaluate((companies) => {
    const lis = Array.from(document.querySelectorAll("ul li"));
    const idx = lis.findIndex((el) => (el.textContent ?? "").includes("最高优先级"));
    if (idx < 0) return null;
    const t = lis[idx].textContent ?? "";
    return companies.find((c) => t.includes(c)) ?? "?";
  }, COMPANIES);
  // 徽章应在第一张卡上
  r.check(
    "最高优先级徽章标记列表第一张卡",
    badgeOwner !== null && badgeOwner === initialOrder[0],
    `徽章=${badgeOwner} 第一张=${initialOrder[0]}`,
  );

  // ---- 备战胶囊：腾讯卡（25 分钟后）自动展开 ----
  r.check("胶囊自动展开（距开始 ≤60 分钟）", html.includes("备战清单"));
  r.check("胶囊含会议链接行动点", html.includes("进入会议"));
  r.check("胶囊含简历 PDF 行动点", html.includes("简历 PDF"));
  r.check("胶囊含 JD 笔记行动点", html.includes("JD 笔记"));

  // 手动折叠 → 重渲染后仍折叠（5 分钟宽限）；再手动展开
  await page.click("button[aria-label='收起备战']");
  await sleep(800);
  let h = await page.content();
  r.check("手动折叠生效", !h.includes("备战清单"));
  await page.click("button[aria-label='按优先级重新排序']");
  await sleep(1200);
  h = await page.content();
  r.check("折叠后重渲染不自动展开（5 分钟宽限）", !h.includes("备战清单"));
  await page.click("button[aria-label='展开备战']");
  await sleep(800);
  h = await page.content();
  r.check("可手动重新展开", h.includes("备战清单"));

  // ---- 手势回归（基于名字定位，与时点无关） ----
  // 左滑「字节跳动」→ Offer + 撒花
  let idx = await indexOf(page, "字节跳动");
  await H.scrollToCard(page, idx);
  let boxes = await H.cardBoxes(page);
  await H.swipeLeftByMouse(page, boxes[idx]);
  await sleep(1200);
  h = await page.content();
  r.check("左滑 → 拿到 Offer 徽章", h.includes("已拿到 Offer"));
  r.check("左滑 → canvas-confetti 画布出现", (await page.$$eval("canvas", (c) => c.length)) === 1);

  // 右滑「美团」→ 已挂 + 折叠 + 灰度
  idx = await indexOf(page, "美团");
  await H.scrollToCard(page, idx);
  const boxes2 = await H.cardBoxes(page);
  await H.swipeRightByMouse(page, boxes2[idx]);
  await sleep(1200);
  h = await page.content();
  r.check("右滑 → 已挂/取消", h.includes("已挂 / 已取消"));
  const boxes3 = await H.cardBoxes(page);
  r.check("右滑 → 高度折叠", boxes3[idx].h < boxes2[idx].h * 0.5);
  r.check(
    "右滑 → 灰度样式",
    await page.$$eval("ul li", (els, i) => els[i].querySelector(".grayscale") !== null, idx),
  );

  // 撤销（替代路径；layout 动画期间点击可能落空，带校验重试）
  const restoreBtns = await page.$$("button[aria-label^='恢复']");
  r.check("撤销按钮可见（替代路径）", restoreBtns.length > 0);
  if (restoreBtns.length > 0) {
    await H.clickUntil(
      page,
      "button[aria-label^='恢复']",
      () => page.$$eval("button[aria-label^='恢复']", (els) => els.length === 0),
    );
  }

  // 垂直拖拽排序：把「美团」上移一位 → 应与前一张互换位置
  idx = await indexOf(page, "美团");
  const beforeDrag = await H.cardOrder(page);
  await H.scrollToCard(page, idx);
  const boxes4 = await H.cardBoxes(page);
  // 拖拽距离自适应：上一张卡可能是展开胶囊的高卡片，按自身高度 1.5 倍 + 余量、保底 560px
  await H.dragVertically(page, boxes4[idx], Math.max(boxes4[idx].h * 1.5 + 40, 560));
  await sleep(1500);
  const afterDrag = await H.cardOrder(page);
  const expectedAfterDrag = [...beforeDrag];
  [expectedAfterDrag[idx - 1], expectedAfterDrag[idx]] = [expectedAfterDrag[idx], expectedAfterDrag[idx - 1]];
  r.check(
    "垂直拖拽排序生效（与上一张互换）",
    afterDrag.join("|") === expectedAfterDrag.join("|"),
    `${beforeDrag.join("|")} → ${afterDrag.join("|")}`,
  );

  // 按优先级重排 → 恢复初始顺序
  await page.click("button[aria-label='按优先级重新排序']");
  await sleep(1500);
  const afterResort = await H.cardOrder(page);
  r.check(
    "按优先级重排恢复初始顺序",
    afterResort.join("|") === initialOrder.join("|"),
    afterResort.join("|"),
  );

  // 已挂沉底：撤销字节 Offer → 右滑挂掉首张卡 → 重排 → 首张沉底
  await H.clickUntil(
    page,
    "button[aria-label^='撤销']",
    () => page.$$eval("button[aria-label^='撤销']", (els) => els.length === 0),
  );
  await sleep(500);
  const topName = initialOrder[0];
  idx = await indexOf(page, topName);
  await H.scrollToCard(page, idx);
  const boxes5 = await H.cardBoxes(page);
  await H.swipeRightByMouse(page, boxes5[idx]);
  await sleep(1200);
  await page.click("button[aria-label='按优先级重新排序']");
  await sleep(1500);
  const afterSink = await H.cardOrder(page);
  r.check(
    "已挂卡片重排后沉底",
    afterSink[afterSink.length - 1] === topName,
    afterSink.join("|"),
  );
  const badgeAfterSink = await page.evaluate((companies) => {
    const lis = Array.from(document.querySelectorAll("ul li"));
    const i = lis.findIndex((el) => (el.textContent ?? "").includes("最高优先级"));
    if (i < 0) return null;
    const t = lis[i].textContent ?? "";
    return companies.find((c) => t.includes(c)) ?? "?";
  }, COMPANIES);
  r.check(
    "沉底后最高优先级徽章移至新榜首",
    badgeAfterSink !== null && badgeAfterSink === afterSink[0],
    `徽章=${badgeAfterSink} 榜首=${afterSink[0]}`,
  );

  r.check("常规场景 console 零警告/错误", H.filterNoise(msgs).length === 0, H.filterNoise(msgs).join(" | "));
  await page.close();
  await browser.close();

  const ok = r.finish();
  process.exit(ok ? 0 : 1);
})().catch((err) => {
  console.error("E2E-FATAL:", err.message);
  process.exit(2);
});
