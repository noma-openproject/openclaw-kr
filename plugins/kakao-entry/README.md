# 카카오 연동

## 개요

카카오톡을 통해 OpenClaw 에이전트를 원격 제어하는 "카카오 원격면"을 구현한다.
모바일에서 에이전트에게 간단한 지시를 내리는 리모컨 역할.

## 설계 목표

1. **간편함**: 카카오톡에서 메시지를 보내면 에이전트가 동작
2. **안전함**: Safe Mode로 위험한 작업 차단
3. **가벼움**: 텍스트 기반 커맨드만 지원 (파일 전송 등은 Phase 2)

## Safe Mode 정책

카카오 원격면은 데스크톱보다 제한적인 환경이다.
실수로 위험한 작업을 트리거하는 것을 방지한다.

### 기본 설정 (`safe-mode-config.json`)

| 권한 | 기본값 | 이유 |
|---|---|---|
| write | OFF | 파일 쓰기 차단 |
| edit | OFF | 파일 수정 차단 |
| browser | OFF | 브라우저 자동화 차단 |
| read | ON | 파일 읽기 허용 |
| search | ON | 검색 허용 |

### Safe Mode 해제

사용자가 명시적으로 해제할 수 있지만:
1. 해제 시 확인 메시지 표시
2. 세션 단위로만 해제 (다음 세션에서 다시 ON)
3. 해제 이력 로깅

## 기술 구현 방향

### 카카오 API 옵션

1. **카카오톡 채널 (추천)**: 비즈니스 채널 → 챗봇 → 웹훅
2. **카카오 i 오픈빌더**: 챗봇 시나리오 빌더
3. **카카오 REST API**: 직접 메시지 송수신

### 아키텍처

```
카카오톡 → 카카오 웹훅 → [중계 서버] → OpenClaw 코어
                                      ← 응답
                       ← 카카오 응답 ← [중계 서버]
```

### 주요 과제

- 카카오 API가 봇/자동화를 제한할 수 있음 (리스크 R03)
- 중계 서버가 필요할 수 있음 (로컬 OpenClaw에 외부 접근)
- 인증/세션 관리

## 진행 상태

### Day 3 (2026-03-26) — 챗봇 생성 + 채널 연결 완료

| 단계 | 상태 | 비고 |
|---|---|---|
| 카카오 비즈니스 로그인 | ✅ | suyujeo@gmail.com |
| 챗봇 생성 | ✅ | 봇명: "openclaw-kr", ID: `69c53d4c45b6624e9317cef8` |
| 카카오톡 채널 연결 | ✅ | 채널명: "Noma", ID: @noma-kr, IT > 정보통신/SW |
| 챗봇-채널 연결 | ✅ | 운영채널: Noma 연결 완료 |
| 초기 배포 | ✅ | v1.0, 2026-03-26 23:55, 전체 배포 |

### Day 4 (2026-03-27) — 스킬 서버 구현

| 단계 | 상태 | 비고 |
|---|---|---|
| relay.js (gateway 중계) | ✅ | `/v1/chat/completions` HTTP API, 4초 타임아웃 |
| index.js (웹훅 핸들러) | ✅ | Node `http`, bot.id 검증, Safe Mode 프리필터 |
| test/echo.test.js | ✅ | 10/10 테스트 통과 (mock gateway) |
| 스킬 서버 등록 | 🔲 | i.kakao.com → 스킬 메뉴에 터널 URL 등록 |
| round-trip 테스트 | 🔲 | 카카오톡 → 스킬 서버 → OpenClaw → 응답 |

**다음 단계**: 터널(cloudflared/ngrok) 설정 → 스킬 등록 → 실제 카카오톡 round-trip 테스트

## 실행 방법

```bash
# 사전 조건: Chat Completions 활성화 (1회)
npx openclaw config set gateway.http.endpoints.chatCompletions.enabled true

# 스킬 서버 실행
npm run kakao

# 테스트
npm run test:kakao
```

## 구현 일정

- **Day 3**: 챗봇 생성 + 채널 연결 완료
- **Day 4**: 스킬 서버 구현 완료 (index.js + relay.js + 테스트)
- **Day 4~5**: 터널 + 스킬 등록 + round-trip 테스트
- **Phase 1**: 카카오 완성 (콜백 API + Safe Mode 해제 + 에러 핸들링)

## 파일 구조

```
kakao-entry/
├── README.md              # 이 파일
├── safe-mode-config.json  # Safe Mode 기본 설정
├── index.js               # 카카오 웹훅 핸들러 (port 3001)
├── relay.js               # OpenClaw gateway 중계 모듈
└── test/
    └── echo.test.js       # 통합 테스트 (10 cases)
```

## 대안 (블록 시)

카카오 API가 봇 사용을 제한할 경우:

1. **텔레그램 브릿지**: OpenClaw가 이미 텔레그램을 지원. 한국 사용자에게는 익숙하지 않지만 기술적으로 안정.
2. **슬랙 연동**: 업무용으로 활용 가능.
3. **자체 모바일 웹**: PWA로 모바일 접근 제공.
