/**
 * 性能探针：统计页面加载后 Intl.DateTimeFormat 构造次数、setInterval 注册数与共享时钟实例数。
 * 用法：node scripts/perf-probe.mjs [BASE_URL]
 */
import puppeteer from "puppeteer-core";

const BASE_URL = process.env.E2E_BASE_URL || process.argv[2] || "http://localhost:3100";
const CHROME_PATH =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--no-first-run", "--password-store=basic"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1400 });

await page.evaluateOnNewDocument(() => {
  const w = window;
  w.__counts = { dtf: 0, intervals: 0 };
  const OrigDTF = w.Intl.DateTimeFormat;
  w.Intl.DateTimeFormat = function patched(...args) {
    w.__counts.dtf++;
    return new OrigDTF(...args);
  };
  w.Intl.DateTimeFormat.prototype = OrigDTF.prototype;
  const origInterval = w.setInterval.bind(w);
  w.setInterval = (fn, ms, ...rest) => {
    w.__counts.intervals++;
    return origInterval(fn, ms, ...rest);
  };
});

await page.goto(BASE_URL, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 3500));

const result = await page.evaluate(() => ({
  dtfConstructions: window.__counts.dtf,
  intervalRegistrations: window.__counts.intervals,
  sharedClockInstances: window.__NOW_TICKERS__ ?? null,
}));
console.log(JSON.stringify(result));
await browser.close();
