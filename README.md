# OpenDSS 雲端工作台（OpenDSS Cloud Workbench）

正式站：https://opendss.esperar-ai.org

保留 OpenDSS 原生功能表與腳本工作流程的網頁介面，使用 EPRI OpenDSS（官方 C++ 版 VersionC）的 WASM 移植，在 Cloudflare Workers 執行計算。網站公開提供使用，無須登入。

A web workbench that keeps the native OpenDSS menus and script workflow, running a WASM port of EPRI OpenDSS (the official C++ VersionC) on Cloudflare Workers. Free to use, no sign-in. The interface is available in Traditional Chinese and English.

## 使用

開啟 `.dss` 與引用檔案，或整個模型資料夾；選擇主腳本後編譯。可執行穩態潮流、故障分析，或用「依腳本設定」跑 Daily、Harmonics 等模式；查看匯流排電壓、第一端元件電流／功率與故障電流，並匯出 CSV、JSON 或 Show/Export 文字報表。

「繪圖」分頁提供匯流排電壓圖、電路圖（Plot Circuit，需 Buscoords）、電壓剖面（Plot Profile，需 EnergyMeter）與曲線圖（Plot Monitor，可畫任一 CSV 報表）。

每次操作重新編譯主腳本再套用額外指令。修改元件後要產生文字報表時，請依序輸入 `Edit …`、`Solve`、`Show …`。求解按鈕會在額外指令結束後再依選定模式求解。

草稿存於目前瀏覽器，裝置間不會自動同步。透過「檔案 → 下載完整專案」保存，再於其他裝置開啟 `.opendss.json`。編譯或求解才會將模型送至雲端；模型不會寫入永久儲存。

模型路徑使用相對路徑。單次最多 100 檔案、2 MB，輸出最多 2,000 匯流排、5,000 元件；大型或耗時計算仍受 Worker CPU／記憶體限制。不支援原生 DLL、COM、外部系統命令、平行 Actor。完整原生功能相容性尚未驗證。

## 介面語言

目前支援繁體中文與英文。預設依瀏覽器語言（中文系統顯示繁中，其他顯示英文），可在標題列右上角切換，選擇會記在瀏覽器。中文介面的專業名詞旁會補英文（例如「匯流排電壓 Bus Voltages」）；OpenDSS 指令、元件名稱與報表內容維持英文。

文字字典在 [lib/i18n.ts](lib/i18n.ts)：程式裡寫繁中原文並包 `t()`，`english` 字典以繁中原文為鍵提供英文，伺服器錯誤訊息也在這裡翻譯。新增語言時在 `languages` 加一項並提供對應字典。

## Language

The interface supports Traditional Chinese and English. It follows the browser language by default and can be switched from the top-right of the title bar; the choice is remembered in the browser. OpenDSS commands, element names and report contents stay in English. Translations live in [lib/i18n.ts](lib/i18n.ts).

## 本機開發

```sh
npm ci
npm run dev -- --host 127.0.0.1
npx tsc --noEmit
python scripts/check-engine.py   # 需先啟動 dev
node engine/port/test/run.mjs    # 直接驗證 WASM：電源 500.21 kW、負載端故障 22,902.3 A
node scripts/visual-check.mjs    # 需先啟動 dev：桌機／筆電／平板／手機互動測試與截圖（含繪圖與切換英文）
npm run build
```

驗證都在本機（或雲端開發環境）完成；GitHub Actions 只負責部署。

首頁與計算 API 皆可匿名使用。模型在各請求的獨立 WASM 實例內執行；API 保留同來源檢查、檔案路徑與大小驗證，不儲存使用者資料表或模型檔案。

WASM 來源、重建方法、授權聲明與數值驗證見 [engine/port/README.md](engine/port/README.md)。

## 部署

推送到 `main` 時，`.github/workflows/deploy.yml` 會建置並以 `wrangler deploy` 發布為 Cloudflare Worker `opendss`（名稱設定在 `vite.config.ts`），以 Workers 自訂網域綁定 `opendss.esperar-ai.org`。只改文件或 `.claude/` 不會觸發部署；也可在 Actions 頁面手動執行。

需要的 repo secret：`CLOUDFLARE_API_TOKEN`（Cloudflare「Edit Cloudflare Workers」範本建立的 API token）與 `CLOUDFLARE_ACCOUNT_ID`。

## 授權

OpenDSS 引擎 © Electric Power Research Institute, Inc.，BSD-3 授權，全文見 [engine/port/OPENDSS_LICENSE.txt](engine/port/OPENDSS_LICENSE.txt)。KLU 等稀疏矩陣元件為 LGPL 2.1，見 [engine/port/licenses/](engine/port/licenses/)。本網站為實驗性移植，非 EPRI 認證或支援的版本。
