# 진행 중인 계획

> ExecPlan 규칙에 따라 복잡한 기능의 계획을 기록한다.
> 형식: AGENTS.md의 "PLANS.md 계획 형식" 참조.

---

## 프로젝트 초기 스캐폴딩 + 세팅 — done

**목표**: openclaw-kr 프로젝트 파일 구조 + 기술 스택 + 운영 규칙 + 디자인 파이프라인 + 보안 체크리스트
**제안서 기준**: v3.2.2 (6개 redline 반영)
**승인일**: 2026-03-26

### 완료 항목
1. [x] 디렉토리 구조 + 루트 파일 (CLAUDE.md, AGENTS.md, PLANS.md, README.md, package.json)
2. [x] 기술 스택 설정 (TypeScript, ESLint 9, Prettier, Playwright)
3. [x] CLAUDE.md 정제: 기술 스택 + 외부 컨텍스트 보안 + 시각 검증 + 상황 감지 매핑
4. [x] docs/design-pipeline.md (Stitch→Figma→구현→Playwright 검증)
5. [x] docs/supply-chain-checklist.md (§7-3a 공급망 보안)
6. [x] 운영 규칙 3파일 체계 + 자동 규칙 적용 매핑 CLAUDE.md 반영
7. [x] v3.2.2 제안서 반영 (참조 업데이트 + 사람 확인 항목 go-no-go.md 추가)

---

## Day 1: OpenClaw baseline + launcher — done

**목표**: OpenClaw 설치 → dashboard 확인 → ChatGPT OAuth → launcher 프레임워크 결정
**결과**: **GO** — 3개 필수 테스트 모두 통과
**승인일**: 2026-03-26

### 실행 결과
1. [x] OpenClaw 2026.3.23-2 로컬 설치 (글로벌 EACCES → npx 우회)
2. [x] gateway 실행 + dashboard HTTP 200 (포트 18789 확인)
3. [x] openai-codex OAuth로 에이전트 행동 1회 성공 (gpt-5.4, 9,525 토큰)
4. [ ] Ollama — 미설치, 보조선으로 유지 (Test 2 통과로 필수 아님)
5. [x] Electron launcher 정상 실행 (PID 유지)
6. [x] go-no-go.md 결과 기록 완료

### 발견 사항
- OpenClaw provider prefix: `openai-codex/` (OAuth), `openai/` (API key) 구분 필요
- 단순 인사에 9,477 input 토큰 → Token Saver Mode 중요성 확인
- gateway 기본 모델이 anthropic/claude-opus-4-6 → 명시적으로 변경 필요

---

## Day 2: launcher 강화 — done

**목표**: POC launcher → 실사용 가능한 launcher
**승인일**: 2026-03-26

### 실행 결과
1. [x] fallback.html — gateway 미실행 시 한국어 안내 + 자동 재연결
2. [x] macOS dock 유지 (darwin 패턴)
3. [x] IPC status API (`openclawKR.getStatus()`)
4. [x] gateway 토큰 인증 (`.openclaw/openclaw.json`에서 읽기)
5. [x] 컨텍스트 관리: `.claude/rules/self-check.md` + `memory-protocol.md`

---

## Day 3: 네이버 검색 스킬 + 카카오 채널 — done

**목표**: OpenClaw 스킬 시스템 검증 + 첫 KR 스킬 동작
**순서 근거**: 스킬 파이프라인 미검증 상태에서 카카오 연동하면 디버깅 3방향 → 스킬 먼저 검증

### 실행 결과
1. [x] SKILL.md + scripts/naver-search.sh 구현 (weather 스킬 패턴)
2. [x] OpenClaw skills list에 등록 확인 (agents-skills-personal)
3. [x] 네이버 API key 발급 (Chrome 자동화 + 사용자 로그인)
4. [x] end-to-end 테스트 통과 (AI 뉴스 5,898,706건 중 3건 표시)
5. [x] 카카오 챗봇 "openclaw-kr" 생성 (ID: 69c53d4c45b6624e9317cef8)
6. [x] 카카오톡 채널 "Noma" 생성 (@noma-kr, IT > 정보통신/SW)
7. [x] 챗봇-채널 연결 + 배포 v1.0 (2026-03-26 23:55)
8. [x] 스킬 서버 구현 (plugins/kakao-entry/index.js + relay.js) → Day 4로 이동

