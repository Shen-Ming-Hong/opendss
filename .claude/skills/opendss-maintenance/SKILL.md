---
name: opendss-maintenance
description: 維護 OpenDSS 雲端工作台（OpenDSS Cloud Workbench；Next/vinext 網站、OpenDSS VersionC WASM 引擎、Cloudflare Workers 部署）時使用：改程式、驗證、重建引擎、發布。
---

# OpenDSS 雲端工作台維護

網站名稱是「OpenDSS 雲端工作台／OpenDSS Cloud Workbench」。介面與文件用語保持通用，不要把名稱或描述寫死成特定語言或地區（例如「繁體中文工作台」），也不要提到 Ray 個人的電腦。

以繁體中文與 Ray 溝通。

## 專案在哪裡

- GitHub：`Shen-Ming-Hong/opendss`（public），`main` 就是正式版。這個 repo 就是網站本體（原本 Mac 上的 `~/Documents/opendss/site/`）。
- 正式站：Cloudflare Worker `opendss`，跑在 Ray 自己的帳號（Workers Paid；帳號 ID 存在 GitHub secret `CLOUDFLARE_ACCOUNT_ID`，不要寫進 repo），網址 https://opendss.esperar-ai.org （Worker 自訂網域；Ray 指定用子網域，母網域 esperar-ai.org 不給這個網站用）。
- Mac 上 `~/Documents/opendss` 另有 Python 環境 `.venv`（OpenDSSDirect.py，數值比對基準）、教學手冊、`work/`（emsdk 與上游原始碼，重建引擎用）。這些不在 repo。
- 舊的 OpenAI Sites 版本（opendss-grid-lab…chatgpt.site）已不是正式發布目標；`.openai/hosting.json` 只因 `vite.config.ts` 還會讀它而保留。

## 結構

- 框架：vinext（Next.js 16 介面、Vite 8 建置）+ React 19 + Tailwind 4 + shadcn，輸出 Cloudflare Worker。Worker 名稱在 `vite.config.ts` 的 `name: "opendss"`。
- `app/page.tsx`、`app/workbench.tsx`：工作台介面（仿原版 OpenDSS 功能表，繁中／英文，預設依瀏覽器語言，標題列可切換並記在瀏覽器）。`app/plots.tsx`：電路圖、電壓剖面、曲線圖。`lib/i18n.ts`：語言字典。
- `app/api/engine/route.ts`：計算 API。GET 檢查引擎；POST 收模型 JSON，檢查同來源、上限 4 MB。
- `engine/runtime.ts`：zod 驗證輸入（最多 100 檔、副檔名 dss/csv/txt/dat、安全相對路徑），每次請求建立新的 WASM 實例，只開放 `/work` 可寫。
- `engine/wasm/`：已編譯的 `OpenDSSWasm.wasm`、`opendss.mjs`、`opendss.d.mts`。
- `engine/port/`：重建 WASM 的 `portability.patch`、`bridge.cpp`、`CMakeLists.txt`、`shim/`、`test/`，以及授權檔 `OPENDSS_LICENSE.txt`（EPRI BSD-3）與 `licenses/`（KLU 等 LGPL 2.1）。
- `scripts/check-engine.py`：對本機 dev 伺服器的 API 驗證。
- `scripts/visual-check.mjs`：四種裝置尺寸的瀏覽器互動與截圖測試（playwright-core，用環境內建的 Chromium）。
- 網站完全免登入、不存使用者資料；草稿存在瀏覽器，靠「下載完整專案」(.opendss.json) 轉移。

## 不可違反的限制

- CI 只做部署（Ray 明確要求，不要浪費 Actions 時間）。凡是能在雲端 session 本機跑的驗證，包括型別檢查、引擎與 API 檢查、四種尺寸互動測試、build、lint，一律在本機跑完再推；不要在 workflow 加任何測試或檢查步驟，也不要另開 CI workflow。
- Worker 內 WASM 必須靜態匯入 `WebAssembly.Module` 配合 `instantiateWasm`，不可用 fetch 或動態編譯。WASM 記憶體初始 32 MiB、最大 96 MiB，整個 Worker 上限 128 MiB。
- 每次計算都要新引擎實例（原生引擎 Clear 後會殘留狀態），不要改成共用實例。
- 不支援原生 DLL、COM、外部命令、平行 Actor；不要宣稱是 EPRI 認證版本。
- `engine/runtime.ts` 把 `system()` 改成回報成功（Dump、FileEdit 等寫完檔案會想開編輯器），並擋掉會讓引擎記憶體越界或卡住的 Distribute、Refine_BusLevels、Tear_Circuit、Export Sections。引擎內部錯誤一律轉成友善訊息。
- 求解模式 `script`（依腳本設定）走 compileOnly 路徑：執行額外指令但不再強制 Solve，用來跑 Daily、Harmonics 等模式。
- 散布引擎時必須保留 `engine/port/OPENDSS_LICENSE.txt` 與 `licenses/`。上游只能用 SourceForge `electricdss` 的 `trunk/VersionC`（有 BSD-3）；不要改回沒有授權檔的 GitHub `epri-dev/OpenDSS-C`。
- 留意 Ray 的 Workers 額度（每月 1,000 萬請求、3,000 萬 CPU ms 內含）。

