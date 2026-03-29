---
description: "서브에이전트 운영 계약 — Scout/Mutator/Verifier 역할, spawn 규칙, 결과 스키마"
---

# 서브에이전트 운영 계약

> 상세: `docs/project-operation-rules-v2.1.md` §13, §13-7

## Spawn 규칙

- **Explicit spawn only** — auto fan-out 금지. 사람이 의도한 서브에이전트만 생성.
- `max_depth`: 기본 1 (서브에이전트가 서브에이전트를 생성하지 않음)
- `max_threads`: 프로젝트 기준 ≤5 권장

## 3 역할 (권한 수준)

| 역할 | 권한 | 사용 사례 |
|---|---|---|
| **Scout** | read-only (파일 읽기, 검색) | 탐색, 코드 분석, 정보 수집 |
| **Mutator** | read/write (파일 생성/수정) | 코드 생성, 수정, 리팩토링 |
| **Verifier** | read-only (읽기 + 테스트 실행) | 코드 리뷰, 테스트, 시각 검증 |

**규칙:**
- Mutator는 반드시 worktree 격리 (`isolation: worktree`) 사용
- Verifier는 코드 수정 권한 없음 — 스크린샷/console/network 수집만
- Scout는 가장 경량, 탐색/조사에 우선 사용

## 결과 스키마

서브에이전트 반환 포맷 사전 정의. 최소 필드:

```json
{
  "status": "success | failure | partial",
  "summary": "작업 결과 요약 (1-2문장)",
  "changed_files": ["path/to/file1.ts"],
  "issues_found": ["이슈 설명"],
  "next_action": "다음 단계 제안"
}
```

- spawn 시 수락 기준을 명시
- 결과가 수락 기준 미충족 → 1회 재시도 → 실패 시 사용자 개입

## 스레드 소유권

- 같은 스레드를 2개 터미널에서 동시 사용 금지 — 필요하면 fork
- 완료된 에이전트는 명시적으로 종료 (auto-reuse 없음)
- "awaiting instruction" 상태 지속 → 1회 재시도 → 수동 개입

## 모델 선택

- **서브에이전트 기본**: 경량 모델 (Sonnet / Haiku / GPT-5.4 mini)
- **메인 세션**: 고성능 모델 (Opus / GPT-5.4) — 복잡한 추론, 아키텍처, 최종 판단
- 비용: 서브에이전트 ~30% 메인 리소스 소비
- **주의**: 모델 override 버그 보고 있음 → spawn 후 실제 사용 모델 확인 필수

## 도메인 전문 구성 (대규모 작업)

| 에이전트 | 도메인 | 권한 |
|---|---|---|
| Frontend Agent | React 컴포넌트, UI 상태, 폼 | Mutator |
| Backend Agent | API 라우트, 서버 액션, 비즈니스 로직 | Mutator |
| DB Agent | 스키마, 마이그레이션, 쿼리 | Mutator |
| Security Agent | 취약점 스캔 | Scout (read-only) |
| Test Agent | 테스트 작성/실행 | Verifier |

## 병렬 vs 순차

- **병렬**: 독립 도메인 (프론트 + 백엔드 동시)
- **순차**: 의존성 존재 (DB 스키마 → 백엔드 API → 프론트엔드)
