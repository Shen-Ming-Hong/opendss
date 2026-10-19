# OpenDSS クラウドワークベンチ（OpenDSS Cloud Workbench）

[繁體中文](README.md) | [简体中文](README.zh-CN.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md)

公開サイト：https://opendss.esperar-ai.org

OpenDSS 本来のメニューとスクリプトによる作業の流れをそのまま残した Web インターフェースです。EPRI OpenDSS（公式 C++ 版 VersionC）の WASM 移植版を使い、Cloudflare Workers 上で計算します。サイトは一般公開されており、ログインは不要です。

## 使い方

`.dss` ファイルと参照先のファイル、またはモデルのフォルダ全体を開き、メインスクリプトを選んでコンパイルします。定常潮流計算（Snapshot）や故障計算（FaultStudy）を実行できるほか、「スクリプトの設定どおり」で Daily や Harmonics などのモードも実行できます。母線電圧（Bus Voltages）、第 1 端子の要素電流／電力、故障電流（Fault Currents）を確認し、CSV、JSON、Show/Export のテキストレポートとして書き出せます。

「プロット」タブには、母線電圧グラフ、回路図（Plot Circuit、Buscoords が必要）、電圧プロファイル（Plot Profile、EnergyMeter が必要）、グラフ（Plot Monitor、任意の CSV レポートを描画可能）があります。

操作のたびにメインスクリプトを再コンパイルしてから追加コマンドを適用します。要素を変更したあとにテキストレポートを作るときは、`Edit …`、`Solve`、`Show …` の順に入力してください。求解ボタンは、追加コマンドの実行後に選択中のモードで求解します。

下書きは使用中のブラウザに保存され、デバイス間では自動同期されません。「ファイル → プロジェクト全体をダウンロード」で保存し、別のデバイスで `.opendss.json` を開いてください。モデルがクラウドに送られるのはコンパイルまたは求解のときだけで、永続ストレージには書き込まれません。

モデルのパスは相対パスで指定します。1 回あたり最大 100 ファイル・2 MB、出力は最大 2,000 母線・5,000 要素です。大規模または時間のかかる計算は、引き続き Worker の CPU／メモリ制限を受けます。ネイティブ DLL、COM、外部システムコマンド、並列 Actor には対応していません。ネイティブ機能すべての互換性はまだ検証されていません。

## インターフェースの言語

現在 7 言語に対応しています：繁體中文、简体中文、English、日本語、한국어、Español、Português (Brasil)。既定ではブラウザの言語に従い（台湾・香港・繁体字中国語の設定では繁体字、その他の中国語設定では簡体字、対応する言語がない場合は英語）、タイトルバー右上で切り替えられます。選択はブラウザに記憶されます。英語以外のインターフェースでは専門用語の横に英語を併記します（例：「母線電圧 Bus Voltages」）。OpenDSS のコマンド、要素名、レポートの内容は英語のままです。

文言の辞書は [lib/i18n.ts](lib/i18n.ts) と [lib/locales/](lib/locales/) にあります。コードには繁体字中国語の原文を書いて `t()` で囲み、各言語の辞書はその原文をキーにしています。サーバーのエラーメッセージもここで翻訳します。言語を追加するときは、`languages` に項目を 1 つ加え、`lib/locales/` に辞書を 1 つ加え、`detectLang` と `legacyEncoding` を更新します。繁体字中国語と英語以外は Claude が翻訳したもので、ネイティブスピーカーによる校正はまだです。用語についてのご指摘を歓迎します。

この README は上部に挙げた各言語版もあります。内容は繁体字中国語版を正とします。

## ローカル開発

```sh
npm ci
npm run dev -- --host 127.0.0.1
npx tsc --noEmit
python scripts/check-engine.py   # 先に dev を起動しておく
node engine/port/test/run.mjs    # WASM を直接検証：電源 500.21 kW、負荷端の故障 22,902.3 A
npx tsx scripts/check-i18n.ts     # 各言語辞書の網羅性
node scripts/visual-check.mjs    # 先に dev を起動しておく：デスクトップ／ノート PC／タブレット／スマートフォンの操作テストとスクリーンショット（プロットと英語への切り替えを含む）
npm run build
```

検証はすべてローカル（またはクラウドの開発環境）で行います。GitHub Actions はデプロイだけを担当します。

トップページと計算 API はどちらも匿名で利用できます。モデルはリクエストごとに独立した WASM インスタンスで実行されます。API は同一オリジンの確認、ファイルパスとサイズの検証を行い、ユーザーのデータテーブルやモデルファイルは保存しません。

WASM の出所、再ビルドの方法、ライセンス表記、数値検証については [engine/port/README.md](engine/port/README.md) を参照してください。

## デプロイ

`main` に push すると、`.github/workflows/deploy.yml` がビルドし、`wrangler deploy` で Cloudflare Worker `opendss`（名前は `vite.config.ts` で設定）として公開します。Workers のカスタムドメインで `opendss.esperar-ai.org` に割り当てています。ドキュメントや `.claude/` だけの変更ではデプロイされません。Actions ページから手動で実行することもできます。

必要な repo secret：`CLOUDFLARE_API_TOKEN`（Cloudflare の「Edit Cloudflare Workers」テンプレートで作成した API トークン）と `CLOUDFLARE_ACCOUNT_ID`。

## ライセンス

OpenDSS エンジンは © Electric Power Research Institute, Inc.、BSD-3 ライセンスです。全文は [engine/port/OPENDSS_LICENSE.txt](engine/port/OPENDSS_LICENSE.txt) を参照してください。KLU などの疎行列コンポーネントは LGPL 2.1 です（[engine/port/licenses/](engine/port/licenses/)）。このサイトは実験的な移植であり、EPRI が認定またはサポートするバージョンではありません。