## 字型與字級

- 字型用系統字型堆疊（`--font-latin`、`--font-cjk`、`--font-mono`，定義在 `app/globals.css` 開頭），中日韓依 `html lang` 換各地區系統字型；不要載入網路字型。
- 字級最小 11px（狀態列、標記），一般介面 12–13px；手機上的輸入框與下拉選單用 16px，避免 iOS 聚焦時自動放大。新增樣式不要再用 8–10px。

## 修改流程

1. 從 `main` 開分支，`npm ci`。
2. 改程式，風格沿用既有寫法（API 與 runtime 是緊湊單行風格）。介面有繁體中文與英文：程式裡照舊寫繁中文字並包 `t()`，同時在 `lib/i18n.ts` 的 `english` 字典與 `lib/locales/` 的每一份字典（简中、日、韓、西、葡）補上翻譯（以繁中原文為鍵，含伺服器錯誤訊息）；字典缺鍵時會顯示繁中原文。非英文介面的專業名詞用 `term()` 在旁邊補英文；OpenDSS 指令、元件名稱、報表內容不翻譯。之後要加語言就在 `languages` 加一項並給一份字典。
3. 驗證（全部在開發環境）：
   - `npx tsc --noEmit`
   - `node engine/port/test/run.mjs`：電源應為 500.21 kW／164.77 kvar，負載端故障 22,902.3 A。加 IEEE 123 資料夾路徑可再核對（132 匯流排、237 元件、電源約 3615.24 kW）。
   - `npm run dev -- --host 127.0.0.1` 啟動後跑 `python3 scripts/check-engine.py`，要印出 PASS。有 OpenDSSDirect.py 時會再比對原生數值。
   - **全尺寸裝置視覺互動測試（每次改完程式都要跑）**：dev 伺服器開著時執行 `node scripts/visual-check.mjs --out /tmp/visual`。它用 Playwright 在桌機 1920、筆電 1366、平板 820、手機 390 四種尺寸操作首頁連線、求解範例、從「顯示」功能表產生 Show 報表、開繪圖分頁、切換英文介面，並檢查沒有瀏覽器錯誤、沒有水平捲動、報表後結果沒被標成過期。要印出 PASS，並用 Read 實際看過截圖（至少筆電與手機的報表畫面）再回報。改了版面或新增互動時，把新流程加進這支腳本。
   - `npx tsx scripts/check-i18n.ts`：每個介面字串在每種語言字典都有翻譯、佔位符一致，要印出 PASS。
   - `npm run build` 要成功。
   - `npm run lint` 目前已有既存錯誤（workbench.tsx 的 react-hooks、runtime.ts 的 module 變數、產生的 opendss.mjs），只確認沒有新增。
4. 開 PR，說明寫清楚改了什麼與驗證結果。Ray 指示：合併到自動部署屬於維護流程，驗證全部通過後由 Claude 直接 squash 合併到 `main`，`.github/workflows/deploy.yml` 會自動 build 並 `wrangler deploy`。只改 `*.md` 或 `.claude/` 不會部署。
5. 合併後確認 Deploy 這個 Action 綠燈；失敗就讀 log 修好再合併。
6. 部署後用 curl 確認正式站 https://opendss.esperar-ai.org 首頁 200、`/api/engine` 回 `{"ok":true}`，送範例模型確認 `engine` 為 `EPRI OpenDSS-C Version 11.0.0.1 …` 且數值正確（Python urllib 會被 Cloudflare 擋成 403；子網域要在雲端環境的 Allowed domains 加上才連得到）。再回報 Ray。

雲端 session 的出口代理會覆寫 api.cloudflare.com 的 Authorization，`wrangler deploy` 上傳靜態檔會 401，所以不要從 session 直接部署，一律走 Action。查用量、查 Worker 狀態等唯讀 API 可以直接打。

## 重建 WASM 引擎（只有改 C++ 時才需要）

照 `engine/port/README.md`：SourceForge `trunk/VersionC` SVN r4176（v11.0.0.1），原始碼轉 LF 後套 `portability.patch`，Emscripten 6.0.12、CMake、Ninja 編譯。產物 `build/OpenDSSWasm.mjs` 改名為 `engine/wasm/opendss.mjs`，`OpenDSSWasm.wasm` 複製到 `engine/wasm/`。改了上游就要更新 `portability.patch`，並重跑上面的驗證與 IEEE 123 比對。

## 網域

`esperar-ai.org` 由 Cloudflare 管 DNS。網站以 Workers 自訂網域綁在子網域 `opendss.esperar-ai.org`（DNS 記錄由 Cloudflare 自動管理）。母網域 `esperar-ai.org` 曾誤綁到這個 Worker，2026-10-19 已解除；Ray 決定不還原母網域原本指向 Sites 的 2 筆 A 記錄（備份在 Mac 的 `private/部署紀錄/esperar-ai.org-dns-created.json`）。不要再把網站綁回母網域。`wyd.esperar-ai.org` 是其他用途，不要動。session 的 Cloudflare 權限可管 Workers 自訂網域，但不能讀寫 DNS，DNS 變更要請 Ray 在主控台做。
