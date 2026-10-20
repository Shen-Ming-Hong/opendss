// 全尺寸裝置視覺互動測試：對本機 dev 伺服器（或加 --production 時對正式站）操作主要流程並截圖。
// 用法：先 npm run dev -- --host 127.0.0.1，再 node scripts/visual-check.mjs [--base-url URL] [--out DIR] [--devices a,b]
// 部署後：node scripts/visual-check.mjs --production --devices laptop-1366,phone-390 --out /tmp/visual-prod
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const production = process.argv.includes("--production");
const site = "https://opendss.esperar-ai.org";
const base = arg("--base-url", production ? site : "http://127.0.0.1:5173").replace(/\/$/, "");
const out = arg("--out", "visual-check");
if (production ? base !== site : !["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error(production ? "--production 只能測 " + site : "Local preview only（正式站請加 --production）");
mkdirSync(out, { recursive: true });

const allDevices = [
  { name: "desktop-1920", viewport: { width: 1920, height: 1080 } },
  { name: "laptop-1366", viewport: { width: 1366, height: 768 } },
  { name: "tablet-820", viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
  { name: "phone-390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  { name: "phone-landscape-844", viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
];
const picked = arg("--devices", "").split(",").filter(Boolean);
const unknown = picked.filter(name => !allDevices.some(device => device.name === name));
if (unknown.length) throw new Error("沒有這些裝置：" + unknown.join("、"));
const devices = picked.length ? allDevices.filter(device => picked.includes(device.name)) : allDevices;

const proxy = production && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", proxy });
const failures = [];
for (const device of devices) {
  const context = await browser.newContext({ ...device, name: undefined, locale: "zh-TW" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  // 桌面 App 內建瀏覽器不支援原生對話框，出現就算失敗。
  context.on("dialog", dialog => { errors.push("出現原生對話框 " + dialog.type()); dialog.dismiss(); });
  const step = async (label, action) => {
    try { await action(); } catch (error) { failures.push(`${device.name}｜${label}｜${error.message.split("\n")[0]}`); }
  };
  // 元素要能捲到畫面內，且左右沒有被切掉。
  const reachable = async selector => {
    const target = page.locator(selector).first();
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    const [width, height] = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
    if (!box || box.height < 1 || box.x < -1 || box.x + Math.min(box.width, width) > width + 1 || box.y < -1 || box.y + Math.min(box.height, 24) > height + 1) throw new Error(`${selector} 被切掉或捲不到`);
  };
  await step("開啟首頁", async () => {
    await page.goto(base + "/", { waitUntil: "networkidle" });
    await page.locator(".cloud-status.online").waitFor({ timeout: 30000 });
    const size = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
    if (size[0] !== device.viewport.width || size[1] !== device.viewport.height) throw new Error(`實際視窗 ${size.join("×")}，不是 ${device.viewport.width}×${device.viewport.height}`);
  });
  await page.screenshot({ path: `${out}/${device.name}-1-home.png`, fullPage: true });
  await step("求解範例模型", async () => {
    await page.locator(".solve-button").click();
    await page.getByText(/計算完成/).first().waitFor({ timeout: 60000 });
  });
  await page.screenshot({ path: `${out}/${device.name}-2-solved.png`, fullPage: true });
  await step("版面放大與還原", async () => {
    await page.getByRole("button", { name: "放大編輯區" }).click();
    if (await page.locator(".results-panel, .console-panel").count()) throw new Error("放大編輯區後指令或結果視窗還在");
    await page.getByRole("button", { name: "還原版面" }).click();
    await page.locator(".results-panel").waitFor(); await page.locator(".console-panel").waitFor();
    await page.getByRole("button", { name: "放大結果視窗" }).click();
    if (await page.locator(".editor-workspace").isVisible()) throw new Error("放大結果視窗後編輯區還在");
    const [max, viewport] = [(await page.locator(".results-panel").boundingBox()).height, await page.evaluate(() => innerHeight)];
    if (max < viewport * 0.4) throw new Error(`放大後結果視窗只有 ${Math.round(max)}px`);
    await page.screenshot({ path: `${out}/${device.name}-2b-results-max.png` });
    await page.getByRole("button", { name: "還原版面" }).click();
    await page.locator(".editor-workspace").waitFor();
    const splitter = await page.locator(".panel-splitter").boundingBox();
    const before = (await page.locator(".results-panel").boundingBox()).height;
    await page.mouse.move(splitter.x + splitter.width / 2, splitter.y + splitter.height / 2);
    await page.mouse.down(); await page.mouse.move(splitter.x + splitter.width / 2, splitter.y - 60, { steps: 5 }); await page.mouse.up();
    const after = (await page.locator(".results-panel").boundingBox()).height;
    if (after < before + 40) throw new Error(`拖曳分隔線後高度 ${Math.round(before)} → ${Math.round(after)}`);
  });
  await step("功能表產生 Show 報表", async () => {
    await page.locator(".menu summary", { hasText: "顯示" }).click();
    await reachable(".menu[open] .menu-popup button:last-child");
    await page.screenshot({ path: `${out}/${device.name}-3-menu.png` });
    await page.getByRole("button", { name: /Show Voltages LN Nodes/ }).click();
    await page.locator(".reports-list details").first().waitFor({ timeout: 60000 });
    if (await page.getByText("模型已變更").count()) throw new Error("產生報表後結果被標成過期");
    await reachable(".reports-list details");
  });
  await page.screenshot({ path: `${out}/${device.name}-4-report.png`, fullPage: true });
  await step("繪圖功能表", async () => {
    await page.locator(".menu summary", { hasText: "繪圖" }).click();
    await page.getByRole("button", { name: "匯流排電壓圖" }).click();
    await page.locator(".voltage-plot svg polyline").first().waitFor();
    await reachable(".voltage-plot svg");
    await page.locator(".plot-views button", { hasText: "電路圖" }).click();
    await page.locator(".plot-panel", { hasText: "電路圖（Plot Circuit）" }).waitFor();
    await page.locator(".plot-views button", { hasText: "電壓剖面" }).click();
    await page.locator(".plot-panel", { hasText: "電壓剖面（Plot Profile）" }).waitFor();
  });
  await page.screenshot({ path: `${out}/${device.name}-5-plot.png`, fullPage: true });
  await step("頁面內確認列", async () => {
    await page.locator(".menu summary", { hasText: "檔案" }).click();
    await page.locator(".menu[open] .menu-popup").getByRole("button", { name: "新增模型" }).click();
    await page.locator(".confirm-bar").waitFor();
    await reachable(".confirm-bar button:last-child");
    await page.locator(".confirm-bar button", { hasText: "取消" }).click();
    await page.locator(".confirm-bar").waitFor({ state: "detached" });
  });
  await step("其他網站帶入專案", async () => {
    const opener = await context.newPage();
    await opener.goto(base + "/api/engine");
    const project = { entry: "Import.dss", mode: "faultstudy", commands: "", files: [{ name: "Import.dss", content: "Clear\nNew Circuit.Import BasekV=11.4 pu=1 Phases=3\nNew Load.L Bus1=SourceBus kW=100\nSet VoltageBases=[11.4]\nCalcVoltageBases\nSolve\n" }] };
    const [popup] = await Promise.all([context.waitForEvent("page"), opener.evaluate(([target, project]) => {
      const win = window.open(target, "_blank");
      addEventListener("message", event => { if (event.source === win && event.data?.type === "opendss:ready") win.postMessage({ type: "opendss:project", project }, location.origin); });
    }, [base + "/?import", project])]);
    await popup.locator(".confirm-bar").waitFor({ timeout: 30000 });
    await popup.screenshot({ path: `${out}/${device.name}-5b-import.png` });
    await popup.locator(".confirm-bar button.primary").click();
    const [entry, mode] = [await popup.locator("#entry").inputValue(), await popup.locator("#analysis").inputValue()];
    if (entry !== "Import.dss" || mode !== "faultstudy") throw new Error(`帶入後主腳本 ${entry}、模式 ${mode}`);
    await popup.close(); await opener.close();
  });
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
