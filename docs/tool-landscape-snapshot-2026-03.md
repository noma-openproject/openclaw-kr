# AI 개발 도구 현황 스냅샷

> **스냅샷 날짜: 2026-03-28**
> 이 문서는 빠르게 변하는 도구 현황, 모델 비교, 가격, quota, 기능 상태를 담는 별도 문서입니다.
> 프로젝트 운영 지침(v2.1)의 원칙은 그대로 유지하면서, 이 문서만 주기적으로 갱신합니다.
> **갱신 주기: 최소 주 1회** (또는 주요 릴리스 발생 시 즉시)

---

## 0. 이번 주 Delta & Known Issues (2026-03-21~28)

> **실무 팀은 비교표보다 이 섹션을 먼저 본다.** "이번 주"는 엄격하게 7일 창. 그 이전 항목은 "최근 30일 notable"로 내린다.

### 이번 주 주요 변경

| 날짜 | 플랫폼 | 변경 | 영향도 |
|---|---|---|---|
| 03-27 | **Claude Code** | v2.1.86: `--bare` 플래그 (headless thin lane), `--channels` 권한 릴레이, `rate_limits` statusline, Bedrock/Vertex 기본 Opus 4.6, `/output-style` deprecated→`/config` | 높음 |
| 03-26 | **Codex** | **플러그인이 1급 워크플로우로 승격**: product-scoped sync, `/plugins` 탐색, 설치/삭제 개선 | 높음 |
| 03-26 | **Codex** | **서브에이전트 v2**: 경로 기반 주소(`/root/agent_a`), 구조화된 에이전트 간 메시징, 에이전트 목록 | 높음 |
| 03-26 | **Codex** | app-server TUI 기본 활성화, 레거시 artifact/read_file/grep_files 도구 제거 | 중간 |
| 03-26 | **Codex** | `spawn_agents_on_csv`: CSV 행 기반 대량 병렬 서브에이전트 + `report_agent_job_result` | 중간 |
| 03-26 | **Claude Code** | `managed-settings.d/`, effort frontmatter for skills, `source: 'settings'` plugin marketplace | 중간 |
| 03-26 | **Claude Code** | CJK IME 수정, concurrent session auth 수정, background agent race condition 수정 | 해결 |
| 03-25~27 | **Claude 플랫폼** | Opus 4.6 / Sonnet 4.6 에러 + MCP 호출 에러 (발생→해결) | 해결 |
| 03-24 | **Figma** | MCP write beta 공개 + Skills 프레임워크 출시 | 높음 |

### 최근 30일 Notable (이번 주 창 이전이지만 여전히 유효)

| 날짜 | 플랫폼 | 변경 |
|---|---|---|
| 03-19 | Codex | Skills `@` 메뉴 진입, plugin suggestion allowlist, `userpromptsubmit` hook |
| 03-16 | Codex | GPT-5.4 mini 라우팅 (서브에이전트용, 비용 30%), Codex 서브에이전트 GA (Explorer/Worker/Default) |
| 03-11 | Antigravity | AI Credits 도입 + 이중 한도 구조 전환 (250유닛 스프린트 + 2,800유닛 주간) |

### Known Regressions & Workarounds

