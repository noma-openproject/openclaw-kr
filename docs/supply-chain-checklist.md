# 스킬/MCP 공급망 보안 체크리스트

> 운영 규칙 섹션 7-3a (OWASP Agentic Skills Top 10 기반).
> 기본 정책: community marketplace는 탐색용, 설치 기본값은 deny.

## 설치 전 필수 체크 (5개 전부 통과 필수)

- [ ] **출처 확인**: verified publisher 또는 팀 allowlist에 등록된 게시자인가?
- [ ] **권한 범위 확인**: permission manifest를 읽었는가? 어떤 파일/네트워크/커맨드에 접근하는가? 최소 권한인가?
- [ ] **버전 고정**: latest 태그가 아닌 특정 버전으로 고정했는가?
- [ ] **격리 테스트**: 격리 환경(별도 브랜치)에서 먼저 테스트했는가?
- [ ] **소스 코드 확인**: 스킬의 소스 코드/SKILL.md를 직접 읽어봤는가?

## 운영 규칙

1. 팀 allowlist에 오른 publisher/버전만 프로덕션 프로젝트에 설치.
2. 격리 테스트 후 프로덕션으로 승격.
3. 설치된 스킬의 inventory(목록/owner/설치일/버전) 유지.
4. 미사용 스킬은 즉시 제거 (퇴출 절차).
5. 스킬 업데이트 시 changelog 확인 후 수동 승인.

## 현재 스킬/MCP 인벤토리

| 스킬/MCP | 출처 | 버전 | 설치일 | 용도 | 상태 |
|---|---|---|---|---|---|
| Playwright MCP | Anthropic 공식 | (설치 시 기록) | — | 시각 검증 | 권장 — Day 1 |
| Figma MCP | Anthropic 공식 | (설치 시 기록) | — | 디자인 연동 | Phase 1 예정 |
| filesystem MCP | Anthropic 공식 | (이미 활성) | — | 파일 접근 | 활성 |

## k-skill 참조 라이브러리 인벤토리 (검토 대기)

> k-skill(NomaDamas)에서 참조할 라이브러리 목록. 직접 설치 전 개별 검토 필수.
> 상세 평가: `openclaw-kr-project-knowledge.md` 섹션 16.

| 라이브러리 | 언어 | 용도 | 라이선스 | 상태 |
|---|---|---|---|---|
| @ohah/hwpjs | Node.js | HWP 문서 처리 | MIT | 검토 대기 — Phase 1 |
| SRTrain | Python | SRT 예매 | MIT | 검토 대기 — Phase 1 후반 |
| kbo-game | Node.js | KBO 야구 데이터 | 미확인 | 보류 |
| k-lotto | Node.js | 로또 결과 | MIT | 보류 |
| korail2 | Python | KTX/Korail 예매 | 미확인 | 보류 (스킬 미동작) |
| kakaocli | macOS binary | 카카오톡 CLI | 미확인 | 보류 (Noma 카카오 충돌) |

## 플랫폼별 보안 도구

- **Claude Code**: `managed-settings.d/`로 조직 수준 스킬 정책, `sandbox.failIfUnavailable`로 샌드박스 강제
- **Codex**: `userpromptsubmit` hook으로 스킬 호출 전 검증, plugin suggestion allowlist
