/**
 * 一次性脚本：生成拼图滑块背景图（4 张 320×160 抽象图，存 public/puzzles/）
 * 用法：node scripts/generate-puzzles.cjs
 */
const puppeteer = require("puppeteer-core");
const fs = require("node:fs");
const path = require("node:path");

const CHROME_PATH =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// 浏览器端绘制函数（seeded 伪随机，保证每次生成一致）
const DRAW = `
  (seed, palette) => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    let s = seed >>> 0;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const grad = ctx.createLinearGradient(0, 0, 320, 160);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(1, palette[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 160);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(rand() * 320, rand() * 160, 12 + rand() * 46, 0, Math.PI * 2);
      ctx.fillStyle = palette[2 + Math.floor(rand() * 3)];
      ctx.globalAlpha = 0.22 + rand() * 0.3;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(rand() * 320, rand() * 160);
      ctx.lineTo(rand() * 320, rand() * 160);
      ctx.lineTo(rand() * 320, rand() * 160);
      ctx.closePath();
      ctx.fillStyle = palette[2 + Math.floor(rand() * 3)];
      ctx.globalAlpha = 0.16 + rand() * 0.2;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const x = rand() * 320;
      const y = rand() * 160;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 140, y + (rand() - 0.5) * 90);
      ctx.stroke();
    }
    return canvas.toDataURL("image/jpeg", 0.85);
  }
`;

const SETS = [
  { seed: 11, palette: ["#0B1220", "#1E3A8A", "#3B82F6", "#7DB8E8", "#F59E0B"] },
  { seed: 23, palette: ["#101C2C", "#0F766E", "#14B8A6", "#5EEAD4", "#FACC15"] },
  { seed: 37, palette: ["#1C1017", "#7C2D5E", "#EC4899", "#F9A8D4", "#38BDF8"] },
  { seed: 53, palette: ["#0F1A0F", "#3F6212", "#84CC16", "#D9F99D", "#FB923C"] },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.goto("about:blank");
  const outDir = path.join(__dirname, "..", "public", "puzzles");
  fs.mkdirSync(outDir, { recursive: true });
  for (let i = 0; i < SETS.length; i++) {
    const set = SETS[i];
    const dataUrl = await page.evaluate(
      (drawSrc, seed, paletteJson) => {
        const fn = eval("(" + drawSrc + ")");
        return fn(seed, JSON.parse(paletteJson));
      },
      DRAW,
      set.seed,
      JSON.stringify(set.palette),
    );
    const base64 = dataUrl.split(",")[1];
    fs.writeFileSync(path.join(outDir, "puzzle-" + (i + 1) + ".jpg"), Buffer.from(base64, "base64"));
    console.log("generated puzzle-" + (i + 1) + ".jpg");
  }
  await browser.close();
  console.log("done");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
