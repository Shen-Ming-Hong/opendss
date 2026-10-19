# OpenDSS-C（EPRI 官方 VersionC）→ WebAssembly 移植

本目錄取代原本以 GitHub `epri-dev/OpenDSS-C`（2024-07 快照）為上游的移植。上游改為 EPRI 官方 SourceForge 程式庫中的 C++ 版本，該程式庫根目錄的 `License.txt` 為 BSD-3 授權（全文見 `OPENDSS_LICENSE.txt`）。

- 上游：https://sourceforge.net/p/electricdss/code/HEAD/tree/trunk/VersionC/
- 固定版本：SVN r4176，`Current_ver.txt` 為 `myDSSversion=11.0.0.1`（最近更新 2026-09-05）
- 授權：https://sourceforge.net/p/electricdss/code/HEAD/tree/trunk/License.txt
- 編譯工具：Emscripten SDK `6.0.12`、CMake、Ninja

## 重建

```sh
svn export -r 4176 https://svn.code.sf.net/p/electricdss/code/trunk/VersionC OpenDSS-C
# 補丁以 LF 行尾製作；先把原始碼統一成 LF
find OpenDSS-C -type f \( -name '*.cpp' -o -name '*.h' -o -name '*.hpp' -o -name '*.c' -o -name '*.inc' -o -name '*.txt' -o -name '*.cmake' -o -name '*.json' \) -print0 | xargs -0 sed -i 's/\r$//'
git -C OpenDSS-C init -q && git -C OpenDSS-C apply /absolute/path/to/portability.patch
git clone https://github.com/emscripten-core/emsdk.git
./emsdk/emsdk install 6.0.12 && ./emsdk/emsdk activate 6.0.12
source emsdk/emsdk_env.sh
emcmake cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build -j 6
```

建置資料夾需放入本目錄的 `CMakeLists.txt`、`bridge.cpp`、`shim/`。產物 `build/OpenDSSWasm.mjs` 改名為網站的 `engine/wasm/opendss.mjs`，`build/OpenDSSWasm.wasm` 複製到 `engine/wasm/`。`wasm/` 內是本次已編譯好的版本。

## 相對舊版的差異

- 補丁改套到 VersionC：96 個檔案、+862／-817 行，仍以複數型別限定、wasm32 整數、單 Actor 同步求解、靜態 KLU 為主。
- VersionC 已自帶 macOS 相容路徑與 `KLUSOLVE_COMPLEX` 機制；本移植讓 Emscripten 走 macOS 的 locale／langinfo 路徑，Linux 專用標頭與 `exit_group` 以 `__EMSCRIPTEN__` 排除。
- 編譯定義新增 `KLUSOLVE_COMPLEX=Ucomplex::complex`、`OPENDSSC_PROJECT_VERSION="11.0.0.1"`。
- 新增來源：`Controls/pyControl.cpp`、`PCElements/WTG3_Model.cpp`、`General/CNTSLineConstants.cpp`。移除 `Meters/LD_fm_infos.cpp`（上游已刪）。
- `GenModels`（gencls、genrou）與 `GenControls`（ExcSexs、tgov）在上游改列實驗功能（`OPENDSSC_EXPERIMENTAL`），本版不編入。
- `bridge.cpp`、`shim/` 與 Emscripten 連結參數未變，網站 `engine/runtime.ts` 不需修改。

## 驗證

`node test/run.mjs <IEEE 123 測試資料夾>`：

- 簡單饋線：電源 500.21347947628 kW／164.769014694521 kvar，負載端三相故障電流 22,902.3 A。
- IEEE 123：132 個匯流排、237 個元件，電源 3615.2419 kW；與舊版 WASM 電壓完全相同，與 OpenDSSDirect.py 0.9.4 最大電壓差 1.9×10⁻¹⁴ p.u.。

以上在 Node 執行，並以 wrangler 4 本機 workerd 實測潮流與故障分析結果相同（靜態匯入 `CompiledWasm`）。換入網站後請照 `scripts/check-engine.py` 再驗證一次。

## 著作權與隨附元件

OpenDSS 原始碼 © 2008–2021 Electric Power Research Institute, Inc.，以 BSD-3 授權散布，散布原始碼或二進位檔時須保留 `OPENDSS_LICENSE.txt` 的著作權與免責聲明。KLU、AMD、BTF、COLAMD、CSparse、KLUSolve 為 LGPL 2.1，授權檔沿用網站 `engine/port/licenses/`。本移植為實驗版本，非 EPRI 認證或支援的版本。
