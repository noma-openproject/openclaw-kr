# 권한 프로필 (Permission Profiles)

## 개요

OpenClaw의 보안 설정을 사전 정의한 프로필 모음이다.
비기술 사용자가 안전한 기본값으로 시작할 수 있도록 한다.

## 프로필 목록

### alpha-secure.json (현재 유일)

**가장 제한적인 프로필.** 모든 실행 전 사용자 확인 필요.

| 설정 | 값 | 이유 |
|---|---|---|
| `askBeforeExecute` | `true` | 모든 도구 실행 전 사용자 확인 |
| `askFallback` | `"deny"` | 확인 불가 시 거부 |
| `tools.deny` | install, image, agents.* | 3월 보안 advisory 대응 |
| `skills.verifiedOnly` | `true` | ClawhHub 검증 스킬만 |
| `kakaoSafeMode` | write/edit/browser OFF | 원격면 최소 권한 |
| `privacy.memorySearch` | `false` | ChatGPT 메모리 검색 OFF |

## 사용법

### OpenClaw에 프로필 적용

```bash
# 프로필 내용을 OpenClaw 설정에 병합
openclaw config set tools.deny '["install", "image", "agents.create", "agents.update"]'
openclaw config set exec.askBeforeExecute true
openclaw config set exec.askFallback deny
```

### 프로필 전환 (향후)

```bash
# TODO(openclaw-kr): 프로필 전환 스크립트 추가
# node scripts/apply-profile.js alpha-secure
```

## 새 프로필 추가 시

1. `permission-profiles/` 디렉토리에 JSON 파일 생성
2. `alpha-secure.json`을 기반으로 필요한 부분만 완화
3. 이 README에 프로필 설명 추가
4. ExecPlan 승인 필수 (AGENTS.md 규칙)

## 향후 프로필 계획

| 프로필 | 대상 | 차이점 |
|---|---|---|
| alpha-secure | 모든 alpha 사용자 | 가장 제한적 (현재) |
| beta-standard | beta 사용자 | image 도구 조건부 허용 (패치 후) |
| power-user | 개발자 | install 허용, askBeforeExecute 선택적 |
