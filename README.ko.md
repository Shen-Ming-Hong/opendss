# OpenDSS 클라우드 워크벤치(OpenDSS Cloud Workbench)

[繁體中文](README.md) | [简体中文](README.zh-CN.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md)

공식 사이트: https://opendss.esperar-ai.org

OpenDSS 고유의 메뉴와 스크립트 작업 흐름을 그대로 유지한 웹 인터페이스입니다. EPRI OpenDSS(공식 C++ 버전 VersionC)의 WASM 이식판을 사용하며 Cloudflare Workers에서 계산합니다. 사이트는 공개되어 있으며 로그인이 필요 없습니다.

## 사용법

`.dss` 파일과 참조하는 파일, 또는 모델 폴더 전체를 열고 메인 스크립트를 선택한 뒤 컴파일합니다. 정상상태 조류계산(Snapshot), 고장 해석(FaultStudy)을 실행하거나 「스크립트 설정대로」로 Daily, Harmonics 등의 모드를 실행할 수 있습니다. 모선 전압(Bus Voltages), 1번 단자의 소자 전류/전력, 고장 전류(Fault Currents)를 확인하고 CSV, JSON 또는 Show/Export 텍스트 보고서로 내보낼 수 있습니다.

「플롯」 탭에서는 모선 전압 그래프, 회로도(Plot Circuit, Buscoords 필요), 전압 프로파일(Plot Profile, EnergyMeter 필요), 그래프(Plot Monitor, 모든 CSV 보고서를 그릴 수 있음)를 제공합니다.

작업할 때마다 메인 스크립트를 다시 컴파일한 뒤 추가 명령을 적용합니다. 소자를 수정한 후 텍스트 보고서를 만들려면 `Edit …`, `Solve`, `Show …` 순서로 입력하세요. 해석 버튼은 추가 명령이 끝난 뒤 선택한 모드로 해석합니다.

초안은 현재 브라우저에 저장되며 기기 간에 자동으로 동기화되지 않습니다. 「파일 → 전체 프로젝트 다운로드」로 저장한 뒤 다른 기기에서 `.opendss.json`을 여세요. 모델은 컴파일하거나 해석할 때만 클라우드로 전송되며 영구 저장소에는 기록되지 않습니다.

모델 경로는 상대 경로를 사용합니다. 한 번에 최대 100개 파일, 2 MB까지이며 출력은 최대 2,000개 모선, 5,000개 소자입니다. 대규모이거나 오래 걸리는 계산은 여전히 Worker의 CPU/메모리 제한을 받습니다. 네이티브 DLL, COM, 외부 시스템 명령, 병렬 Actor는 지원하지 않습니다. 모든 네이티브 기능과의 호환성은 아직 검증되지 않았습니다.

## 인터페이스 언어

현재 7개 언어를 지원합니다: 繁體中文, 简体中文, English, 日本語, 한국어, Español, Português (Brasil). 기본적으로 브라우저 언어를 따르며(대만, 홍콩 및 번체 중국어 설정은 번체 중국어, 그 밖의 중국어 설정은 간체 중국어, 해당 언어가 없으면 영어), 제목 표시줄 오른쪽 위에서 바꿀 수 있고 선택한 언어는 브라우저에 기억됩니다. 영어가 아닌 인터페이스에서는 전문 용어 옆에 영어를 함께 표시합니다(예: 「모선 전압 Bus Voltages」). OpenDSS 명령, 소자 이름, 보고서 내용은 영어로 유지됩니다.

문구 사전은 [lib/i18n.ts](lib/i18n.ts)와 [lib/locales/](lib/locales/)에 있습니다. 코드에는 번체 중국어 원문을 쓰고 `t()`로 감싸며, 각 언어 사전은 그 원문을 키로 사용합니다. 서버 오류 메시지도 여기에서 번역합니다. 언어를 추가하려면 `languages`에 항목을 하나 추가하고 `lib/locales/`에 사전을 하나 추가한 뒤 `detectLang`과 `legacyEncoding`을 갱신하세요. 번체 중국어와 영어 외의 언어는 Claude가 번역했으며 아직 원어민의 검토를 거치지 않았습니다. 용어에 대한 의견을 환영합니다.

이 README는 위에 나열된 각 언어 버전으로도 제공되며, 내용은 번체 중국어 버전을 기준으로 합니다.

## 로컬 개발

```sh
npm ci
npm run dev -- --host 127.0.0.1
npx tsc --noEmit
python scripts/check-engine.py   # dev 서버를 먼저 실행
node engine/port/test/run.mjs    # WASM 직접 검증: 전원 500.21 kW, 부하단 고장 22,902.3 A
npx tsx scripts/check-i18n.ts     # 각 언어 사전의 완전성
node scripts/visual-check.mjs    # dev 서버를 먼저 실행: 데스크톱/노트북/태블릿/휴대폰 상호작용 테스트와 스크린샷(플롯과 영어 전환 포함)
npm run build
```

검증은 모두 로컬(또는 클라우드 개발 환경)에서 수행하며, GitHub Actions는 배포만 담당합니다.

홈페이지와 계산 API는 모두 익명으로 사용할 수 있습니다. 모델은 요청마다 독립된 WASM 인스턴스에서 실행되며, API는 동일 출처 확인과 파일 경로 및 크기 검증을 유지하고 사용자 데이터 테이블이나 모델 파일을 저장하지 않습니다.

WASM 출처, 재빌드 방법, 라이선스 고지, 수치 검증은 [engine/port/README.md](engine/port/README.md)를 참고하세요.

## 배포

`main`에 push하면 `.github/workflows/deploy.yml`이 빌드한 뒤 `wrangler deploy`로 Cloudflare Worker `opendss`(이름은 `vite.config.ts`에서 설정)로 게시하고, Workers 사용자 지정 도메인으로 `opendss.esperar-ai.org`에 연결합니다. 문서나 `.claude/`만 바꾸면 배포가 실행되지 않으며, Actions 페이지에서 수동으로 실행할 수도 있습니다.

필요한 repo secret: `CLOUDFLARE_API_TOKEN`(Cloudflare 「Edit Cloudflare Workers」 템플릿으로 만든 API 토큰)과 `CLOUDFLARE_ACCOUNT_ID`.

## 라이선스

OpenDSS 엔진은 © Electric Power Research Institute, Inc.이며 BSD-3 라이선스입니다. 전문은 [engine/port/OPENDSS_LICENSE.txt](engine/port/OPENDSS_LICENSE.txt)를 참고하세요. KLU 등 희소 행렬 구성 요소는 LGPL 2.1이며 [engine/port/licenses/](engine/port/licenses/)에 있습니다. 이 사이트는 실험적인 이식판이며 EPRI가 인증하거나 지원하는 버전이 아닙니다.
