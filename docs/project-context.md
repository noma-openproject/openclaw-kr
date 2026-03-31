# openclaw-kr 프로젝트 컨텍스트

> 이 파일은 프로젝트의 기술 스택, 진행 상황, 보안 설정 등 컨텍스트 정보를 담는다.
> 운영 규칙은 `CLAUDE.md`에, 상세 규칙은 `.claude/rules/`에 있다.

## 프로젝트 핵심 정보

- **프로젝트명**: openclaw-kr (브랜드: **Noma**, 슬로건: "말이 아니라, 실행.")
- **제안서**: `openclaw-kr-proposal-v3.2.4.docx` (전략/구조/로드맵/리스크 전체)
- **전략**: OpenClaw MIT 코어를 그대로 사용하는 **downstream 배포판**. 하드 포크가 아님.
- **비전**: 비개발자도 터미널 없이 AI 에이전트를 설치·실행·운영할 수 있는 한국형 데스크톱 앱. 비용 가시성, 실행 상태, 실패 복구까지 포함.
- **핵심 차별화**: 카카오톡 안의 AI 챗봇이 아니라, 내 컴퓨터에서 돌아가는 내가 소유하는 AI 실행 셸. 카카오톡은 리모컨.
- **타겟 사용자**: ChatGPT를 이미 쓰지만 터미널은 싫은 한국 prosumer / creator / 솔로프리너

## 기술 스택

| 레이어 | 기술 | 비고 |
|---|---|---|
| 런타임 | Node.js 22.16 (Electron 35 내장) | Electron + OpenClaw 공유 |
| 데스크톱 셸 | Electron 35 (thin launcher) | OpenClaw dashboard 래핑. Node 22.16 내장 |
| 코어 | OpenClaw 2026.3.23-2 (npm) | 소스 수정 금지 |
| Phase 1+ UI | React + TypeScript + Tailwind + shadcn/ui | Antigravity Policy 제3조 |
| 디자인 | Stitch → Figma+MCP → 구현 → Playwright 검증 | `docs/design-pipeline.md` |
| 린트/포맷 | ESLint 9 + Prettier | TypeScript strict |
| 시각 검증 | Playwright | 라운드트립 패턴 (§19-9) |

## 제품 구조 (4층)

| 층 | 역할 | 구현 위치 |
|---|---|---|
| 데스크톱 앱 | 주 통제면 (Electron thin launcher) | `launcher/` |
| Noma Relay | 카카오→로컬 라우팅 프록시 (Vercel) | `noma-relay/` |
| 카카오 원격면 | 리모컨 (모바일 접근) + Safe Mode | `plugins/kakao-entry/` |
| KR 스킬팩 | 한국 서비스 연동 (API-first, Browser-last) | `packages/verified-kr-skills/` |
| Trust 기본값 | 보안 프로필 + Safe Mode | `packages/permission-profiles/` |

## 버전 고정

OpenClaw `2026.3.23-2` / Electron 35 (Node 22.16 내장) / 브라우저: `existing-session` / ClawhHub 우선.
설치: `npm install -g openclaw@2026.3.23-2`. 상세: `docs/version-pinning.md`

## 보안 기본값 (alpha 프로필)

| 설정 | 값 | 이유 |
|---|---|---|
| ask_before_execute | ON | 모든 실행 전 사용자 확인 |
| install | deny | 무단 패키지 설치 차단 |
| 스킬 추천 | verified-only | ClawhHub 검증 스킬만 |
| image 도구 | 비활성화 | workspace 우회 취약점 (3월 advisory) |
| agents.create/update | 비활성화 | symlink traversal (3월 advisory) |
| Kakao Safe Mode | write/edit/browser 기본 OFF | 원격면 최소 권한 |

설정 파일: `packages/permission-profiles/alpha-secure.json`

## 포크 정책

downstream (MIT 코어 따라감). Atomic Bot 코드 복사 금지 (PolyForm). 상세: `docs/fork-policy.md`

## AI 연결 경로

| 우선순위 | 제공자 | 방식 | 비고 |
|---|---|---|---|
| 메인 | ChatGPT | OAuth | 한국 MAU 2,293만, 계정 친숙도 1위. 메모리 검색 기본 OFF |
| 보조1 | Gemini | API key free tier | OAuth 아닌 API key만 |
| 보조2 | Ollama | 로컬 | privacy/offline, 기본 추천 아님 |
| 고급 | 직접 연결 | API key | 비개발자 온보딩에서 숨김 |

