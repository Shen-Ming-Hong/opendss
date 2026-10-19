# OpenDSS 雲端工作台經驗紀錄

格式：`## [範圍] 一句話規則`，下面寫問題、規則、證據、相關檔案各一行。同一根因只留一條。檔案保持在 20 KB 以內。

## [部署] 不要從雲端 session 直接 wrangler deploy
- 問題：session 的出口代理會覆寫 api.cloudflare.com 的 Authorization，上傳靜態檔時回 401。
- 規則：部署一律走 GitHub 的 Deploy Action；session 只打唯讀 API（用量、Worker 狀態、deployments）。
- 證據：2026-10 初次部署時 wrangler 上傳失敗，改走 Action 後成功。
- 相關檔案：`.github/workflows/deploy.yml`

## [正式站檢查] 打正式站用 curl，不要用 Python urllib
- 問題：Python urllib 的請求會被 Cloudflare 擋成 403。
- 規則：curl 檢查 API；Node 的 fetch 不走代理，也連不到。瀏覽器測試用 `visual-check.mjs --production`（會自動帶 HTTPS_PROXY）。
- 證據：PR #2–#8 的部署後檢查。
- 相關檔案：`scripts/visual-check.mjs`

## [引擎] 每次計算都要新的 WASM 實例
- 問題：原生引擎 Clear 之後仍會殘留狀態，共用實例會讓前一個模型影響下一個。
- 規則：`engine/runtime.ts` 每個請求建立新實例，不要改成共用。
- 證據：`scripts/check-engine.py` 的 state cleanup 檢查。
- 相關檔案：`engine/runtime.ts`

## [本機 dev] dev 伺服器回「Network connection lost」時，整組重開
- 問題：workerd 子程序掛掉後，vite 對每個請求都回 500。用 `pkill -f` 比對字串時會連自己的 shell 一起砍掉。
- 規則：用 `ps` 找出 run-framework 與 workerd 的 PID 逐一 kill，再用 `nohup npm run dev -- --host 127.0.0.1 &` 重開。
- 證據：2026-10-19 兩次重開都靠這個方法恢復。
- 相關檔案：`scripts/run-framework.mjs`

## [分支] 合併用 squash，舊分支不能直接接著用
- 問題：PR 以 squash 合併，本機分支的歷史和 origin/main 不同，直接接著開發會帶進已合併的舊提交。
- 規則：每個任務都從最新的 `origin/main` 開新分支；誤從舊分支開時，用 `git rebase --onto origin/main` 只搬本任務的提交。
- 證據：PR #8 開出時誤帶舊提交，rebase 後只剩一筆。
- 相關檔案：無