| 플랫폼 | 이슈 | 심각도 | Workaround |
|---|---|---|---|
| **Codex** | Playwright MCP 매 action마다 승인 요구 (03-19 이후) | 높음 | Smart Approvals guardian subagent |
| **Codex** | **`approval_policy=never`가 raw MCP writes에 적용 안 됨** — shell/sandbox approval과 별개 | 높음 | raw MCP 경로에는 항상 human gate 남을 수 있다고 가정. localhost 자동화도 끊길 수 있음 |
| **Codex** | **Plugins surface 불안정** (03-26 rollout 후) — "New Plugin" 버튼이 나왔다 "Skills"로 되돌아감 | 중간 | UI click-flow가 아닌 선언형 설정(.codex/config.toml)으로 플러그인 관리 |
| **Codex** | **`codex exec` vs interactive 권한 불일치** — Linux/WSL2에서 EPERM, loopback, Chromium sandbox 문제 | 중간 | interactive에서 통과해도 `codex exec` 경로 별도 검증 필수 |
| **Codex** | Chrome Helper 프로세스 종료 후 남음 | 중간 | 세션 후 `pkill -f "Chrome Helper"` |
| **Codex** | 서브에이전트 model override 무시 | 중간 | spawn 후 실제 모델 확인 |
| **Codex** | 레거시 도구 제거 (read_file, grep_files, artifact) — 기존 워크플로우 깨질 수 있음 | 중간 | 최신 도구로 마이그레이션 |
| **Antigravity** | **이중 한도 구조 주의**: 5시간 스프린트(250유닛) + 주간 베이스라인(2,800유닛). 7일 잠김은 일부 해결됐으나 구조 자체가 변경됨 | 높음 | AI Credits 토글 OFF 권장. Flash 중심 사용. 분석은 AG, 실행은 Claude Code |
| **Antigravity** | AI Credits 활성화 시 소비 급가속 ($25/2,500 크레딧, 가치 불투명) | 중간 | AI Credits OFF. 필요하면 Ultra($250) 검토 |
| **Antigravity** | Stitch 접근 불가/Generate 비활성화 간헐 발생 | 중간 | Figma 또는 스크린샷으로 fallback |
| **Claude Code** | **stale auth → rate limit 오인식**: 장시간 Opus 세션 후 "rate limit reached"가 실제로는 stale auth | 중간 | `claude auth logout && claude auth login`으로 즉시 해결 |
| **Claude Code** | **병렬 에이전트에서 session auth token 만료 시 partially applied state** | 중간 | 장시간 병렬 실행 전 auth freshness preflight |
| **Claude Code** | Windows headless: OAuth refresh 429 (4시간 1회 호출도 429) | 중간 | interactive OAuth를 headless 유일 제어면으로 쓰지 않기 |
| **Claude Code** | AutoDream 토글이 /memory UI에 보이지만 /dream 미등록 | 낮음 | experimental memory features를 persistent control plane으로 의존하지 않기 |
| **Figma** | Complex component state/variant 코드 생성 불일치 | 중간 | 상태별 수동 검수 |

### 한국/Windows Caveats

| 이슈 | 상태 | 비고 |
|---|---|---|
| macOS+VS Code Korean IME | 수정됨 (v2.1.84+) | 커서가 IME 조합을 인라인 추적 |
| Windows CRLF 기억/적용 | 알려진 이슈 | Git `core.autocrlf=true` 권장 |
| WSL thread resume | 간헐적 이슈 | fork 후 resume 권장 |
| Windows headless OAuth refresh 429 | 알려진 이슈 | API key 기반 인증 또는 토큰 갱신 간격 조정 |

---

## 1. 모델별 프론트엔드 강약점 비교

> 이 표는 2026-03-26 기준입니다. 모델 업데이트 시 재평가 필요.

| 영역 | Gemini 3.1 Pro | GPT-5.4 / Codex | Claude Opus 4.6 |
|---|---|---|---|
| 레퍼런스 → 구현 속도 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 무에서 디자인 창조 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| DOM/CSS 구조 정확도 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 인터랙티브 애니메이션 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 스크린샷 기반 시각 검증 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ (Playwright) | ⭐⭐⭐ |
| 프론트엔드 미학/감성 | ⭐⭐⭐⭐ | ⭐⭐⭐ ("기업 사이트 느낌") | ⭐⭐⭐⭐ ("우아함") |
| 복잡한 로직/아키텍처 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 코드 품질/재작업 최소화 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (~30% 적은 재작업) |
| 대규모 코드베이스 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 환각/일관성 | ⭐⭐ (환각 이슈 보고) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 속도 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (1000+ tok/s Spark) | ⭐⭐⭐ |
| 비용 | 무료~$20 | $20~$200 | $20~$200 |
| 장시간 자율 실행 | ⭐⭐ (레이트 리밋 이슈) | ⭐⭐⭐⭐⭐ (7시간+) | ⭐⭐⭐⭐⭐ |

