# OpenDSS 云端工作台（OpenDSS Cloud Workbench）

[繁體中文](README.md) | [简体中文](README.zh-CN.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md)

正式站：https://opendss.esperar-ai.org

保留 OpenDSS 原生菜单与脚本工作流程的网页界面，使用 EPRI OpenDSS（官方 C++ 版 VersionC）的 WASM 移植，在 Cloudflare Workers 上执行计算。网站公开提供使用，无需登录。

## 使用

打开 `.dss` 及其引用的文件，或整个模型文件夹；选择主脚本后编译。可执行稳态潮流（Snapshot）、故障分析（FaultStudy），或用「按脚本设置」运行 Daily、Harmonics 等模式；查看母线电压（Bus Voltages）、第一端元件电流／功率与故障电流（Fault Currents），并导出 CSV、JSON 或 Show/Export 文本报表。

「绘图」标签页提供母线电压图、电路图（Plot Circuit，需要 Buscoords）、电压分布（Plot Profile，需要 EnergyMeter）与曲线图（Plot Monitor，可绘制任一 CSV 报表）。

每次操作都会重新编译主脚本，再套用额外命令。修改元件后要生成文本报表时，请依次输入 `Edit …`、`Solve`、`Show …`。求解按钮会在额外命令执行完毕后，再按选定模式求解。

草稿保存在当前浏览器，不会在设备间自动同步。可通过「文件 → 下载完整项目」保存，再在其他设备打开 `.opendss.json`。只有编译或求解时才会把模型发送到云端；模型不会写入永久存储。

模型路径使用相对路径。单次最多 100 个文件、2 MB，输出最多 2,000 条母线、5,000 个元件；大型或耗时的计算仍受 Worker CPU／内存限制。不支持原生 DLL、COM、外部系统命令和并行 Actor。完整的原生功能兼容性尚未验证。

## 界面语言

目前支持 7 种语言：繁體中文、简体中文、English、日本語、한국어、Español、Português (Brasil)。默认跟随浏览器语言（台湾、香港及繁体中文设置显示繁体中文，其他中文设置显示简体中文，没有对应语言时显示英文），可在标题栏右上角切换，选择会记在浏览器中。非英文界面的专业术语旁会附上英文（例如「母线电压 Bus Voltages」）；OpenDSS 命令、元件名称与报表内容保持英文。

文字字典位于 [lib/i18n.ts](lib/i18n.ts) 与 [lib/locales/](lib/locales/)：代码中写繁体中文原文并用 `t()` 包起来，各语言字典以繁体中文原文为键，服务器错误信息也在这里翻译。新增语言时，在 `languages` 中加一项、在 `lib/locales/` 中加一份字典，并补上 `detectLang` 与 `legacyEncoding`。除繁体中文与英文外，其他语言由 Claude 翻译，尚未经母语人士校对，欢迎反馈用词。

本说明文件也有上方列出的各语言版本，内容以繁体中文版为准。

## 本地开发

```sh
npm ci
npm run dev -- --host 127.0.0.1
npx tsc --noEmit
python scripts/check-engine.py   # 需先启动 dev
node engine/port/test/run.mjs    # 直接验证 WASM：电源 500.21 kW、负载端故障 22,902.3 A
npx tsx scripts/check-i18n.ts     # 各语言字典完整性
node scripts/visual-check.mjs    # 需先启动 dev：桌面／笔记本／平板／手机交互测试与截图（含绘图与切换英文）
npm run build
```

验证都在本地（或云端开发环境）完成；GitHub Actions 只负责部署。

首页与计算 API 都可匿名使用。模型在每个请求独立的 WASM 实例内执行；API 保留同源检查、文件路径与大小验证，不存储用户数据表或模型文件。

WASM 来源、重建方法、许可声明与数值验证见 [engine/port/README.md](engine/port/README.md)。

## 部署

推送到 `main` 时，`.github/workflows/deploy.yml` 会构建并以 `wrangler deploy` 发布为 Cloudflare Worker `opendss`（名称设置在 `vite.config.ts`），通过 Workers 自定义域名绑定 `opendss.esperar-ai.org`。只修改文档或 `.claude/` 不会触发部署；也可以在 Actions 页面手动执行。

需要的 repo secret：`CLOUDFLARE_API_TOKEN`（用 Cloudflare「Edit Cloudflare Workers」模板创建的 API token）与 `CLOUDFLARE_ACCOUNT_ID`。

## 许可

OpenDSS 引擎 © Electric Power Research Institute, Inc.，采用 BSD-3 许可，全文见 [engine/port/OPENDSS_LICENSE.txt](engine/port/OPENDSS_LICENSE.txt)。KLU 等稀疏矩阵组件为 LGPL 2.1，见 [engine/port/licenses/](engine/port/licenses/)。本网站为实验性移植，并非 EPRI 认证或支持的版本。
