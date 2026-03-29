---
description: "프론트엔드/UI 작업 시 적용 — visual source of truth, 분할 구현, 에이전트 안무, 검증"
globs: ["src/components/**", "src/pages/**", "src/app/**", "*.tsx", "*.css"]
---

# 프론트엔드 운영 규칙

> 상세: `docs/antigravity-frontend-policy.md` + `docs/project-operation-rules-v2.1.md` §19

## 10개 핵심 조건

1. **Visual source of truth 필수** — 디자인 기준 없이 UI 시작 금지.
   - 우선순위: Figma write beta > Stitch > 스크린샷 > 참조 URL
2. **기본 스택**: React + Tailwind + shadcn/ui (기존 디자인시스템 있으면 예외)
3. **페이지 원샷 금지** — route → section → component 분할 구현.
4. **DESIGN.md 선행**: 구현 전 색상/타이포/스페이싱/컴포넌트 인벤토리 추출.
5. Planning mode = 구조 작업, Fast mode = 국소 수정에만 사용.
6. Quota 민감 시 predictive features OFF.
7. **브라우저 미검증 UI = 미완료**.
8. 최종 폴리시 (타이포/스페이싱/모션/반응형/a11y) → 2-pass 리뷰 필수.
9. 마감 작업에 단일 에이전트만 의존 금지 — 항상 폴백 경로 유지.
10. 디자인 토큰(DESIGN.md) 보존 — 임의 색상/스페이싱 생성 금지.

## 에이전트 안무 (4-Agent Pattern)

| 순서 | 에이전트 | 권한 | 역할 |
|---|---|---|---|
| 1 | planner | read-only | 섹션 경계 정의, 파일 목록, 수락 기준 |
| 2 | ui_builder | read/write | 선택된 섹션만 구현 (route→section→component) |
| 3 | browser_verifier | read-only | 390/768/1440px 스크린샷, 시각 불일치, console 에러, 실패 요청 수집 |
| 4 | a11y_reviewer | read-only | 시맨틱, 포커스 순서, 대비, ARIA, 키보드 동작 검증 |

**제약**: ui_builder만 코드 수정. verifier/reviewer는 읽기전용. 관련 없는 섹션 수정 금지.

## 브라우저 검증 완료 기준 (6개 전부 충족)

- [ ] 390px (모바일), 768px (태블릿), 1440px (데스크톱) 스크린샷 캡처
- [ ] console error: 0
- [ ] core flow network 4xx/5xx: 0
- [ ] reference vs actual 시각 불일치 목록 작성
- [ ] a11y quick pass: 헤딩 구조, 대비, 키보드 네비게이션, ARIA 역할
- [ ] 위 항목 전부 통과

불일치 발견 시: ui_builder에 패치 목록 전달 → 재검증.
2회+ 실패 시: 수동 검증 모드로 전환.

## 모델 선택 가이드

| 작업 | 추천 모델 | 이유 |
|---|---|---|
| 비주얼/애니메이션 | Gemini 3.1 Pro | 참조→구현 속도 5/5 |
| 속도/자율 실행 | Codex (GPT-5.4) | 1000+ tok/s, 7시간+ 자율 |
| 로직/품질/리팩터 | Claude Opus | ~30% 재작업 감소, 환각 최소 |

## 폴백 트리거

| 트리거 | 폴백 경로 |
|---|---|
| quota 대기 > 20분 | Figma + Codex/Claude Code |
| Stitch 불가 | Figma 또는 스크린샷 → 직접 구현 |
| 컨텍스트 과부하 | /compact 또는 세션 분할 |
| 같은 브라우저 액션 승인 3회+ | 수동 검증 모드 |
| 스킬 로드 실패 | 스킬 비활성화 + 수동 프롬프트 |
| dev 서버 불안정 (2회 크래시) | 수동 검증 + 에이전트 코드만 |

## 컴포넌트 분할 템플릿

```
이 UI를 섹션으로 나눠:
1) hero  2) features  3) pricing  4) FAQ  5) footer

지금 1단계만 구현.

수락 기준:
- 이 섹션 외 파일 변경 없음
- 재사용 가능한 컴포넌트 경계
- 데스크톱 + 모바일 반응형
- 변경된 파일 목록 보고
```