**핵심 결론:**
- 비주얼/애니메이션 → Gemini (레퍼런스를 받아 빠르게 구현하는 "실행기")
- 속도/자율 실행 → Codex(GPT-5.4) (1000+ tok/s, 7시간+ 자율, Playwright 시각 디버깅)
- 로직/품질/리팩터 → Claude (~30% 적은 재작업, 환각 최소, 아키텍처 이해)

---

## 2. 도구 현황

### 2-1. Figma MCP (2026-03-24 업데이트 — read/write beta)

- `use_figma` 도구로 에이전트가 캔버스에 직접 쓰기 가능 (beta, 무료 → 이후 usage-based 유료)
- `generate_figma_design` 도구로 라이브 HTML → 편집 가능한 Figma 레이어 변환
- Skills 체계: `/figma-use`, `/figma-generate-design`, `/apply-design-system`, `/sync-figma-token`
- 지원 클라이언트: Augment, Claude Code, Codex, Copilot CLI, Copilot in VS Code, Cursor, Factory, Firebender, Warp
- write to canvas: Full/Dev 시트 유료 플랜에서만 (Dev 시트는 drafts 외 읽기 전용)
- 주의: SVG 노드 → 웹 코드 변환 시 85-90% 스타일링 부정확성 보고 (SFAI Labs)
- 주의: 복잡한 component/variant/state 자동 생성 결과는 상태별 수동 검수 필수

### 2-2. Google Antigravity (2026-03-28 기준)

- 버전: v1.20.5 (2026-03 중순) — AI Credits 토글 도입
- 모델: Gemini 3.1 Pro (High/Low), Gemini 3 Flash, Claude Sonnet 4.6, Claude Opus 4.6, GPT-OSS 120B
- AgentKit 2.0: 16개 에이전트, 40+ 스킬, 11개 커맨드
- AGENTS.md 지원 (v1.20.3부터)
- **가격 구조 변경 (03-11 이후):**
  - 이중 한도: 250유닛 스프린트(5h 리셋) + 2,800유닛 주간 베이스라인(주 1회 리셋)
  - 스프린트가 리셋돼도 주간 한도가 0이면 사용 불가
  - AI Credits: $25/2,500 크레딧 추가 구매 가능하나 소비 속도 불투명
  - Pro $19.99 → Flash 중심 사용 권장, Ultra $249.99 → premium 모델 일관 접근
  - 7일 잠김 이슈는 일부 해결됐으나 이중 한도 구조 자체는 유지
- **운영 리스크:**
  - **AI Credits ON 시 소비 급가속** — OFF 권장
  - Gemini 3.1 Pro 환각/품질 불일치 보고
  - 48GB RAM 소비 보고
  - Stitch 접근 불가/Generate 버튼 비활성화 간헐 발생
  - predictive code assistant 백그라운드 토큰 소모
  - **workaround: v1.19.6 다운그레이드 시 AI Credits 토글 없이 더 예측 가능한 quota 동작 보고**

### 2-3. Google Stitch (2026-03 기준)

- 자연어 → 고충실도 UI, 5화면 동시 생성, Voice Canvas, Vibe Design
- Stitch MCP 서버로 Claude Code, Gemini CLI, Cursor와 연동
- DESIGN.md export 가능
- Experimental 모드(Gemini 2.5 Pro) 월 50회 제한
- **주의:** 같은 주에 접근 불가/동작 불가 보고 있음

### 2-4. paper.design (2026-03 기준)