> **Day 1 발견**: provider prefix 주의 — `openai-codex/gpt-5.4`(OAuth) vs `openai/gpt-5.4`(API key).

## 실사용 병목 대응 (v3.2)

Token Saver(memorySearch OFF), 실행 영수증(/status), Kakao Safe Mode(write/edit/browser OFF), API-first 스킬(API→로컬→브라우저 순서). 상세: 제안서 섹션 4-2.

## 진행 상황

**Day 1** (2026-03-26): GO 판정. Test 1+2+3 통과. time-to-first-action ~12분.
**Day 2** (2026-03-26): launcher 강화 (fallback HTML + macOS dock + IPC + gateway 토큰 인증).
**Day 3** (2026-03-26): 네이버 검색 스킬 완성 + 카카오톡 채널 "Noma" + 챗봇 연결 + 배포 v1.0.
**Day 4** (2026-03-27): 카카오 스킬 서버 구현 (index.js + relay.js + 10/10 테스트) + round-trip 성공.
**Day 5** (2026-03-27): 콜백 API 구현 (relay.js + index.js) + 13/13 테스트 + AI챗봇 콜백 승인 + v1.5 배포 + smoke test 통과.

**발견 (Day 5)**: 폴백 블록은 callbackUrl 미포함 → 콜백은 일반 블록에서만 동작. cloudflared quick tunnel 불안정 (세션 중 3회 만료).

**Day 6** (2026-03-27): 일반 블록("AI 대화") + 콜백 ON → AI 응답 round-trip 성공. README Phase 0 완료 수준 업데이트. Playwright smoke test 추가. go-no-go 업데이트 (콜백 성공, alpha-secure 매핑 확인). OpenClaw v2026.3.24 확인 (고정 버전 유지).

**발견 (Day 6)**: Quick tunnel Day 4-6에서 총 4회+ 만료. 네임드 터널 또는 클라우드 배포 필요. electron-builder Windows 크로스빌드 가능 (Wine 필요, CI/CD 매트릭스 권장).

**중간점검 (2026-03-27)**: Phase 0 성공 완료 판정. "설치 셸 → 운영 셸" 방향 전환 합의. Phase 1 우선순위 재정렬 (안정성/가시성 우선). 생태계 변화(DefenseClaw, ClawHavoc, 보안 권고) 반영. 상세: `docs/midcheck-2026-03-27.md`

**Phase 1 Day 1** (2026-03-27): stable relay 구현 — watchdog 스크립트(`scripts/tunnel-watchdog.sh`) 작성 (자동 재시작 + URL 변경 감지 + macOS 알림). 카카오 스킬 URL 업데이트 + v1.8 배포. 터널 public URL 통한 health check 확인.

**Phase 1 Day 2** (2026-03-28): 실행 영수증 + observability-lite — React+Tailwind+Vite UI 도입 (`launcher/ui/`). session-watcher.js로 OpenClaw JSONL tail-follow. BrowserView 듀얼 패널(dashboard + receipt). 4-state 머신(idle/running/finished/failed). 세션 비용 누적 추적. 컴포넌트 5개(ReceiptPanel, StatusBadge, ExecutionCard, CostSummary, TokenMeter). lint 0 errors + typecheck clean + 16/16 tests.

**Phase 1 Day 3** (2026-03-28): auth preflight + embeddings/memory 검증 + Receipt UI 시각 검증. launcher/main.js에 checkAuthPreflight() 추가 (토큰+gateway 사전 점검). relay.js에 validateToken() hard fail 전환 (토큰 없으면 즉시 실패). scripts/verify-embeddings.js 프로브 스크립트 작성. 결과: 3.23-2에 /v1/embeddings 없음, alpha-secure memorySearch:false 확인. Receipt UI Playwright 시각 검증 8개 상태 커버.

**Phase 1 Day 4** (2026-03-28): Windows smoke-test + electron-builder + CI/CD. electron-builder 설정 (`electron-builder.yml`), macOS DMG 빌드 성공 (arm64+x64, ~194MB/199MB). GitHub Actions CI/CD 매트릭스 (macOS+Windows) 워크플로우 작성. placeholder 아이콘 생성 스크립트 (`scripts/generate-placeholder-icon.js`). Windows 빌드는 CI/CD에서 실행 예정.

**Phase 1 Day 5** (2026-03-28): Cheap Team Mini + Handoff Mini. Planner(저비용 모델)→Executor(고성능 모델) 자동 체이닝 오케스트레이터. gateway-client.js(공통 HTTP 통신 모듈 추출), team-orchestrator.js(2역할 체이닝), handoff-writer.js(로컬 JSON 핸드오프 기록), team-config.json(역할→모델 매핑). Receipt UI에 RoleBadge+TeamToggle+역할별 비용 표시. Kakao relay team 모드 자동 분기. lint 0 errors + typecheck clean + 28/28 tests.

