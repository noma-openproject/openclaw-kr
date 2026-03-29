---
description: "브라우저 자동화 3계층 도구 체계 — Verify/Operate/Scrape 모드, 완료 산출물 요건"
globs: ["tests/**", "e2e/**", "playwright/**", "playwright.config.*"]
---

# 브라우저 자동화 운영 계약

> 상세: `docs/project-operation-rules-v2.1.md` §14-4 + `docs/tool-landscape-snapshot-2026-03.md`

## 대상 범위

- **기본**: localhost / staging / test 계정만
- **수동 승인 필수**: 프로덕션, 결제, 관리자 실데이터

## 3 모드

| 모드 | 목적 | 에이전트 권한 |
|---|---|---|
| **Verify** (기본) | 스크린샷, console, network 수집 | read-only |
| **Operate** | 폼 입력, 클릭, 네비게이션 | 제한적 write |
| **Scrape** | 외부 사이트 데이터 추출 | read-only + 외부 네트워크 |

## 3-Tier 도구 체계

| Tier | 도구 | 설치 | 특징 |
|---|---|---|---|
| **1 (네이티브)** | Codex Playwright Interactive | 빌트인 | 빌드 중 실시간 시각 디버깅 |
| **2 (MCP 통합)** | Claude Code Playwright MCP | `/plugin` | 브라우저 자동화 + 캡처 |
| **3 (커뮤니티)** | Browser Testing/Screenshot/Analysis | mcpmarket.com | DevTools, OCR, 반응형 프리뷰 |

**선택 규칙**: Tier 1 사용 가능하면 Tier 1. 크로스 플랫폼이면 Tier 2. 특수 용도(OCR, 헤들리스)면 Tier 3.

## 실행 규칙

1. **1 run = 1 격리 브라우저 컨텍스트** — 이전 세션 상태 재사용 금지
2. **액션 상한**: 루프당 최대 30회. 초과 시 요약 → 새 계획으로 재진입
3. **승인 반복 3회+**: 같은 액션에 대해 → 수동 검증 모드로 전환
4. **세션 종료 시**: 브라우저 서브트리(Chrome Helper 등) 정리 확인

## 완료 산출물 (전부 필수)

- [ ] **스크린샷**: 390px (모바일) / 768px (태블릿) / 1440px (데스크톱)
- [ ] **console error summary**: 목표 0개
- [ ] **failed network request summary**: 목표 0개 (4xx/5xx)
- [ ] **changed files list**: 이번 작업에서 변경된 파일 목록
- [ ] **reference vs actual mismatch list**: 디자인 기준 대비 차이점

5개 항목 전부 통과 = 완료. 미충족 항목 있으면 패치 → 재검증.

## Known Issues (2026-03 기준)

| 이슈 | 심각도 | 우회 방법 |
|---|---|---|
| Codex Playwright 승인 회귀 (03-19) | 높음 | Smart Approvals guardian 또는 세션 수준 허용 |
| Chrome Helper 프로세스 누수 | 중간 | 세션 후 `pkill -f "Chrome Helper"` |
| localhost 접근 차단 | 중간 | 샌드박스 네트워크 설정에서 localhost 허용 확인 |
| Figma SVG→웹 코드 85-90% 정확도 | 중간 | 브라우저 검증 필수, 수동 CSS 수정 |

## 시각 검증 라운드트립 패턴 (§19-9)

```
1. 에이전트가 프론트엔드 코드 수정
2. 테스트/dev 서버 실행
3. Playwright/브라우저 도구로 스크린샷 캡처
4. 에이전트가 스크린샷 시각 분석 (레이아웃/스페이싱/색상/깨짐)
5. 문제 발견 → 코드 수정 → #2로 복귀
6. 시각 검증 통과 → 완료
```

이 루프 없이는 "코드는 괜찮지만 화면에서 깨지는" 문제를 놓침.