- 버전: 0.1.10 (2026-03-26)
- 오픈 알파 상태 — Figma write beta 출시로 상대적 위상 하락
- **위치 조정: 기본 표준 파이프라인이 아닌 "1인/소규모 팀의 실험 레인"**
- Figma/Stitch와 동급으로 배치하지 않음
- HTML/CSS 네이티브라는 구조적 장점은 유효하나, 안정성과 생태계에서 Figma에 한참 뒤처짐

### 2-5. Codex 최신 기능 (2026-03-28 기준)

- GPT-5.4: 프론티어 모델, 1M 컨텍스트, 네이티브 computer use, 128K 출력
- GPT-5.4 mini: 경량 서브에이전트용, 비용 30%, 2x 이상 빠름
- GPT-5.3-Codex-Spark: 1000+ tok/s 실시간 코딩 (Pro 전용 리서치 프리뷰)
- Playwright Interactive 스킬: 빌드 중인 앱을 실시간 시각 디버깅
- **플러그인 1급 워크플로우 (03-26)**: product-scoped sync, `/plugins` 탐색, 설치/삭제 개선. skills/apps/MCP를 하나로 패키징
- **서브에이전트 v2 (03-26)**: 경로 기반 주소(`/root/agent_a`), 구조화된 에이전트 간 메시징
- **서브에이전트 GA (03-16)**: Explorer/Worker/Default 3타입, `.codex/agents/` TOML 커스텀 에이전트
- `spawn_agents_on_csv`: CSV 행당 Worker spawn → 전체 배치 완료 대기 → CSV export
- app-server TUI 기본 활성화 (03-26)
- 레거시 도구 제거: `artifact`, `read_file`, `grep_files` — 기존 워크플로우 마이그레이션 필요
- **주의**: Plugins surface 불안정 (03-26 후 UI 전환 이슈), custom TOML이 tool-backed 세션에서 직접 호출 불가

### 2-6. Claude Code 최신 기능 (2026-03-28 기준)

- Claude Opus 4.6 / Sonnet 4.6 (1M 컨텍스트 beta)
- Bedrock/Vertex/Foundry 기본 Opus 모델: 4.1 → 4.6 변경 (v2.1.86)
- Session Memory: 자동 세션 요약, `/remember`, MEMORY.md 25KB+200줄 truncation
- `managed-settings.d/`: 조직 수준 설정 관리
- `sandbox.failIfUnavailable`: 샌드박스 강제
- `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1`: 환경 변수 스크러빙
- `CwdChanged`/`FileChanged` hook 이벤트
- **v2.1.86 (03-27) 신규:**
  - `--bare` 플래그: headless thin lane (hooks/LSP/plugin sync/skill walks/메모리 전부 OFF)
  - `--channels` 권한 릴레이: 도구 승인을 폰으로 전달
  - `rate_limits` statusline: 5시간/7일 사용량을 `used_percentage`/`resets_at`로 표시
  - effort frontmatter: 스킬/커맨드별 모델 effort 오버라이드 (토큰 절약)
  - `source: 'settings'`: plugin marketplace source를 설정 파일에 선언
  - `/output-style` deprecated → `/config` 통합
  - 대규모 리포 시작 시 메모리 ~80MB 절감
- **주의**: stale auth→rate limit 오인식, 병렬 에이전트 auth token 만료 시 partially applied state

---

## 3. 가격 비교 (2026-03-28 기준)

