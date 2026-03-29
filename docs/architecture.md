# 아키텍처

## 제품 구조 (4층)

```
┌─────────────────────────────────────────────┐
│           사용자 (prosumer/creator)           │
├──────────────────┬──────────────────────────┤
│  데스크톱 앱      │  카카오 원격면             │
│  (Electron)      │  (모바일 리모컨)           │
│  주 통제면        │  Safe Mode 적용           │
├──────────────────┴──────────────────────────┤
│              OpenClaw 코어 (MIT)              │
│         localhost:18789 dashboard            │
├──────────────────┬──────────────────────────┤
│  KR 스킬팩        │  Trust 기본값             │
│  (네이버, 카카오   │  (alpha-secure 프로필)    │
│   등 한국 서비스)  │  (ask_before_execute)    │
├──────────────────┴──────────────────────────┤
│              AI 제공자 연결                    │
│  ChatGPT OAuth │ Gemini API │ Ollama 로컬    │
└─────────────────────────────────────────────┘
```

## 데이터 흐름

### 데스크톱 앱 경로 (주 경로)

```
사용자 → Electron 앱 → OpenClaw dashboard (localhost:18789)
                      → OpenClaw 코어
                      → AI 제공자 (ChatGPT/Gemini/Ollama)
                      → KR 스킬 실행
                      → 결과 표시
```

### 카카오 원격면 경로

```
사용자 (모바일) → 카카오톡 메시지
              → 카카오 플러그인 → OpenClaw 코어
              → AI 제공자
              → KR 스킬 실행 (Safe Mode 제한)
              → 카카오톡 응답
```

## 계층별 상세

### 1. 데스크톱 앱 (Electron thin launcher)

- **역할**: OpenClaw dashboard를 데스크톱 앱으로 감싸는 thin wrapper
- **기술**: Electron + contextIsolation
- **위치**: `launcher/main.js`, `launcher/preload.js`
- **특징**:
  - OpenClaw 코어에 의존 (자체 백엔드 없음)
  - 보안: contextIsolation, nodeIntegration OFF
  - 대시보드 URL: `http://localhost:18789`

### 2. 카카오 원격면

- **역할**: 모바일에서 에이전트를 제어하는 리모컨
- **위치**: `plugins/kakao-entry/`
- **Safe Mode**: write/edit/browser 기본 OFF (최소 권한)
- **상태**: Day 3 구현 예정. 카카오 API 제한 시 텔레그램 브릿지 대안.

### 3. KR 스킬팩

- **역할**: 한국 서비스 연동 (네이버 검색, 카카오 등)
- **위치**: `packages/verified-kr-skills/`
- **설계 원칙**: API-first, Browser-last
- **배포**: ClawhHub managed skill 또는 workspace skill
- **첫 스킬**: 네이버 검색 (Day 4)

### 4. Trust 기본값

- **역할**: 비기술 사용자를 위한 안전한 기본 설정
- **위치**: `packages/permission-profiles/alpha-secure.json`
- **원칙**: 모든 것을 막고, 필요한 것만 열기
- **프로필**: alpha-secure (가장 제한적, 현재 유일)

## OpenClaw 코어와의 관계

```
openclaw-kr (downstream)
    │
    ├── npm install -g openclaw@2026.3.23-2  (코어 사용)
    ├── 설정 오버라이드 (packages/permission-profiles/)
    ├── 스킬 추가 (packages/verified-kr-skills/)
    ├── UI wrapper (launcher/)
    ├── 채널 추가 (plugins/kakao-entry/)
    └── 패치 큐 (patches/upstream-openclaw/)

    ※ 코어 소스 수정 없음. npm 패키지로만 참조.
```

## 보안 아키텍처

```
[사용자 입력] → [ask_before_execute 게이트]
              → [alpha-secure 프로필 필터]
              → [도구 허용/차단 (tools.deny)]
              → [OpenClaw 코어 실행]
              → [결과 표시]

카카오 경로: + [Safe Mode 추가 필터]
            (write/edit/browser OFF)
```
