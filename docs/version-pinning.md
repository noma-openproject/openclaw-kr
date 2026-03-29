# 버전 고정 매트릭스

## 현재 고정 버전

| 구성 요소 | 버전 | 설치 방법 | 비고 |
|---|---|---|---|
| OpenClaw | `2026.3.23-2` | `npm install -g openclaw@2026.3.23-2` | npm latest stable |
| Node.js | 24 권장, 22.16+ 최소 | [nodejs.org](https://nodejs.org) | LTS 권장 |
| Electron | `^33.0.0` | `npm install` (devDependencies) | package.json에 명시 |
| npm | latest | Node.js와 함께 설치 | |

## 브라우저 모드

- **현재**: `existing-session` / `user`
- **변경 사항**: extension relay 제거됨 (2026.3.23-2 기준)
- **영향**: 브라우저 자동화 시 기존 세션 활용

## 플러그인 소스

- **기본**: ClawhHub (2026.3.22부터 기본)
- **정책**: verified-only 스킬 추천 (alpha-secure 프로필)

## 업그레이드 정책

### 원칙

1. **OpenClaw 코어**: 마이너 버전은 staging 테스트 후 업그레이드. 메이저 버전은 ExecPlan 필수.
2. **Node.js**: LTS 채널 따라감. 메이저 업그레이드는 Electron 호환성 확인 후.
3. **Electron**: OpenClaw와 Node.js 호환성 확인 후 업그레이드.

### 업그레이드 체크리스트

```markdown
- [ ] 변경 로그 확인 (breaking changes)
- [ ] 보안 advisory 확인
- [ ] staging 환경에서 Test 1~3 수행
- [ ] alpha-secure 프로필 호환성 확인
- [ ] version-pinning.md 업데이트
- [ ] PLANS.md에 기록
```

### 긴급 보안 패치

보안 advisory 발생 시:
1. advisory 내용 확인 + risk-register.md 업데이트
2. 패치 버전 staging 테스트
3. alpha-secure 프로필에 임시 대응 추가 (필요 시)
4. 패치 적용 후 고정 버전 업데이트

## 업데이트 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-03-26 | 초기 버전 매트릭스 설정: OpenClaw 2026.3.23-2, Node 24, Electron 33 |
