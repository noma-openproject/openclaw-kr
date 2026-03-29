# 리스크 레지스터

> 프로젝트 리스크를 식별하고 대응 현황을 추적한다.
> 업데이트: Day 6 스프린트 일정에 포함.

## 리스크 매트릭스

영향도: H(상) M(중) L(하) | 발생 확률: H(높) M(중) L(낮)

---

### R01: ChatGPT OAuth 비호환
- **영향**: H | **확률**: M
- **설명**: OpenClaw가 ChatGPT OAuth 흐름을 완전히 지원하지 않을 수 있음
- **대응**: Ollama fallback 준비. API key 직접 연결도 대안.
- **상태**: ✅ **해소** — openai-codex OAuth로 gpt-5.4 에이전트 행동 성공 (2026-03-26). provider prefix `openai-codex/` 사용 필수.

### R02: Electron + Node 24 호환성
- **영향**: M | **확률**: M
- **설명**: Electron 최신 버전이 Node 24를 아직 지원하지 않을 수 있음
- **대응**: Node 22.16 fallback. Electron 버전 다운그레이드 가능.
- **상태**: ✅ **해소** — Electron 33.4.11 + Node 24.13.1 정상 동작 확인 (2026-03-26)

### R03: 카카오 플러그인 제한
- **영향**: H | **확률**: H
- **설명**: 카카오 API가 봇/자동화 사용 사례를 제한할 수 있음
- **대응**: Day 3에 시도, 블록 시 문서화하고 Phase 1으로 이동. 대안: 텔레그램 브릿지.
- **상태**: 미확인

### R04: OpenClaw 업스트림 breaking change
- **영향**: H | **확률**: L
- **설명**: 버전 고정(2026.3.23-2)했지만 다음 업그레이드 시 호환성 문제 가능
- **대응**: version-pinning.md 정책 따름. 업그레이드 전 staging 테스트 필수.
- **상태**: 관리 중

### R05: 보안 취약점 (image 도구)
- **영향**: H | **확률**: M
- **설명**: workspace 우회 취약점 (2026년 3월 advisory)
- **대응**: alpha-secure 프로필에서 image 도구 비활성화. advisory 추적.
- **상태**: 대응 완료 (프로필 적용)

### R06: 보안 취약점 (symlink traversal)
- **영향**: H | **확률**: M
- **설명**: agents.create/update에서 symlink traversal (2026년 3월 advisory)
- **대응**: alpha-secure 프로필에서 agents.create/update 비활성화.
- **상태**: 대응 완료 (프로필 적용)

### R07: Atomic Bot 라이선스 침해
- **영향**: H | **확률**: L
- **설명**: PolyForm Noncommercial 코드를 실수로 복사할 위험
- **대응**: AGENTS.md에 명시적 금지 규칙. 코드 리뷰 시 확인. 아이디어 참고 시 출처 기록.
- **상태**: 관리 중

### R08: 한국 사용자 온보딩 마찰
- **영향**: M | **확률**: H
- **설명**: time-to-first-action 20분 기준 초과 가능. 터미널 경험 부족한 사용자 대상.
- **대응**: Electron launcher로 터미널 노출 최소화. 한국어 가이드 제공.
- **상태**: Day 2 launcher POC로 검증 예정

### R09: Windows 지원 지연
- **영향**: M | **확률**: M
- **설명**: macOS 우선 개발로 Windows 빌드/테스트 지연
- **대응**: Day 5~6에 smoke test. Phase 1에서 본격 지원.
- **상태**: 계획됨

### R10: ClawhHub 스킬 검증 정책 변경
- **영향**: M | **확률**: L
- **설명**: ClawhHub의 verified 스킬 정책이 변경되면 추천 기준 재검토 필요
- **대응**: verified-only 정책 유지. 변경 시 자체 검증 레이어 추가.
- **상태**: 모니터링

### R11: Token burn 비용 초과
- **영향**: M | **확률**: M
- **설명**: ChatGPT/Gemini API 사용량이 예상 초과할 수 있음
- **대응**: 데모별 token burn 기록. 비용 상한 설정. Ollama 로컬 대안 활용.
- **상태**: 🟡 **추적 중** — 첫 행동(단순 인사): input 9,477 + output 48 = **9,525 토큰** (gpt-5.4, 8.2초). 비용 예상보다 높음. Token Saver Mode 기본값 정당성 확인.

### R12: 네이버 검색 API 제한
- **영향**: L | **확률**: M
- **설명**: 네이버 검색 API 일일 호출 제한 및 약관 변경 가능
- **대응**: API-first 설계 (kr-skills README 참조). rate limiting 내장. 대안 검색 소스 확보.
- **상태**: Day 4 구현 시 확인

### R13: Surface fork 필요성 조기 발생
- **영향**: H | **확률**: L
- **설명**: 한국형 UX에 core 변경이 너무 빨리 필요해질 수 있음
- **대응**: fork-policy.md의 4개 trigger 중 2개 충족 여부로 판단. 성급한 fork 방지.
- **상태**: 모니터링

### R14: 커뮤니티 채택 실패
- **영향**: M | **확률**: M
- **설명**: alpha 릴리스 후 커뮤니티 관심/참여 부족
- **대응**: Day 7 커뮤니티 포스트 초안. 한국 개발자 커뮤니티 타겟. 데모 영상 준비.
- **상태**: Day 7 계획

### R15: npm 글로벌 설치 권한 (Day 1 발견)
- **영향**: L | **확률**: H
- **설명**: macOS에서 `/usr/local/lib/node_modules` EACCES. 글로벌 설치 실패.
- **대응**: `npx openclaw` 로컬 실행으로 우회. README에 안내 필수.
- **상태**: 🟢 우회 완료 — npx 방식 사용 중

---

## 업데이트 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-03-26 | 초기 14개 리스크 등록 |
| 2026-03-26 | Day 1 결과 반영: R01 해소(OAuth 성공), R02 해소(Electron+Node24), R11 토큰 데이터, R15 추가(npm EACCES) |