**Phase 1 Day 6** (2026-03-28): 비용 가시성 보완 + Browser cleanup guard + Upgrade Guard. 모델별 사용 분포(ModelUsageEntry, modelBreakdown) CostSummary에 추가. main.js cleanupBrowserResources() — receiptView 종료 + watcher 리스너 해제 + macOS Chrome Helper 정리. capability-audit.js(스냅샷+diff) + rollback-version.js(롤백) + 시작 시 버전 로그.

**다음 (Phase 1 — 운영 안정화)**:
- ~~1순위: stable relay~~ ✅ Phase 1 Day 1
- ~~2순위: 실행 영수증 + observability-lite~~ ✅ Phase 1 Day 2
- ~~3순위: auth preflight + embeddings/memory 검증~~ ✅ Phase 1 Day 3
- ~~4순위: Windows smoke-test + 배포 경로~~ ✅ Phase 1 Day 4
- ~~5순위: Cheap Team Mini / Handoff Mini~~ ✅ Phase 1 Day 5
- ~~6순위: 비용 가시성 + Browser cleanup + Upgrade Guard~~ ✅ Phase 1 Day 6
- ~~7순위: DefenseClaw 통합 검토~~ ✅ Phase 1 Day 6
- **Phase 1 항목 10/10 완료 (100%)**

**커뮤니티 배포 스프린트 Day 5** (2026-03-29~30):
- 3대 블로커 수정: (1) 터미널 불필요 ✅, (2) Gateway 자동시작 — Electron 33→35 업그레이드로 근본 해결 ✅, (3) Windows 빌드 — CI 완료, 실테스트 진행 중
- **근본 원인**: Electron 33(Node 20.18) vs openclaw(Node 22.12+) 버전 불일치 → spawn 시 silent exit
- **기각된 접근**: `resolveNodeBin()` (시스템 Node 사용) — "exe만 설치하면 되는 게 아니게 된다"
- **채택**: Electron 35 업그레이드 (내장 Node 22.16, 별도 설치 불필요)
- **추가 원인**: asarUnpack이 openclaw만 포함 → 의존성(tslog 등) 누락 → `node_modules/**` 전체 unpack
- **추가**: requestSingleInstanceLock (Windows 두 번째 실행 수정) + gateway.log 파일 기록
- **카카오 자동시작**: main.js에서 gateway 성공 후 카카오 스킬 서버(port 3001) + ngrok 터널 자동 spawn. ngrok 미설치 시 graceful 비활성화.
- **v0.1.0-alpha.7**: 카카오 자동시작 포함 + 버전 통일. CI 완료, GitHub Release 게시 완료.
- 현재 릴리즈: **v0.1.0-alpha.7** — Windows QA 통과 ✅ (대시보드 정상 로드) + 카카오 자동시작 포함

**Noma Relay + 카카오 개인 페어링** (2026-03-31):
- Noma Relay 배포: `https://noma-relay.vercel.app` (Vercel serverless + Upstash Redis KV)
- 카카오 스킬 URL: Relay 경유 (`/api/kakao`) — 직접 ngrok가 아님
- 페어링 흐름: 앱에서 코드 생성 → Relay에 등록 → 카카오 `/pair CODE` → Relay 바인딩 → 이후 메시지 forward → 로컬 Noma 처리
- ngrok URL 자동감지: `127.0.0.1:4040/api/tunnels` 조회 → heartbeat로 Relay 자동 업데이트
- 로컬 설정: `~/.openclaw/openclaw.json` → `relay.url` + `relay.secret`
- 테스트: 172/172 통과 (기존 153 + Relay 15 + 페어링 4)

**Phase 1 보충** (2026-03-29, 지식문서 v3.2.4 P0 항목):
- ✅ P01: Provider Doctor 2.0 (`scripts/provider-doctor.js`) — provider/env/model/Docker/embeddings 한 번에 검사
- ✅ P07: Memory Healthcheck (`scripts/memory-healthcheck.js`) — indexed files/chunks 확인, 모순 탐지
- ✅ P10: ClawHub-first 배포 전략 (`docs/clawhub-deploy-strategy.md`) — publisher 등록 + 스킬 배포 계획

