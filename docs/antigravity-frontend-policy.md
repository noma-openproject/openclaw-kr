# Antigravity Frontend Policy v0.2

> 이 문서는 프로젝트 운영 지침(v2.1) 섹션 19와 함께 사용하는 보조 문서입니다.
> Antigravity(Gemini) 기반 프론트엔드 작업의 운영 정책, 실전 프롬프트, 주의사항을 다룹니다.
> 최종 업데이트: 2026-03-27 (1주일 이내 자료 기준)

---

## 핵심 판단

**"Gemini가 프론트 디자인에 특출나다"보다, "Stitch/레퍼런스를 source of truth로 두고 Antigravity를 프론트 구현 루프에 넣으면 생산성이 높다"가 현재 공개 증거에 더 가까운 문장이다.**

- Google 공식 흐름 자체가 `Stitch에서 고충실도 UI 생성 → MCP로 Antigravity가 디자인 메타데이터를 읽음 → React/Tailwind로 구현 → integrated browser에서 다시 맞춤`
- 핵심은 **모델 우위보다 실행 루프 우위** — 디자인 컨텍스트를 받아 실제 프론트 코드를 빠르게 만들고 수정하는 루프를 닫는 것
- "Gemini가 무에서 유를 창조하는 아트 디렉터"가 아니라 "레퍼런스를 받아 빠르게 구현하는 프론트 실행기"

출처: Google 공식 블로그 (2026-03-19~26), Google Codelabs, Reddit r/google_antigravity, Google AI Developers Forum

---

## 정책 10개 조항

```
1. Antigravity는 "디자인 판단기"가 아니라 "디자인 구현기"로 쓴다.

2. 모든 프론트 티켓에는 visual source of truth를 반드시 첨부한다.
   - Stitch project / Figma / screenshot / reference URL 중 하나

3. 기본 스택은 React(or Next.js) + Tailwind + shadcn/ui로 시작한다.
   - 예외: 기존 디자인 시스템이 이미 있을 때만

4. 페이지 전체 one-shot 프롬프트는 금지한다.
   - route → section → component 순으로 분할

5. 구현 전에 DESIGN.md 또는 design tokens / component contract를 먼저 만든다.

6. planning mode는 구조 작업, fast mode는 국소 수정에만 사용한다.

7. quota 민감 시 predictive features는 기본 OFF로 둔다.

8. integrated browser 비교 루프를 거치지 않은 UI는 완료로 간주하지 않는다.

9. 최종 polish(타이포, spacing, motion, responsive, accessibility)는 반드시 2차 패스로 검수한다.

10. 마감 작업은 Antigravity 단독 의존 금지. 항상 대체 실행 경로를 유지한다.
```

---

## 작업 유형별 운영안

### 프로토타입·대시보드·CRUD·내부툴
- `Stitch → Antigravity` 기본 루프 OK
- speed-to-working-UI가 중요한 구간에서 공식 워크플로가 잘 맞음

### 브랜드 랜딩·마케팅 페이지
- `Stitch/Figma/스크린샷/레퍼런스 → Antigravity 구현 → 사람 또는 2차 모델 polish`
- 커뮤니티 합의: "best design을 AI가 바로 주진 않는다"

### 복잡한 제품 UI
- 페이지 전체를 한 번에 던지지 말고 `route → section → component` 단위로 분할
- 큰 UI는 불안정하다는 보고 다수
- 작은 모듈 + 명시적 계약 + 가벼운 컨텍스트 = Antigravity 품질 향상

---

## 운영 주의사항 (2026-03-28 기준)

### Quota/안정성 리스크
- **이중 한도 구조 (v1.20.5, 03-11 이후)**: 250유닛 스프린트(5h 리셋) + 2,800유닛 주간 베이스라인(주 1회 리셋)
- 스프린트가 리셋돼도 주간 한도가 0이면 사용 불가 — 이것이 "7일 잠김"의 원인이었음
- AI Credits($25/2,500) 활성화 시 소비 급가속 보고 — **AI Credits OFF 권장**
- predictive code assistant가 백그라운드에서 토큰을 많이 소모
- Stitch 접근 불가/Generate 버튼 비활성화 간헐 발생
- Claude와 Gemini는 별개 quota pool — Claude 잠기면 Gemini Flash가 탈출구