---

## Day 4: 카카오 스킬 서버 — done

**목표**: 카카오톡 → 스킬 서버 → OpenClaw gateway → 응답 round-trip 완성
**승인일**: 2026-03-27

### 실행 결과
1. [x] Chat Completions HTTP 엔드포인트 활성화 (`gateway.http.endpoints.chatCompletions.enabled`)
2. [x] relay.js 구현 — `/v1/chat/completions` API, 4초 타임아웃, Safe Mode 시스템 프롬프트
3. [x] index.js 구현 — Node `http` 서버, bot.id 검증, Safe Mode 프리필터, rate limiter
4. [x] test/echo.test.js — 10/10 테스트 통과 (mock gateway)
5. [x] package.json 스크립트 추가 (`npm run kakao`, `npm run test:kakao`)
6. [x] cloudflared 터널 설정 (request-garlic-medical-legs.trycloudflare.com)
7. [x] i.kakao.com 스킬 등록 (noma-relay, 폴백 블록 스킬데이터 연결, v1.2 배포)
8. [x] 카카오톡 round-trip 성공 — "처리 중" 응답 확인 (LLM ~6초 > 2초 타임아웃)

**발견**: LLM 응답 시간이 카카오 5초 제한을 초과. 콜백 API(Phase 1) 또는 빠른 모델 필요.

---

## Day 5: 콜백 API + 통합 smoke test — done

**목표**: 카카오 콜백 API로 LLM 실제 AI 응답 비동기 전달 + Phase 0 전체 smoke test
**근거**: Day 4 발견 — LLM ~6초 > 카카오 5초 제한. 공식 콜백 기능 확인 (kakaobusiness.gitbook.io)
**승인일**: 2026-03-27

### 콜백 API 구현 계획

**동작 흐름:**
1. 카카오가 `userRequest.callbackUrl` (1회용, 유효 1분) 포함해 POST
2. 스킬 서버가 즉시 `{ version: "2.0", useCallback: true }` 반환 (< 1초)
3. 백그라운드에서 `relayToGateway()` 실행 (타임아웃 55초로 확장)
4. 완료 후 `callbackUrl`로 POST (카카오 스킬 응답 포맷)

**수정 파일:**
- `plugins/kakao-entry/relay.js` — `sendCallback()` 함수 추가, `CALLBACK_TIMEOUT_MS` 상수
- `plugins/kakao-entry/index.js` — `handleSkillRequest()`에 callbackUrl 감지 + 비동기 분기
- `plugins/kakao-entry/test/echo.test.js` — 콜백 모드 테스트 케이스 추가
- 오픈빌더 콘솔 — 폴백 블록 콜백 옵션 ON + 재배포

### 실행 결과
1. [x] relay.js에 `sendCallback()` + `relayToGatewayForCallback()` 함수 추가
2. [x] relay.js에 `CALLBACK_TIMEOUT_MS` (55초) 상수 추가
3. [x] index.js `handleSkillRequest()`에 callbackUrl 감지 + 비동기 분기 추가
4. [x] echo.test.js에 콜백 모드 테스트 3개 추가 (13/13 전체 통과)
5. [x] AI 챗봇 콜백 사용 신청 → 즉시 승인 (설정 > AI 챗봇 관리)
6. [x] 스킬 URL 갱신 + v1.5 배포
7. [x] 카카오톡 round-trip 확인 — 동기 모드 "처리 중" 응답 정상 수신
8. [x] 통합 smoke test: lint 0 errors + typecheck clean + 13/13 tests
9. [x] eslint.config.js Node.js 글로벌 추가 (Buffer, URL, setTimeout 등)

**발견**: 폴백 블록은 callbackUrl을 포함하지 않음. 콜백 API는 일반 블록에서만 동작.
**다음 단계**: 일반 블록 생성 + 콜백 옵션 ON, 또는 빠른 모델로 5초 내 동기 응답 시도.

