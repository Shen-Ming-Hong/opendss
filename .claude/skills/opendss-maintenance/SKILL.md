---
name: opendss-maintenance
description: 維護 OpenDSS 繁中雲端工作台（Next/vinext 網站、OpenDSS VersionC WASM 引擎、Cloudflare Workers 部署）時使用：改程式、驗證、重建引擎、發布。
---

# OpenDSS 雲端工作台維護

以繁體中文與 Ray 溝通。

## 專案在哪裡

- GitHub：`Shen-Ming-Hong/opendss`（public），`main` 就是正式版。這個 repo 就是網站本體（原本 Mac 上的 `~/Documents/opendss/site/`）。
- 正式站：Cloudflare Worker `opendss`，跑在 Ray 自己的帳號（Workers Paid，帳號 id `3bdea13c295bdd5edf2cae6f68cecea3`），網址 https://opendss.lanskyassassination.workers.dev 。
- Mac 上 `~/Documents/opendss` 另有 Python 環境 `.venv`（OpenDSSDirect.py，數值比對基準）、教學手冊、`work/`（emsdk 與上游原始碼，重建引擎用）。這些不在 repo。
- 舊的 OpenAI Sites 版本（opendss-grid-lab…chatgpt.site）已不是正式發布目標；`.openai/hosting.json` 只因 `vite.config.ts` 還會讀它而保留。

## 結構

- 框架：vinext（Next.js 16 介面、Vite 8 建置）+ React 19 + Tailwind 4 + shadcn，輸出 Cloudflare Worker。Worker 名稱在 `vite.config.ts` 的 `name: "opendss"`。
- `app/page.tsx`、`app/workbench.tsx`：工作台介面（仿原版 OpenDSS 功能表、繁中）。
- `app/api/engine/route.ts`：計算 API。GET 檢查引擎；POST 收模型 JSON，檢查同來源、上限 4 MB。
- `engine/runtime.ts`：zod 驗證輸入（最多 100 檔、副檔名 dss/csv/txt/dat、安全相對路徑），每次請求建立新的 WASM 實例，只開放 `/work` 可寫。
- `engine/wasm/`：已編譯的 `OpenDSSWasm.wasm`、`opendss.mjs`、`opendss.d.mts`。
- `engine/port/`：重建 WASM 的 `portability.patch`、`bridge.cpp`、`CMakeLists.txt`、`shim/`、`test/`，以及授權檔 `OPENDSS_LICENSE.txt`（EPRI BSD-3）與 `licenses/`（KLU 等 LGPL 2.1）。
- `scripts/check-engine.py`：對本機 dev 伺服器的 API 驗證。
- 網站完全免登入、不存使用者資料；草稿存在瀏覽器，靠「下載完整專案」(.opendss.json) 轉移。

## 不可違反的限制

- CI 只做部署。型別檢查、引擎驗證都在開發環境（雲端 session 或 Mac）跑完再推；不要在 workflow 加測試步驟。
- Worker 內 WASM 必須靜態匯入 `WebAssembly.Module` 配合 `instantiateWasm`，不可用 fetch 或動態編譯。WASM 記憶體初始 32 MiB、最大 96 MiB，整個 Worker 上限 128 MiB。
- 每次計算都要新引擎實例（原生引擎 Clear 後會殘留狀態），不要改成共用實例。
- 不支援原生 DLL、COM、外部命令、平行 Actor；不要宣稱是 EPRI 認證版本。
- 散布引擎時必須保留 `engine/port/OPENDSS_LICENSE.txt` 與 `licenses/`。上游只能用 SourceForge `electricdss` 的 `trunk/VersionC`（有 BSD-3）；不要改回沒有授權檔的 GitHub `epri-dev/OpenDSS-C`。
- 留意 Ray 的 Workers 額度（每月 1,000 萬請求、3,000 萬 CPU ms 內含）。

## 修改流程

1. 從 `main` 開分支，`npm ci`。
2. 改程式，風格沿用既有寫法（API 與 runtime 是緊湊單行風格，UI 文字一律繁中）。
3. 驗證（全部在開發環境）：
   - `npx tsc --noEmit`
   - `node engine/port/test/run.mjs`：電源應為 500.21 kW／164.77 kvar，負載端故障 22,902.3 A。加 IEEE 123 資料夾路徑可再核對（132 匯流排、237 元件、電源約 3615.24 kW）。
   - `npm run dev -- --host 127.0.0.1` 啟動後跑 `python3 scripts/check-engine.py`，要印出 PASS。有 OpenDSSDirect.py 時會再比對原生數值。
   - `npm run build` 要成功。
   - `npm run lint` 目前已有既存錯誤（workbench.tsx 的 react-hooks、runtime.ts 的 module 變數、產生的 opendss.mjs），只確認沒有新增。
4. 開 PR，Ray 合併到 `main` 後，`.github/workflows/deploy.yml` 會自動 build 並 `wrangler deploy`。只改 `*.md` 或 `.claude/` 不會部署。
5. 部署後確認正式站首頁 200、`/api/engine` 回 `{"ok":true}`，`engine` 欄位為 `EPRI OpenDSS-C Version 11.0.0.1 …`。

雲端 session 的出口代理會覆寫 api.cloudflare.com 的 Authorization，`wrangler deploy` 上傳靜態檔會 401，所以不要從 session 直接部署，一律走 Action。查用量、查 Worker 狀態等唯讀 API 可以直接打。

## 重建 WASM 引擎（只有改 C++ 時才需要）

照 `engine/port/README.md`：SourceForge `trunk/VersionC` SVN r4176（v11.0.0.1），原始碼轉 LF 後套 `portability.patch`，Emscripten 6.0.12、CMake、Ninja 編譯。產物 `build/OpenDSSWasm.mjs` 改名為 `engine/wasm/opendss.mjs`，`OpenDSSWasm.wasm` 複製到 `engine/wasm/`。改了上游就要更新 `portability.patch`，並重跑上面的驗證與 IEEE 123 比對。

## 網域

`esperar-ai.org` 由 Cloudflare 管 DNS，目前主網域指向舊的 Sites（2 筆 A、2 筆 TXT）；`wyd.esperar-ai.org` 是其他用途，不要動。要把網域改指向 Worker `opendss` 之前先問 Ray，並先把現有記錄備份。