### 완화 방법
- **AI Credits 토글 OFF**
- predictive features 기본 OFF
- 작업별 수동 모델 선택 ("Auto" 사용 금지)
- Flash 중심 사용, premium 모델은 꼭 필요할 때만
- `Antigravity는 codebase 분석/프롬프트 정제용, 실행은 Claude Code` 하이브리드 워크플로
- 마감이 걸린 작업에서는 항상 백업 도구 준비
- **극단적 workaround**: v1.19.6 다운그레이드 시 이중 한도 없이 더 예측 가능

---

## Frontend Agent Choreography ⭐ v0.2 신규

> 싱글 에이전트가 구현과 검수를 다 하는 것보다, 좁은 역할 분리가 더 안정적이다.

**권장 순서: planner → ui_builder → browser_verifier → a11y_reviewer**

| 역할 | 하는 일 | 권한 |
|---|---|---|
| **planner** | 섹션 경계, 파일 목록, acceptance criteria 정의 | 읽기 전용 |
| **ui_builder** | 선택된 섹션만 구현 | 코드 수정 |
| **browser_verifier** | 390/768/1440 viewport에서 스크린샷, 시각 불일치/console error/failed request 수집 | 읽기 전용 |
| **a11y_reviewer** | 시맨틱, focus order, 대비, aria, 키보드 동작 검토 | 읽기 전용 |

- ui_builder만 코드를 수정한다
- browser_verifier와 a11y_reviewer는 읽기 전용 — 수정 권한 없음
- 관련 없는 섹션은 건드리지 않는다

---

## 브라우저 검증 종료 조건 ⭐ v0.2 신규

> "integrated browser 비교 루프"의 완료 기준을 구체적으로 정의한다.

**통과 조건 (전부 충족해야 완료):**
- [ ] 390px (모바일), 768px (태블릿), 1440px (데스크톱) 스크린샷 캡처 완료
- [ ] console error: 0
- [ ] core flow network 4xx/5xx: 0
- [ ] reference vs actual mismatch list 작성 완료
- [ ] a11y quick pass: heading 순서, alt text, focus visible, contrast ratio 확인
- [ ] changed files list 작성 완료

**미통과 시:** mismatch list 기반으로 ui_builder에게 패치 지시 → 재검증

---

## Degradation Mode & Fallback Triggers ⭐ v0.2 신규

> "마감 작업은 백업 준비"보다 한 단계 더 구체적으로.

**즉시 fallback 전환 트리거:**

| 트리거 | 전환 경로 |
|---|---|
| quota 대기 20분 초과 | Figma + Codex/Claude Code |
| Stitch unavailable | Figma 또는 스크린샷 기반으로 전환 |
| context overload 1회 | /compact 후 재시도, 2회 시 새 세션 |
| 같은 browser action 승인 3회+ 반복 | 수동 검증 모드 전환 |
| skill load failure | 스킬 비활성화 후 manual prompt |
| dev server 불안정 (크래시 2회+) | 수동 검증 모드 + 에이전트는 코드만 |

**fallback 경로:**
```
[정상] Stitch → Antigravity → browser verify
[degraded] Figma/스크린샷 → Codex/Claude Code → Playwright verify
[manual] 레퍼런스 → 수동 코딩 → 수동 브라우저 확인
```

---

## 업스트림 디자인 소스 우선순위 ⭐ v0.2 신규

기존에 Stitch/Figma/스크린샷/URL이 병렬이었으나, 우선순위를 정의한다:

1. **Figma write beta** — 에이전트가 디자인 시스템으로 직접 작업, 양방향 동기화
2. **Stitch project** — 고충실도 UI 생성, DESIGN.md export, 하지만 안정성 주의
3. **screenshot** — 기존 UI 기반 작업, 가장 안정적
4. **reference URL** — 외부 레퍼런스, 저작권 주의

**주의:** Figma write beta에서도 복잡한 variant/state와 font-heavy 디자인 시스템 컴포넌트는 사람이 preflight한다.