---

## Day 6: Phase 0 마무리 — done

**목표**: 카카오 콜백 round-trip 완성 + 터널 안정화 + 테스트/문서/Windows 산출물
**근거**: Day 5 발견 (폴백→일반 블록 전환 필요) + Phase 0 마무리 산출물 미완성
**승인일**: 2026-03-27

### 리서치 결과 (Day 6)
- 카카오 일반 블록 콜백: 블록 상세에서 "콜백 API" 토글 ON. 코드 변경 불필요.
- cloudflared 네임드 터널: `cloudflared tunnel create` + config.yml로 영구 URL.
- OpenClaw v2026.3.24: 3.23-2 이후 패치, 주요 변경 없음. 고정 버전 유지.
- Windows: electron-builder 크로스빌드 가능 (Wine 필요). CI/CD 매트릭스 권장.
- alpha-secure.json: project-context.md 설정값과 정확히 일치 확인.

### 실행 결과
1. [x] 카카오 일반 블록("AI 대화") 생성 + 콜백 ON + v1.6/1.7 배포 + AI 응답 round-trip 성공
2. [x] 고정 터널 설정 — Cloudflare named tunnel 도메인 필수로 불가 → ngrok 무료 고정 도메인(`nonexhortative-gwenn-unbreaded.ngrok-free.dev`)으로 전환. `scripts/tunnel-ngrok.sh` 자동 재시작 스크립트.
3. [x] tests/launcher-smoke.spec.js Playwright smoke test 작성 (3개 테스트)
4. [x] README.md Phase 0 완료 수준 업데이트
5. [ ] Windows smoke-test 문서화 — Phase 1로 이동
6. [x] go-no-go.md + project-context.md + PLANS.md 최종 정리

---

## Phase 1: 운영 안정화 — done

**목표**: "설치 셸 → 운영 셸" 전환. 기능 추가보다 안정성/가시성/복구력 우선.
**근거**: Phase 0 중간점검 피드백 + 생태계 변화 (DefenseClaw, ClawHavoc, 3/26 보안 권고, 커뮤니티 신호)
**방향 합의**: 2026-03-27 (사용자 승인)

### 우선순위
1. stable relay (named tunnel / cloud deploy) — quick tunnel 4회+ 만료 해소
2. 실행 영수증 + observability-lite — 상태/비용/실패 가시성
3. auth preflight + embeddings/memory 검증 — OAuth 경로 + 3.24 /v1/embeddings 테스트
4. Windows smoke-test — electron-builder + CI/CD
5. Cheap Team Mini / Handoff Mini — Planner/Executor 2역할
6. DefenseClaw 스캔 통합 검토 — Cisco MIT skill-scanner

