// 全尺寸裝置視覺互動測試：對本機 dev 伺服器操作主要流程並截圖。
// 用法：先 npm run dev -- --host 127.0.0.1，再 node scripts/visual-check.mjs [--base-url URL] [--out DIR]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const base = arg("--base-url", "http://127.0.0.1:5173").replace(/\/$/, "");
const out = arg("--out", "visual-check");
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Local preview only");
mkdirSync(out, { recursive: true });

const devices = [
  { name: "desktop-1920", viewport: { width: 1920, height: 1080 } },
  { name: "laptop-1366", viewport: { width: 1366, height: 768 } },
  { name: "tablet-820", viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  { name: "phone-390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const failures = [];
for (const device of devices) {
  const context = await browser.newContext({ ...device, name: undefined, locale: "zh-TW" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const step = async (label, action) => {
    try { await action(); } catch (error) { failures.push(`${device.name}｜${label}｜${error.message.split("\n")[0]}`); }
  };
  await step("開啟首頁", async () => {
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.locator(".cloud-status.online").waitFor({ timeout: 30000 });
  });
  await page.screenshot({ path: `${out}/${device.name}-1-home.png`, fullPage: true });
  await step("求解範例模型", async () => {
    await page.locator(".solve-button").click();
    await page.getByText(/計算完成/).first().waitFor({ timeout: 60000 });
  });
  await page.screenshot({ path: `${out}/${device.name}-2-solved.png`, fullPage: true });
  await step("功能表產生 Show 報表", async () => {
    await page.locator(".menu summary", { hasText: "顯示" }).click();
    await page.screenshot({ path: `${out}/${device.name}-3-menu.png` });
    await page.getByRole("button", { name: /Show Voltages LN Nodes/ }).click();
    await page.locator(".reports-list details").first().waitFor({ timeout: 60000 });
    if (await page.getByText("模型已變更").count()) throw new Error("產生報表後結果被標成過期");
  });
  await page.screenshot({ path: `${out}/${device.name}-4-report.png`, fullPage: true });
  await step("繪圖功能表", async () => {
    await page.locator(".menu summary", { hasText: "繪圖" }).click();
    await page.getByRole("button", { name: "匯流排電壓圖" }).click();
    await page.locator(".voltage-plot svg polyline").first().waitFor();
    await page.locator(".plot-views button", { hasText: "電路圖" }).click();
    await page.locator(".plot-panel", { hasText: "電路圖（Plot Circuit）" }).waitFor();
    await page.locator(".plot-views button", { hasText: "電壓剖面" }).click();
    await page.locator(".plot-panel", { hasText: "電壓剖面（Plot Profile）" }).waitFor();
  });
  await page.screenshot({ path: `${out}/${device.name}-5-plot.png`, fullPage: true });
  await step("切換英文介面", async () => {
    await page.locator(".menu summary", { hasText: "視窗" }).click();
    await page.getByRole("button", { name: /Language：English/ }).click();
    await page.locator(".solve-button", { hasText: "Solve" }).waitFor();
    await page.locator(".menu summary", { hasText: "File" }).waitFor();
    const leftover = await page.locator(".menu-bar, .toolbar, .result-tabs, .status-bar").evaluateAll(nodes => nodes.map(node => node.textContent).join(" ").match(/[\u4e00-\u9fff]+/g));
    if (leftover && leftover.some(text => !["繁體中文", "简体中文", "日本語"].includes(text))) throw new Error("英文介面仍有中文：" + leftover.join("、"));
    if (await page.evaluate(() => document.documentElement.lang) !== "en") throw new Error("html lang 沒有改成 en");
  });
  await page.screenshot({ path: `${out}/${device.name}-6-english.png`, fullPage: true });
  await step("切換其他語言", async () => {
    for (const [code, solve] of [["ja", "求解"], ["ko", "해석"], ["es", "Resolver"], ["pt-BR", "Resolver"], ["zh-CN", "求解"]]) {
      await page.locator(".language-picker select").selectOption(code);
      if (await page.evaluate(() => document.documentElement.lang) !== code) throw new Error("html lang 沒有改成 " + code);
      const text = await page.locator(".solve-button").textContent();
      if (!text.includes(solve)) throw new Error(`${code} 的求解按鈕是「${text}」`);
    }
  });
  await page.screenshot({ path: `${out}/${device.name}-7-zh-CN.png`, fullPage: true });
  await step("沒有水平捲動", async () => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) throw new Error(`頁面比視窗寬 ${overflow}px`);
  });
  if (errors.length) failures.push(`${device.name}｜瀏覽器錯誤｜${errors.join(" / ")}`);
  await context.close();
}
await browser.close();
if (failures.length) { console.error("FAIL\n" + failures.join("\n")); process.exit(1); }
console.log(`PASS: ${devices.map(device => device.name).join(", ")}；截圖在 ${out}/`);