---

## Frontend Agent Choreography ⭐ v0.2 신규

> 프론트 작업을 "한 에이전트에게 전부 맡기기"가 아니라, 역할 분리된 에이전트 오케스트레이션으로 운영한다.

**권장 에이전트 구성:**

| 순서 | 에이전트 | 권한 | 역할 |
|---|---|---|---|
| 1 | **planner** | read-only | 섹션 경계, 파일 목록, acceptance criteria만 정의 |
| 2 | **ui_builder** | read/write | 선택된 섹션만 구현 (route→section→component) |
| 3 | **browser_verifier** | read-only | 390/768/1440 viewport 캡처, 시각 불일치/콘솔 에러/실패 요청 요약 |
| 4 | **a11y_reviewer** | read-only | 시맨틱, 포커스 순서, 대비, ARIA, 키보드 동작 검토 |

- ui_builder만 코드 수정 권한을 가짐
- browser_verifier와 a11y_reviewer는 screenshot/console/network만 수집
- 관련 없는 섹션은 건드리지 않음

**브라우저 검증 종료 조건 (Exit Criteria):**
- [ ] 390px (모바일), 768px (태블릿), 1440px (데스크톱) 3개 viewport 스크린샷 캡처 완료
- [ ] console error: 0
- [ ] core flow 기준 network 4xx/5xx: 0
- [ ] 레퍼런스 대비 visual mismatch 목록 작성
- [ ] a11y quick pass: heading 구조, contrast ratio, keyboard nav, ARIA roles
- [ ] 위 항목 모두 통과해야 "완료"

**업스트림 디자인 소스 우선순위:**
```
Figma write beta > Stitch project > screenshot > reference URL
```
- Figma write beta가 열렸으나, 복잡한 variant/state와 font-heavy 컴포넌트는 사람이 preflight
- Stitch는 아이데이션/초기 구현에 적합하나 간헐적 불가 이슈 있음

---

## Degradation Mode — 자동 전환 트리거 ⭐ v0.2 신규

> "마감 작업은 백업 도구 준비"보다 한 단계 더 구체적으로.

**즉시 전환 트리거 (하나라도 발생 시 fallback 경로로 전환):**

| 트리거 | fallback 경로 |
|---|---|
| quota wait > 20분 | Figma + Codex/Claude Code browser verify |
| Stitch unavailable | Figma 또는 스크린샷 → 직접 구현 |
| context overload 1회 발생 | 세션 분할 (route→section→component 더 잘게) |
| 같은 browser action 승인 3회+ 반복 | 수동 검증 모드로 전환 |
| skill load failure | 스킬 비활성화 + manual prompt |
| dev server 불안정 | stop → manual verify → 재시작 |

**전환 시 원칙:**
- 같은 세션에서 계속 씨름하지 않는다
- fallback으로 전환한 사실과 이유를 기록한다 (다음 스냅샷 갱신에 반영)

---

## 복붙용 프롬프트

### 1) 디자인 소스 흡수 + 구현 시작

```text
Use the Stitch MCP to fetch the project and generate DESIGN.md in the repo root.
Extract color palette, typography, spacing scale, component inventory, and layout rules.

Then implement only the [screen/section name] in React + Tailwind + shadcn/ui.
Constraints:
- modular components only
- preserve tokens from DESIGN.md
- do not invent new colors or spacing rules
- run the dev server
- open the integrated browser
- compare against the design and list only visual mismatches
```

### 2) 큰 페이지를 쪼개서 구현

```text
Do not build the whole page at once.
Break this UI into:
1) hero
2) features
3) pricing
4) FAQ
5) footer

Implement only step 1 now.
Acceptance criteria:
- no changes outside this section
- reusable component boundaries
- responsive on desktop and mobile
- report exact files changed
```

### 3) 랜딩 페이지용 미감 제약 추가

```text
Implement this landing page with these design constraints:
- first viewport must read as one composition
- brand-first hierarchy
- no cards in the hero
- one headline, one supporting sentence, one CTA group
- full-bleed visual anchor
- avoid generic dashboard look
- expressive typography
- reduce clutter
- use motion sparingly and intentionally

Build in React/Next + Tailwind + shadcn/ui.
After rendering, audit spacing, typography, responsive behavior, and accessibility, then patch only the issues found.
```