### 항목
1. [x] stable relay — quick tunnel + watchdog 스크립트 (`scripts/tunnel-watchdog.sh`). 자동 재시작 + URL 변경 감지 + macOS 알림. 카카오 v1.8 배포 완료.
2. [x] 실행 영수증 + observability-lite — React+Tailwind+Vite UI 도입. session-watcher.js(JSONL tail-follow), BrowserView 듀얼 패널, 4-state 머신(idle/running/finished/failed), 비용 누적 추적. 컴포넌트: ReceiptPanel, StatusBadge, ExecutionCard, CostSummary, TokenMeter.
3. [x] 비용 가시성 최소 구현 — Day 2에 CostSummary+TokenMeter(토큰 추적 UI) 구현, Day 5에 역할별 비용(_estimateCost), Day 6에 modelBreakdown(모델별 사용 분포+비용+횟수) 추가. SessionCostSummary에 ModelUsageEntry[] 포함.
4. [x] auth preflight + memory/embeddings 검증 — launcher checkAuthPreflight() + relay validateToken() hard fail + verify-embeddings.js 프로브. 결과: 3.23-2에 /v1/embeddings 없음, memorySearch:false 확인. 3.24 test lane 필요.
5. [x] Receipt UI Playwright 시각 검증 — 8/8 통과. `tests/receipt-ui.spec.js` + `tests/fixtures/receipt-mock-data.js` + `playwright.config.js` receipt-ui 프로젝트. screenshots: `tests/screenshots/receipt-*.png`.
6. [x] Windows smoke-test — electron-builder 설정 완료. macOS DMG 빌드 성공 (arm64+x64). `electron-builder.yml` + `package.json` build scripts + `.github/workflows/build.yml` CI/CD 매트릭스 (macOS+Windows). placeholder 아이콘. Windows 빌드는 CI/CD에서 실행 (Wine 미설치).
7. [x] DefenseClaw skill-scanner 통합 검토 — scripts/scan-skill.js(DefenseClaw CLI 래퍼+수동 체크리스트+정적 분석), docs/defenseclaw-evaluation.md(평가 보고서). 5항목 중 3항목 자동화 가능 확인. Phase 2에서 launcher UI 통합 예정.
8. [x] Cheap Team Mini + Handoff Mini — Planner→Executor 자동 체이닝 + 로컬 JSON 핸드오프. gateway-client.js(공통 HTTP), team-orchestrator.js(체이닝), handoff-writer.js(JSON 기록), team-config.json(역할→모델 매핑). Receipt UI에 RoleBadge+TeamToggle+역할별 비용. Kakao relay team 분기. 28/28 테스트.
9. [x] Browser cleanup guard — cleanupBrowserResources() in main.js. before-quit에서 receiptView webContents 종료 + watcher 리스너 해제 + BrowserWindow 순회 destroy + macOS Chrome Helper 잔여 프로세스 정리. 모든 단계 try-catch.
10. [x] Upgrade Guard / Known Good Versions — scripts/capability-audit.js(스냅샷+diff) + scripts/rollback-version.js(known-good 롤백) + main.js 버전 로그. 스냅샷→~/.openclaw/audits/, diff로 전후 비교. 72시간 관찰 원칙 코드화.

### 생태계 반영 사항
- DefenseClaw (Cisco, 3/27): active integration candidate → 항목 6
- NemoClaw (NVIDIA): Phase 2 통합 검토로 이동
- ClawHavoc: verified-only + supply-chain-checklist 강화 확인
- 한국 대기업 금지: "보안 기본값 한국형 운영 셸" 포지션 강화

### 참조 문서
- 중간점검 피드백: `docs/midcheck-2026-03-27.md`
- 외부 Delta: `docs/project-context.md` "이번 주 외부 Delta" 섹션
- Known Issues: `docs/project-context.md` "Known Issues Watchlist" 섹션
- 보안/거버넌스 도구: `tool-landscape-snapshot-2026-03.md` §7~8

---

## Phase 1 보충: 지식문서 v3.2.4 P0 항목 — done

**목표**: Phase 1 완료 후 지식문서 v3.2.4에서 추가된 P0 항목 반영
**승인일**: 2026-03-29

### 실행 결과
1. [x] Provider Doctor 2.0 (`scripts/provider-doctor.js`) — provider/env key/model ref/Docker env/memory embeddings 한 번에 검사. 7개 검사 항목, JSON 결과 저장.
2. [x] Memory Healthcheck (`scripts/memory-healthcheck.js`) — indexed files/chunks>0 확인, embeddings 프로브, "ready인데 index=0" 모순 탐지, auto-disable 권고.
3. [x] ClawHub-first 배포 전략 (`docs/clawhub-deploy-strategy.md`) — publisher 등록 절차, 1차/2차 배포 대상, alpha-secure 호환 확인.

---

## Phase 2-1: KR 스킬팩 확장 — done

**목표**: 한국 서비스 대상 스킬 5개+ 구현. NomaDamas/k-skill (MIT) 선별 통합.
**승인일**: 2026-03-28

### 실행 결과

#### 인프라
1. [x] 공유 유틸 (`_shared/kr-skill-utils.js`) — formatError/Info/Warn, stripHtml, requireEnv, createRateLimiter, fetchJson, formatResults. 14 tests.
2. [x] git init + k-skill submodule (`packages/k-skill/`) — 업스트림 변경 자동 추적. blue-ribbon/daiso 심볼릭 링크.