| 도구/플랜 | 월 비용 | 포함 내용 |
|---|---|---|
| Antigravity 무료 | $0 | Gemini Flash 중심, 주간 레이트 리밋 |
| Antigravity Pro | $19.99 | 이중 한도(스프린트 250유닛/5h + 주간 2,800유닛). **AI Credits OFF 권장** |
| Antigravity Ultra | $249.99 | 고볼륨, premium 모델 일관 접근 |
| Antigravity AI Credits | $25/2,500 크레딧 | 추가 구매. 소비 속도 불투명, ON 시 급가속 보고 |
| Cursor Pro | $20 | Opus 4.6 / Gemini 3 / GPT-5.2, 8 병렬 에이전트 |
| Claude Code Pro | $20 | Sonnet 4.6 기본, 제한적 Opus |
| Claude Code Max 5x | $100 | Opus 4.6 충분한 한도 |
| Claude Code Max 20x | $200 | Opus 4.6 대규모 작업 |
| Codex (ChatGPT Plus) | $20 | GPT-5.4, 웹/앱/CLI/IDE 접근 |
| Codex (ChatGPT Pro) | $200 | GPT-5.4 Pro + Spark + 무제한에 가까운 사용 |

---

## 4. 실전 조합 패턴

| 패턴 | 도구 조합 | 비용 | 적합 대상 |
|---|---|---|---|
| **무료 최대화** | Antigravity(Gemini+Opus 무료) + Claude Code 무료 티어 | $0 | 학습, 실험, POC |
| **프론트 특화** | Antigravity 프로토타입 + Cursor(Gemini 모델) UI 구현 + Claude Code 로직 | $20~$40/월 | 프론트엔드 중심 |
| **균형형 (권장)** | Stitch 디자인 + Cursor(모델 전환) 구현 + Claude Code 아키텍처/리뷰 | $20~$60/월 | 풀스택 앱 |
| **품질 최우선** | Claude Code Max + Codex(GPT-5.4) 병렬 작업 | $100~$200/월 | 프로덕션 앱 |

---

## 5. 브라우저 자동화 & 시각 검증 & 구조 추출 도구

### 3계층 브라우저 도구 체계

| 계층 | 도구 | 성격 | 비용 |
|---|---|---|---|
| **정밀 자동화** | Playwright | 셀렉터 기반, CI/CD, E2E | 무료 (오픈소스) |
| **AI 시각 조작** | agent-browser (Vercel Labs) | AI가 "보고" 판단하며 조작 | 무료 (오픈소스) |
| **구조 추출** | Scrapling | 적응형 사이트 구조 이해, MCP 서버 | 무료 (오픈소스) |

### agent-browser (github.com/vercel-labs/agent-browser)
- CLI 기반, Claude Code/Codex/Cursor/Gemini CLI/Copilot/Windsurf 통합
- 주석 달린 스크린샷: 요소에 번호 매김 → `@e2`로 바로 클릭
- 인증 볼트: 자격 증명 암호화, LLM이 비밀번호를 보지 못함
- 콘텐츠 경계 마커: indirect injection 방어
- WebSocket 라이브 뷰포트: AI와 "페어 브라우징"
- Playwright와 달리 셀렉터가 변해도 AI가 "이것이 Submit 버튼"임을 인식
- 설치: `npm install -g agent-browser` + 스킬 연동

### Scrapling (github.com/D4Vinci/Scrapling)
- Python, 적응형 웹 스크래핑 프레임워크, GitHub 20K+ 스타
- 요소 핑거프린팅 → 사이트 구조 변경 시 유사도 매칭으로 자동 재발견
- 내장 MCP 서버: AI에 전달 전 콘텐츠 사전 추출 → 토큰 비용 절감
- StealthyFetcher: Cloudflare Turnstile 등 안티봇 자동 우회
- Spider 프레임워크: 동시 크롤링, pause/resume, 프록시 로테이션
- 설치: `pip install "scrapling[all]"` + `scrapling install`
- v0.4 (2026-02), 92% 테스트 커버리지

### 플랫폼 내장 시각 검증 도구