### 4) 멀티 에이전트 프론트 오케스트레이션 ⭐ v0.2 신규

```text
Spawn 4 agents and wait for all:
1) planner: define section boundaries, files, and acceptance criteria only
2) ui_builder: implement only the selected section
3) browser_verifier: run the app in 390 / 768 / 1440 widths, capture screenshots, summarize visual mismatches, console errors, and failed requests
4) a11y_reviewer: review semantics, focus order, contrast, aria, and keyboard behavior

Constraints:
- ui_builder changes code
- browser_verifier and a11y_reviewer are read-only
- do not touch unrelated sections
- if browser actions require repeated approval or the dev server becomes unstable, stop and switch to manual verification mode
- final output must list exact mismatches before patching
```

### 4) 멀티 에이전트 choreography ⭐ v0.2 신규

```text
Spawn 4 agents and wait for all:
1) planner: define section boundaries, files, and acceptance criteria only
2) ui_builder: implement only the selected section
3) browser_verifier: run the app in 390 / 768 / 1440 widths, capture screenshots, summarize visual mismatches, console errors, and failed requests
4) a11y_reviewer: review semantics, focus order, contrast, aria, and keyboard behavior

Constraints:
- ui_builder changes code
- browser_verifier and a11y_reviewer are read-only
- do not touch unrelated sections
- if browser actions require repeated approval or the dev server becomes unstable, stop and switch to manual verification mode
- final output must list exact mismatches before patching
```

---

## 출처 (1주일 이내 자료, 2026-03-19~26)

| # | 출처 | 유형 |
|---|---|---|
| 1 | [Google 공식 블로그 — Full Stack Vibe Coding](https://blog.google/innovation-and-ai/technology/developers-tools/full-stack-vibe-coding-google-ai-studio/) | A2 |
| 2 | [Reddit — Gemini 3.1 Pro vs Claude 4.6 Opus](https://www.reddit.com/r/google_antigravity/comments/1s05lr3/) | C |
| 3 | [Reddit — Best Website UI/UX](https://www.reddit.com/r/google_antigravity/comments/1rypmq8/) | C |
| 4 | [Google Forum — Ultra Quota Reduction](https://discuss.ai.google.dev/t/ultra-dramatic-quota-reduction-after-update-this-needs-an-official-explanation/135526) | C |
| 5 | [Google Codelabs — Design to Code with Antigravity+Stitch](https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch) | A2 |
| 6 | [Reddit — 3.1 Pro going crazy big](https://www.reddit.com/r/google_antigravity/comments/1s08h9o/) | C |
| 7 | [Google Forum — Quota Fix](https://discuss.ai.google.dev/t/here-is-how-to-fix-the-anti-gravity-quota-issues/132342?page=4) | C |
| 8 | [Google Forum — Strict Limits Unusable](https://discuss.ai.google.dev/t/recent-strict-limits-make-the-pro-plan-unusable-for-real-world-development/135565) | C |

---

## 변경 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| v0.1 | 2026-03-26 | 초판 작성. 1주일 이내 자료 기반. |
| v0.2 | 2026-03-27 | Frontend agent choreography 추가 (planner→ui_builder→browser_verifier→a11y_reviewer). 브라우저 검증 종료 조건 구체화 (390/768/1440 viewport, console 0, 4xx/5xx 0). Degradation mode 추가 (6가지 fallback 트리거). 업스트림 디자인 소스 우선순위 정의 (Figma write beta > Stitch > screenshot > URL). 멀티 에이전트 프롬프트 추가. |
| v0.2 | 2026-03-27 | Agent choreography(planner→ui_builder→browser_verifier→a11y_reviewer) 추가. 브라우저 검증 종료 조건 6개 항목. Degradation mode — 자동 전환 트리거 6개. 업스트림 디자인 소스 우선순위(Figma write beta > Stitch > screenshot > URL). 멀티 에이전트 오케스트레이션 프롬프트 추가. |