**Phase 1 잔여 코드 완성** (2026-03-29):
- ✅ Browser Guard: `isAllowedUrl()` + `will-navigate` + `setWindowOpenHandler` + app-level 보안. chrome:/data:/javascript: 차단, localhost:18789만 허용. 10 tests.
- ✅ Channel Reliability Kit (1-11): `dedup.js` — isDuplicate(윈도우 내 중복 감지) + 채널 상태 머신(connected/processing/delayed/error) + index.js 통합. 10 tests.
- ✅ 세션 바인딩 (1-8): `channel-registry.js` — 채널→세션 매핑(bind/lookup/unbind/list) + 파일 persistence + IPC 핸들러 4개 + preload 브릿지 + receipt.ts ChannelInfo 타입. 8 tests.
- 전체: 153/153 테스트 (Browser Guard 10 + Dedup 10 + Registry 8 + 카카오 18 + 스킬 107). lint 0 errors + typecheck clean.

**ngrok 고정 터널 전환** (2026-03-29):
- Cloudflare named tunnel → 도메인 필수 → 사용 불가
- ngrok 무료 플랜 고정 도메인: `nonexhortative-gwenn-unbreaded.ngrok-free.dev`
- `scripts/tunnel-ngrok.sh` — 자동 재시작 + 헬스체크
- 카카오 스킬 URL: `https://nonexhortative-gwenn-unbreaded.ngrok-free.dev/skill`

**Phase 2-1 Day 1-2** (2026-03-28~29): KR 스킬팩 확장 — 11개 스킬 구현 완료 (네이버 검색 포함 총 12개 KR 스킬). NomaDamas/k-skill (MIT) 선별 통합 규칙 적용. 공유 유틸(`_shared/` 14t), HWP(`hwp-convert/` 10t), 지하철(`seoul-metro/` 12t), 우편번호(`postal-code/` 10t), SRT(`srt-query/` 16t), 로또(`lotto-results/` k-lotto 6t), KBO(`kbo-scores/` kbo-game 6t), 미세먼지(`fine-dust/` k-skill-proxy 8t), 택배(`delivery-tracking/` CJ/우체국 12t), 블루리본(`blue-ribbon/` k-skill 소스 포크 8t), 다이소(`daiso-search/` k-skill 소스 포크 5t). SKILL.md 전부 k-skill 표준 포맷. 125/125 테스트 통과 (스킬 107 + 카카오 18). lint 0 errors + typecheck clean.

## Phase 1~2 로드맵

**Phase 1 (운영 안정화)**: 코어 10/10 완료. 잔여 코드 완성(Browser Guard ✅, Channel Reliability Kit ✅, 세션 바인딩 ✅). 미구현 잔여: Delta Card UI, Approve&Run 카드, 3.24 업그레이드, Windows 전략 결정(Electron 35 직접빌드로 사실상 확정).

**Phase 2 (생태계 확장 — 원칙 P-13)**:
- ✅ 2-1: KR 스킬팩 확장 (네이버 검색 포함 총 12개 KR 스킬 완료 + k-skill submodule 통합)
- 🚀 **커뮤니티 배포 스프린트 (Day 0+5일)**: ngrok 고정 도메인 → Windows/macOS 빌드 → 원클릭 설치 → 온보딩 → 자료 제작 → GPters 포스트
- 2-2: **활성 사용자 100+** ← 생태계 지표 우선
- 2-3: 커뮤니티 기여자 5+
- 2-4: 비개발자 타겟 확대
- 2-5: Cheap Team Full (3역할 + 모델 라우팅)
- 2-6: Workflow Handoff Full (다수 백플레인)
- 2-7: NomaDamas 등 외부 팀 협력 1건+

**Phase 3 (생태계 성숙 + 수익화 탐색)**: 기업 관심 탐색, 파트너십, fork 판단

**Phase 4 (수익화, 6개월+)**: 기업 지원 구독, 프리미엄 운영팩, 온보딩 서비스

## 이번 주 외부 Delta (2026-03-25~27)