#### 자체 구현 스킬 (5개)
3. [x] HWP 문서 변환 (`hwp-convert/`) — @ohah/hwpjs 0.1.0-rc.10 MIT. JSON/MD/HTML/text 4포맷. 10 tests.
4. [x] 서울 지하철 (`seoul-metro/`) — 서울시 공공데이터 API. 역명 정규화, rate limit. 12 tests.
5. [x] 우편번호 검색 (`postal-code/`) — juso.go.kr 공식 API. 10 tests.
6. [x] SRT 조회 (`srt-query/`) — etk.srail.kr 비공식, 조회 전용. 16 tests.
7. [x] 택배 배송조회 (`delivery-tracking/`) — CJ대한통운/우체국 공식 엔드포인트. Node.js 구현. 12 tests.

#### k-skill 통합 스킬 (4개)
8. [x] 로또 결과 (`lotto-results/`) — k-lotto npm 패키지. 6 tests.
9. [x] KBO 경기 결과 (`kbo-scores/`) — kbo-game npm 패키지. 6 tests.
10. [x] 미세먼지 (`fine-dust/`) — k-skill-proxy 경유 에어코리아. 8 tests.
11. [x] 블루리본 맛집 (`blue-ribbon/`) — k-skill 소스 심볼릭 링크. 8 tests.
12. [x] 다이소 재고 (`daiso-search/`) — k-skill 소스 심볼릭 링크. 5 tests.

#### SKILL.md 포맷 통일
13. [x] 기존 5개 스킬 SKILL.md → k-skill 표준 포맷 교체 (What/When to use, Workflow, Done when, Failure modes)
14. [x] 모든 k-skill 포크에 Attribution 명기

### 품질 게이트
- lint: 0 errors
- typecheck: clean
- 테스트: 125/125 (스킬 107 + 카카오 18)

---

## 커뮤니티 배포 스프린트 (Day 0 + 5일) — active

**목표**: GPters에 "다운로드해서 써보세요" 포스트. 활성 사용자 100+를 향한 첫 걸음.
**배포 방식**: ngrok 무료 고정 도메인 (로컬 OpenClaw + 고정 URL). Cloudflare named tunnel은 도메인 필수라서 포기.
**성공 기준**: 설치→첫 대화 10분 이내, 터미널 0회, 카카오 24시간 무중단

| Day | 작업 | 산출물 | 상태 |
|---|---|---|---|
| 0 | ngrok 고정 도메인 설정 + cloudflared 제거 + 카카오 스킬 URL 교체 | 고정 URL | [x] |
| 1 | GitHub Actions CI → .exe/.dmg + Release v0.1.0-alpha | 다운로드 링크 | [ ] |
| 2 | 원클릭 설치(터미널 0회) + gateway 자동시작 + 에러 한국어화 | 더블클릭→첫 대화 | [ ] |
| 3 | 온보딩 화면 + API키 없이 되는 데모(로또/KBO/우편번호) + 샘플 3개 | 즉시 체험 | [ ] |
| 4 | 스크린샷 5장 + GIF 2개 + GPters 포스트 초안 + 설치 가이드 | 커뮤니티 자료 | [ ] |
| 5 | 다른 머신 QA + Release 퍼블리시 + GPters 게시 | **첫 외부 노출** | [ ] |

---

## Phase 2-2 이후: 생태계 확장 (원칙 P-13) — pending

| # | 항목 | 상태 | 성공 지표 |
|---|---|---|---|
| 2-2 | 활성 사용자 100+ | 대기 | 주간 활성 설치 수 |
| 2-3 | 커뮤니티 기여자 5+ | 대기 | PR/이슈/스킬 기여 |
| 2-4 | 비개발자 타겟 확대 | 대기 | 설치 성공률 |
| 2-5 | Cheap Team Full (3역할) | 대기 | 데모 완성도 |
| 2-6 | Handoff Full (다수 백플레인) | 대기 | 연동 수 |
| 2-7 | 외부 팀 협력 1건+ | 대기 | 공동 스킬/PR |

> **원칙 P-13**: "첫 유료 고객"은 Phase 2 목표가 아님. 생태계 선점이 먼저. 수익화는 Phase 4(6개월+).
