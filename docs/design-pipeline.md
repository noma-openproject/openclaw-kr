# 디자인 파이프라인

> 운영 규칙 섹션 19 + Antigravity Frontend Policy 기반.
> AI는 디자인 판단기가 아니라 디자인 구현기다 — visual source of truth를 먼저 준비한다.

## Phase 0 (현재): 커스텀 UI 없음

- OpenClaw 대시보드를 Electron으로 그대로 래핑
- 디자인 작업 불필요
- Playwright로 "대시보드가 정상 로드되는지"만 시각 검증

## Phase 1+: 한국어 래퍼 + 승인 센터

### 파이프라인 3단계

**Stage 1 — 아이디어화: Stitch (무료)**
- 자연어로 UI 설명 → 고충실도 시안 생성 (5화면 동시)
- Stitch MCP로 Claude Code/Cursor에서 직접 연동
- DESIGN.md export로 디자인 토큰 추출
- 결과물 = visual source of truth

**Stage 2 — 정밀화: Figma + MCP**
- Stitch 출력을 Figma로 옮겨 디자인 시스템 정리
- Figma MCP 서버로 에이전트가 디자인 메타데이터 읽기/쓰기 (beta)
- write 안전 규칙: staging 파일에서만, selected frame 범위로 한정
- merge 전 사람 검토 필수

**Stage 3 — 구현: React + TypeScript + Tailwind + shadcn/ui**
- Antigravity Policy 제4조: route → section → component 분할 구현
- DESIGN.md 또는 design tokens 먼저 작성 (제5조)
- planning mode로 구조, fast mode로 국소 수정 (제6조)

### 시각 검증 (라운드트립 패턴, 섹션 19-9)

```
1. 에이전트가 프론트엔드 코드 수정
2. dev 서버 실행
3. Playwright 스크린샷 캡처
4. 에이전트가 스크린샷을 시각적 분석 (레이아웃, 간격, 색상)
5. 문제 발견 → 코드 수정 → 2번으로
6. 시각 검증 통과 → 완료
```

이 루프가 없으면 "코드상으로는 맞는데 화면에서는 깨지는" 결과를 감지 못한다.
integrated browser 비교 루프를 거치지 않은 UI는 완료로 간주하지 않는다 (제8조).

### Antigravity Policy 적용 요약

| 조항 | 규칙 |
|---|---|
| 제1조 | 구현기로 사용 (디자인 판단기가 아님) |
| 제2조 | 모든 프론트 티켓에 visual source of truth 첨부 |
| 제3조 | React + Tailwind + shadcn/ui 기본 스택 |
| 제4조 | 페이지 전체 one-shot 금지 → route/section/component 분할 |
| 제5조 | 구현 전 DESIGN.md / design tokens 먼저 |
| 제8조 | integrated browser 비교 루프 필수 |
| 제9조 | 최종 polish는 2차 패스 검수 |
| 제10조 | Antigravity 단독 의존 금지, 대체 경로 유지 |

### 모델 역할 분담 (섹션 19-8)

| 작업 | 최적 모델 |
|---|---|
| 디자인 탐색/프로토타입 | Gemini (비주얼 구현 속도) |
| UI 구현 (HTML/CSS) | Gemini 또는 GPT-5.4 |
| 비즈니스 로직/API | Claude 또는 GPT-5.4 |
| 리팩터링/대규모 변경 | Claude (재작업 최소) |
| 시각 검증/디버깅 | Codex Playwright 또는 Antigravity |
| 장시간 자율 작업 | Codex 또는 Claude Code |

구체적 별점/가격/quota → `tool-landscape-snapshot-2026-03.md` 참조.
