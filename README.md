# Noma

> 말이 아니라, 실행.

터미널 없이 AI 에이전트를 설치하고 실행할 수 있는 한국형 데스크톱 앱.
카카오톡으로 외출 중에도 내 PC의 에이전트를 원격 제어합니다.

OpenClaw MIT 코어 위에 데스크톱 런처 + 카카오 리모컨 + 한국 서비스 스킬 + 보안 기본값을 얹은 downstream 배포판입니다.

## 다운로드

> v0.1.0-alpha — 첫 알파 릴리스

| OS | 다운로드 | 비고 |
|---|---|---|
| macOS (Apple Silicon) | [Noma-0.1.0-alpha-arm64.dmg](https://github.com/suyujeo-cpu/openclaw-kr/releases/download/v0.1.0-alpha/Noma-0.1.0-alpha-arm64.dmg) | M1/M2/M3/M4 |
| macOS (Intel) | [Noma-0.1.0-alpha.dmg](https://github.com/suyujeo-cpu/openclaw-kr/releases/download/v0.1.0-alpha/Noma-0.1.0-alpha.dmg) | Intel Mac |
| Windows | [Noma-0.1.0-alpha-Setup.exe](https://github.com/suyujeo-cpu/openclaw-kr/releases/download/v0.1.0-alpha/Noma-0.1.0-alpha-Setup.exe) | Windows 10/11 |

> 사전 준비: Node.js 22.16+ 및 OpenClaw 설치 필요. 상세는 [Release Notes](https://github.com/suyujeo-cpu/openclaw-kr/releases/tag/v0.1.0-alpha) 참고.

## 왜 Noma인가

| 기존 방식 | Noma |
|---|---|
| 터미널에서 직접 실행 | 데스크톱 앱에서 클릭 한 번 |
| 영어 중심 설정 | 한국어 가이드 + 한국 서비스 연동 |
| 보안 설정 수동 | 검증된 보안 기본값 내장 |
| PC 앞에서만 제어 | 카카오톡으로 외출 중에도 제어 |

## Phase 0 완료 항목

- Electron thin launcher (macOS)
- 카카오톡 원격 제어 (채널: @noma-kr, 챗봇: openclaw-kr)
- 네이버 검색 스킬 (첫 번째 한국 서비스 스킬)
- 보안 기본값 (alpha-secure 프로필)
- 비동기 AI 응답 콜백 API

## 시스템 요구사항

- **OS**: macOS (Windows는 Phase 1 예정)
- **Node.js**: 24 권장 (22.16+ 최소)
- **npm**: 최신 버전

## 빠른 시작

### 1. 환경 체크

```bash
git clone <이 저장소>
cd openclaw-kr
bash scripts/setup-check.sh
```

### 2. 의존성 설치

```bash
npm install
```

글로벌 설치 없이 `npx openclaw` 명령으로 실행됩니다. EACCES 에러가 발생하면 로컬 설치만으로 충분합니다.

### 3. OpenClaw 초기 설정

```bash
npx openclaw config set gateway.mode local
npx openclaw config set gateway.port 18789
```

### 4. Gateway + 런처 실행

```bash
# 터미널 1: gateway 시작
npx openclaw gateway --port 18789

# 터미널 2: 데스크톱 런처
npm start
```

Electron 창이 열리며 OpenClaw 대시보드(`http://localhost:18789`)가 표시됩니다.

### 5. 카카오 스킬 서버 (선택)

```bash
npm run kakao
```

포트 3001에서 카카오 스킬 서버가 시작됩니다.

## 프로젝트 구조

```
openclaw-kr/
├── launcher/                          # Electron thin launcher
├── plugins/
│   └── kakao-entry/                   # 카카오 원격 제어 (index.js + relay.js)
├── packages/
│   ├── verified-kr-skills/            # 한국 서비스 스킬팩 (네이버 검색 등)
│   └── permission-profiles/           # OpenClaw 보안 프로필
├── scripts/                           # 유틸리티 스크립트
├── docs/                              # 프로젝트 문서
└── patches/upstream-openclaw/         # 업스트림 패치 큐
```

## 스크립트

```bash
npm start                # Electron 런처 실행
npm run kakao            # 카카오 스킬 서버 실행 (포트 3001)
npm run lint             # ESLint 검사
npm run typecheck        # 타입 검사
npm run test:kakao       # 카카오 연동 테스트
npm run test:visual      # Playwright 시각 테스트
```

## 기술 스택

| 항목 | 버전/내용 |
|---|---|
| Runtime | Node.js 24 (22.16+ 최소) |
| Desktop | Electron 33 |
| Core | OpenClaw 2026.3.23-2 (npm, 소스 비수정) |
| Lint | ESLint 9 + Prettier |
| Visual test | Playwright |

## 로드맵

- **Phase 0** (완료): macOS 런처, 카카오 리모컨, 네이버 검색 스킬, 보안 기본값
- **Phase 1** (완료): 운영 안정화 — 실행 영수증, 비용 가시성, Browser Guard, Windows 빌드, CI/CD
- **Phase 2** (진행 중): 생태계 확장 — KR 스킬팩 11개, 커뮤니티 배포, 활성 사용자 100+

## 기여

이 프로젝트는 OpenClaw MIT 코어의 downstream 배포판입니다.

- OpenClaw 코어 이슈는 [OpenClaw 저장소](https://github.com/openclaw/openclaw)에 제출해주세요.
- 한국 로컬라이제이션 관련 이슈는 이 저장소에 제출해주세요.

## 라이선스

MIT (OpenClaw 코어와 동일)
