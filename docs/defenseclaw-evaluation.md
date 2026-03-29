# DefenseClaw Skill-Scanner 통합 평가 보고서

> Phase 1 항목 7 산출물. 2026-03-28 작성.

## 1. DefenseClaw 개요

- **개발**: Cisco AI Defense 팀
- **공개일**: 2026-03-27 (RSAC 2026 발표)
- **라이선스**: MIT
- **소스**: github.com/cisco-ai-defense/defenseclaw

### 5개 스캐너

| 스캐너 | 대상 | Noma 관련성 |
|---|---|---|
| **skill-scanner** | OpenClaw 스킬 설치 전 스캔 | 높음 — 핵심 통합 대상 |
| **mcp-scanner** | MCP 서버 보안 검증 | 중간 — Phase 2 MCP 통합 시 |
| **a2a-scanner** | Agent-to-Agent 통신 | 낮음 — 현재 단일 에이전트 |
| **CodeGuard** | AI 생성 코드 정적 분석 | 중간 — §16 코드 검증 보완 |
| **AI-BOM** | 의존성 투명성 보고서 | 높음 — supply-chain 감사 |

## 2. Noma supply-chain-checklist 매핑

| 체크리스트 항목 | DefenseClaw 자동화 | 수동 유지 |
|---|---|---|
| 검증된 퍼블리셔 확인 | ✅ skill-scanner (publisher verification) | - |
| 권한 매니페스트 검토 | ✅ skill-scanner (permission analysis) | - |
| 버전 고정 확인 | ⚠️ 부분 (버전 추적은 가능, 고정 정책은 수동) | 고정 정책 결정 |
| 격리 환경 테스트 | ✅ skill-scanner (sandbox execution) | - |
| 소스코드 직접 확인 | ⚠️ CodeGuard로 보완 가능하나 완전 대체 불가 | 핵심 로직 수동 리뷰 |

**결론**: 5항목 중 3항목 완전 자동화, 2항목 부분 자동화 가능.

## 3. 현재 통합 상태

### 구현 완료 (Phase 1)

- `scripts/scan-skill.js` — DefenseClaw CLI 래퍼 + 수동 체크리스트 폴백
  - DefenseClaw 설치 시: `defenseclaw scan --skill <path>` 자동 실행
  - 미설치 시: 5항목 대화형 체크리스트 + 정적 분석
  - 판정: PASS / REVIEW / BLOCK
  - 결과 저장: `~/.openclaw/scans/`

### Phase 2 통합 로드맵

| 단계 | 내용 | 시기 |
|---|---|---|
| 1. CLI 래퍼 (현재) | scan-skill.js 수동 실행 | Phase 1 ✅ |
| 2. Launcher 연동 | 스킬 설치 UI에서 자동 스캔 | Phase 2 초기 |
| 3. Risk Dashboard | Receipt UI에 보안 스코어 표시 | Phase 2 중기 |
| 4. 자동 차단 | BLOCK 판정 시 설치 자동 거부 | Phase 2 후기 |

## 4. 결정 기준

### Risk Score 임계값 (DefenseClaw 사용 시)

| Score | 판정 | 조치 |
|---|---|---|
| 0 ~ 3.9 | PASS | 설치 진행 |
| 4.0 ~ 6.9 | REVIEW | 수동 검토 후 결정 |
| 7.0+ (CVSS) | BLOCK | 설치 차단 |

### 정적 분석 기준 (수동 모드)

| 패턴 | 위험도 | 조치 |
|---|---|---|
| child_process (exec/spawn) | 높음 | 권한 미검토 시 BLOCK |
| http/https.request | 중간 | REVIEW |
| fs.write/unlink | 중간 | 권한 매니페스트 확인 |
| eval/Function() | 높음 | BLOCK |

## 5. 테스트 결과 (kakao-entry 스킬)

```
[scan] 정적 분석: ./plugins/kakao-entry
  파일: 3개 JS/TS
  의존성: 0개
  네트워크 패턴: 2개 파일 (relay.js, index.js)
  쉘 실행 패턴: 0개 파일
```

판정: **REVIEW** — 네트워크 패턴 발견 (gateway 중계용, 의도된 동작).

## 6. 권장사항

1. **즉시**: scan-skill.js를 새 스킬 추가 전 실행하는 운영 습관 정착
2. **Phase 2 초기**: DefenseClaw 설치 + skill-scanner 자동 연동
3. **Phase 2 중기**: mcp-scanner 추가 (MCP 서버 통합 시)
4. **모니터링**: DefenseClaw GitHub 릴리스 + ClawHavoc 보안 공지 추적
