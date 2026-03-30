# Noma v0.1.0-alpha.6

> 말이 아니라, 실행.

한국형 AI 에이전트 데스크톱 앱입니다. 터미널 없이 더블클릭으로 설치하고 실행할 수 있습니다.

## 설치 방법

### macOS
1. `.dmg` 파일을 다운로드합니다 (Apple Silicon: arm64, Intel: 일반)
2. 마운트 후 `Noma.app`을 Applications 폴더로 드래그합니다
3. "확인되지 않은 개발자" 경고 시: 시스템 설정 > 개인 정보 보호 및 보안 > "확인 없이 열기"

### Windows
1. `.exe` 인스톨러를 다운로드합니다
2. SmartScreen 경고 시: "자세한 정보" → "실행"
3. 설치 완료 후 바탕화면에서 Noma를 실행합니다

> Node.js나 터미널 설치는 필요 없습니다 — 앱에 모두 포함되어 있습니다.

## 첫 실행

1. 앱을 실행하면 온보딩 화면이 표시됩니다
2. "시작하기"를 클릭하면 대시보드로 이동합니다
3. Gateway가 자동으로 시작됩니다 (최초 실행 시 최대 60초 소요)

## 시작하기 — AI 연결

Noma는 AI 모델에 연결해야 동작합니다.

### ChatGPT 계정이 있다면 (추천)
대시보드 → Settings → Providers → ChatGPT 로그인 → 바로 사용

### ChatGPT 계정이 없다면
1. https://aistudio.google.com 접속
2. "Get API key" → "Create API key"
3. Noma 대시보드 → Settings → Providers → Google AI → 키 붙여넣기

> AI 연결 후 바로 해볼 수 있는 것: 로또 당첨번호, KBO 경기 결과, 미세먼지 조회, 파일 관리
> 추가 설정이 필요한 것: 네이버 검색, 우편번호, 지하철 (각각 API 키 필요)

## 포함된 KR 스킬 (12개)

| 스킬 | 설명 | API 키 |
|---|---|---|
| 로또 결과 | 당첨번호 조회 | 불필요 |
| KBO 경기 | 프로야구 결과 | 불필요 |
| 미세먼지 | 실시간 대기질 | 불필요 |
| 택배 배송조회 | CJ대한통운/우체국 | 불필요 |
| HWP 변환 | .hwp → 텍스트/마크다운 | 불필요 |
| 블루리본 맛집 | 맛집 검색 | 불필요 |
| 다이소 재고 | 상품/재고 검색 | 불필요 |
| SRT 시간표 | 열차 조회 | 불필요 |
| 서울 지하철 | 실시간 도착 | 서울시 API 키 |
| 우편번호 | 도로명주소 검색 | juso.go.kr 키 |
| 네이버 검색 | 뉴스/블로그 | 네이버 API 키 |

## v0.1.0-alpha 대비 변경사항

- Electron 35 업그레이드 (Node.js 22.16 내장 → gateway 자동시작 안정화)
- Gateway 자동시작 (터미널 불필요)
- 온보딩 화면
- 타임아웃 30초→60초 + 재시도 강화
- Windows 설치 지원 (알파 테스트 중)
- 두 번째 실행 시 기존 창 포커스 (Windows)
- Gateway 로그 파일 (~/.openclaw/gateway.log)
- 카카오 스킬 서버 + ngrok 터널 앱 시작 시 자동 시작

## 알려진 제한사항

- 첫 실행 시 Gateway 시작에 최대 60초 소요될 수 있습니다
- Windows 빌드는 알파 테스트 중입니다
- 일부 KR 스킬은 외부 API 키가 필요합니다
- 메모리 기능은 현재 비활성화 상태입니다

## 카카오톡 원격 제어 (실험적)

앱 시작 시 카카오 스킬 서버 + ngrok 터널이 자동으로 시작됩니다.
카카오톡에서 **@noma-kr** 채널을 추가하면 모바일에서도 AI 에이전트를 사용할 수 있습니다.

> 요구사항: ngrok이 설치되어 있어야 합니다 (`brew install ngrok` 또는 ngrok.com에서 다운로드).
> ngrok이 없으면 카카오 기능만 비활성화되고 데스크톱 앱은 정상 동작합니다.

## 링크

- [설치 가이드](https://github.com/noma-openproject/openclaw-kr/blob/main/docs/install-guide.md)
- [GitHub Issues](https://github.com/noma-openproject/openclaw-kr/issues) — 버그 리포트/피드백

## 라이선스

MIT (OpenClaw 코어와 동일)