| 항목 | 내용 | Noma 영향 |
|---|---|---|
| OpenClaw 2026.3.24 | /v1/models, /v1/embeddings 추가. 도구 가시성 강화. 스킬 설치 UX 개선 | embeddings Phase 1 검증. 고정 버전 유지 (3.24 regression 존재) |
| 3/26 보안 권고 | gateway/admin scope, reconnect, session kill, history route 등 다수 | alpha-secure trust layer 가치 확인. public remote surface 최소 권한 강화 |
| DefenseClaw (Cisco, 3/27) | OpenClaw 스킬/MCP/코드 사전 스캔 + 런타임 감시. MIT 오픈소스 | Phase 1 통합 검토 (skill-scanner → Noma 설치 플로) |
| NemoClaw (NVIDIA, GTC) | OpenShell 샌드박스: 커널 격리 + deny-by-default 네트워크 | Phase 2 통합 검토 |
| ClawHavoc 캠페인 | ClawHub 악성 스킬 800+개, 135K 노출 인스턴스 | verified-only 정책 + supply-chain-checklist 중요성 재확인 |
| 한국 대기업 금지 | 네이버, 카카오, 삼성, SK하이닉스 사내 OpenClaw 전면 금지 | "보안 기본값 한국형 배포판" 포지션 강화 |

### 경쟁 환경 경고 (2026-03-28 추가)

| 경쟁 제품 | 특징 | Noma와의 차이 |
|---|---|---|
| ClawX (ValueCell-ai) | Electron+React, 중국 로컬라이제이션, v0.3.1 (3/26) | 카카오❌, KR스킬❌, 보안❌ |
| OpenClaw Desktop | Windows 원클릭 Docker 인스톨러 | 카카오❌, 한국어❌ |
| 공식 openclaw-windows-node | WinUI 3 + PowerToys | Windows 전용 |

> **결론: "Electron 래핑"은 레드오션. Noma는 4축 차별화(카카오/KR스킬/보안/비용)로만 이긴다.**

### ⛔ 지금 넣지 말 것

1. **메모리 전면 출시** — 3/27 이슈: 0 chunks, sqlite-vec OOM. probe가 먼저.
2. **Docker-first 초심자 경로** — 초심자에게 가장 헷갈리는 경로.
3. **"생활비서 만능론" 마케팅** — "그건 GPT로도 되잖아" 반응이 바로 나옴.
4. **launcher UI 과투자** — ClawX가 이미 풀 UI 보유. 4축 차별화에 시간 투자.

## Known Issues Watchlist (2026-03 기준)

| 이슈 | 심각도 | 영향 버전 | Noma 대응 |
|---|---|---|---|
| Browser MCP renderer leak (OOM) | 높음 | 3.24 | launcher 세션 종료 시 cleanup guard 필요 |
| memoryFlush projection bug | 중간 | 3.23-2+ | output token 미반영 → 비용 가시성으로 보완 |
| UI usage=0 / 실제 토큰 사용 누락 | 중간 | 3.24 | 실행 영수증에서 독립 토큰 추적 필요 |
| /model override sub-agent 미반영 | 낮음 | 3.24 | Noma에서 모델 선택 시 주의 문서화 |
| macOS 3.24 browser tool regression | 높음 | 3.24 | 2026.3.23-2 고정 유지 정당화 |

> **판정**: 2026.3.23-2 고정 유지. 3.24는 별도 test lane에서만 검증. 72시간 관찰 후 갱신 여부 결정.

## 주요 파일/디렉토리

| 경로 | 설명 |
|---|---|
| `PLANS.md` | 진행 중인 계획 기록 (ExecPlan) |
| `docs/project-operation-rules-v2.1.md` | 운영 지침 (원칙/프로세스) |
| `docs/tool-landscape-snapshot-2026-03.md` | 도구 현황 스냅샷 |
| `docs/antigravity-frontend-policy.md` | Antigravity 프론트 정책 |
| `launcher/` | Electron thin launcher |
| `plugins/kakao-entry/` | 카카오 원격면 연동 (index.js + relay.js) |
| `packages/verified-kr-skills/` | 한국 서비스 연동 스킬팩 |
| `packages/permission-profiles/` | OpenClaw 보안 프로필 |

## 개발 규칙

1. OpenClaw 코어는 npm 패키지로만 사용. 소스 수정 금지.
2. Atomic Bot 코드 복사 금지. 아이디어 참고 시 PROVENANCE 주석 필수.
3. 보안 프로필은 항상 `alpha-secure` 기반으로 시작.
4. 복잡한 기능은 반드시 PLANS.md에 ExecPlan 작성 → 승인 → 실행.
5. 문서는 한국어 위주, 코드/config는 영어.
6. 완료 조건은 명령어로 정의 (말로 검증 금지).
7. 기술 조사 시 1주일 이내 자료 우선 (서치 룰).
8. UI 변경 후 Playwright 스크린샷 시각 검증 필수.
9. MCP 서버/스킬 추가 시 `docs/supply-chain-checklist.md` 통과 필수.
10. 세션 종료 시 핸드오프 루틴 실행. 컨텍스트 과부하 시 /compact 자동 제안.
