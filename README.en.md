# OpenDSS Cloud Workbench

[繁體中文](README.md) | [简体中文](README.zh-CN.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md)

Live site: https://opendss.esperar-ai.org

A web interface that keeps the native OpenDSS menus and script workflow. It runs a WASM port of EPRI OpenDSS (the official C++ VersionC) and computes on Cloudflare Workers. The site is public and needs no sign-in.

## Usage

Open a `.dss` file with the files it references, or a whole model folder; pick the main script and compile. You can run a snapshot power flow or a fault study, or use "As set by script" to run modes such as Daily or Harmonics. View bus voltages, terminal-1 element currents/powers and fault currents, and export CSV, JSON or Show/Export text reports.

The "Plot" tab offers a bus voltage plot, a circuit plot (Plot Circuit, needs Buscoords), a voltage profile (Plot Profile, needs an EnergyMeter) and curves (Plot Monitor, can draw any CSV report).

Every action recompiles the main script and then applies the extra commands. To produce a text report after modifying elements, enter `Edit …`, `Solve`, `Show …` in that order. The Solve button solves in the selected mode after the extra commands have run.

Drafts are stored in the current browser and are not synced between devices. Use "File → Download full project" to save one, then open the `.opendss.json` on another device. A model is sent to the cloud only when you compile or solve, and it is never written to permanent storage.

Model paths must be relative. A single run accepts up to 100 files and 2 MB; output is capped at 2,000 buses and 5,000 elements. Large or long computations are still bound by Worker CPU and memory limits. Native DLLs, COM, external system commands and parallel Actors are not supported. Full compatibility with every native feature has not been verified.

## Interface languages

The interface supports 7 languages: Traditional Chinese, Simplified Chinese, English, Japanese, Korean, Spanish and Brazilian Portuguese. It follows the browser language by default (Taiwan, Hong Kong and Traditional Chinese settings get Traditional Chinese, other Chinese settings get Simplified Chinese, and English is used when no language matches). You can switch from the top-right of the title bar; the choice is remembered in the browser. Non-English interfaces show the English term next to technical terms (for example "匯流排電壓 Bus Voltages"); OpenDSS commands, element names and report contents stay in English.

The string dictionaries live in [lib/i18n.ts](lib/i18n.ts) and [lib/locales/](lib/locales/): the code is written with the Traditional Chinese source text wrapped in `t()`, and every language dictionary is keyed by that source text. Server error messages are translated there too. To add a language, add an entry to `languages`, add a dictionary under `lib/locales/`, and update `detectLang` and `legacyEncoding`. Languages other than Traditional Chinese and English were translated by Claude and have not been reviewed by native speakers; reports on wording are welcome.

This README is also available in the languages listed at the top. The Traditional Chinese version is authoritative.

## Local development

```sh
npm ci
npm run dev -- --host 127.0.0.1
npx tsc --noEmit
python scripts/check-engine.py   # requires the dev server
node engine/port/test/run.mjs    # checks the WASM directly: source 500.21 kW, load-end fault 22,902.3 A
npx tsx scripts/check-i18n.ts     # completeness of every language dictionary
node scripts/visual-check.mjs    # requires the dev server: desktop/laptop/tablet/phone interaction tests and screenshots (including plots and switching to English)
npm run build
```

All checks run locally (or in a cloud development environment); GitHub Actions only deploys.

The home page and the compute API can be used anonymously. Each request runs the model in its own WASM instance; the API keeps same-origin checks and file path and size validation, and stores no user tables or model files.

For the WASM source, rebuild steps, license notices and numerical validation, see [engine/port/README.md](engine/port/README.md).

## Deployment

On every push to `main`, `.github/workflows/deploy.yml` builds the site and publishes it with `wrangler deploy` as the Cloudflare Worker `opendss` (the name is set in `vite.config.ts`), bound to `opendss.esperar-ai.org` through a Workers custom domain. Changes to documentation or `.claude/` alone do not trigger a deployment; the workflow can also be run manually from the Actions page.

Required repo secrets: `CLOUDFLARE_API_TOKEN` (an API token created from Cloudflare's "Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID`.

## License

The OpenDSS engine is © Electric Power Research Institute, Inc., under the BSD-3 license; see [engine/port/OPENDSS_LICENSE.txt](engine/port/OPENDSS_LICENSE.txt) for the full text. Sparse-matrix components such as KLU are LGPL 2.1; see [engine/port/licenses/](engine/port/licenses/). This site is an experimental port and is not a version certified or supported by EPRI.