| 플랫폼 | 방법 | 설치 | 특징 |
|---|---|---|---|
| Codex | Screenshot Capture (내장) | 기본 설치 | 풀스크린/앱/영역 캡처 |
| Codex | Playwright Interactive (내장) | `$skill-installer` | 빌드 중 실시간 시각 디버깅 |
| Antigravity | 내장 브라우저 서브에이전트 | 기본 내장 | Gemini 비전으로 UI 검증 |
| Claude Code | Browser Testing (커뮤니티) | mcpmarket.com | Chrome DevTools 기반 |
| Claude Code | Browser Screenshot (커뮤니티) | mcpmarket.com | Playwright, 반응형 프리뷰 |
| Claude Code | Screenshot Analysis (커뮤니티) | mcpmarket.com | 시스템 스크린샷, OCR |
| Claude Code | Playwright MCP 서버 | `/plugin` | 브라우저 자동화 + 캡처 |

### 용도별 최적 도구 선택

| 용도 | 최적 도구 |
|---|---|
| CI/CD E2E 테스트 (확정 플로우) | Playwright |
| AI 에이전트 시각 검증 (라운드트립) | agent-browser 또는 Codex Playwright Interactive |
| 레퍼런스 사이트 구조 추출 → DESIGN.md | Scrapling MCP |
| 경쟁사 UI 분석/모니터링 | Scrapling + agent-browser |
| 어필리에이트 가격/기능 데이터 수집 | Scrapling Spider |

---

## 6. 플랫폼 스킬 카탈로그

### Codex 내장 스킬 (developers.openai.com/codex/skills)

| 프로젝트 유형 | 필수 스킬 | 권장 스킬 |
|---|---|---|
| 웹 프론트엔드 | Frontend Skill, Figma, Figma Implement Design | Playwright Interactive, Screenshot Capture |
| 풀스택 앱 | Frontend Skill, Security Best Practices | Deploy 스킬, Yeet |
| API/백엔드 | Security Best Practices, OpenAI Docs | Playwright CLI, Jupyter |
| 콘텐츠/마케팅 | Image Gen, Sora, Speech Generation | Slides, Word Docs, PDF |
| 프로젝트 관리 | Linear, Notion Spec to Implementation | Interview, Notion Knowledge Capture |
| 보안 강화 | Security Best Practices, Security Threat Model, Security Ownership Map | Sentry |

### Claude Code 마켓플레이스

| 마켓플레이스 | 규모 | 설치 명령 |
|---|---|---|
| Anthropic 공식 | 문서+예제 스킬 | `/plugin marketplace add anthropics/skills` |
| jeremylongshore | 340+ 플러그인, 1300+ 스킬 | `/plugin marketplace add jeremylongshore/claude-code-plugins` |
| daymade | 43 프로덕션급 | `/plugin marketplace add daymade/claude-code-skills` |
| mhattingpete | 엔지니어링 워크플로우 | `/plugin marketplace add mhattingpete/claude-skills-marketplace` |

검색: tonsofskills.com / skillsmp.com / claudemarketplaces.com / `ccpi search [키워드]`

---

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-03-28 | 날짜 창 03-21~28로 롤링, "이번 주"와 "최근 30일 notable" 분리. Codex 03-26 대규모 업데이트(플러그인 1급, 서브에이전트 v2, app-server TUI 기본화, 레거시 도구 제거) 추가. Claude Code v2.1.86(--bare, rate_limits, effort frontmatter) 추가. Known Regressions 대폭 추가: raw MCP write approval gap, plugins surface 불안정, codex exec parity, stale auth→rate limit 오인식, OAuth refresh 429, AutoDream 미등록. Antigravity 이중 한도 구조 + AI Credits OFF 권장으로 업데이트. |
| 2026-03-27 | agent-browser(Vercel Labs) + Scrapling 추가. 3계층 브라우저 도구 체계 정의. |
| 2026-03-27 | 이번 주 Delta & Known Issues 섹션 0 추가. 한국/Windows Caveats 추가. |
| 2026-03-26 | 초판. Figma MCP write beta(3/24), NIST 보안(3/23), Codex GPT-5.4(3/5), Antigravity v1.20.3(3/5) 기준. |
