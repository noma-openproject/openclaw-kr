# ClawHub-first 배포 전략

> 지식문서 P10: kakao-entry, verified-kr-skills, permission-profiles를 ClawHub에서 설치/발견 가능하게.

## 현황

- OpenClaw 2026.3.22부터 `bare install`이 ClawHub-first로 변경
- 스킬 설치: `openclaw install @publisher/skill-name`
- 검증 배지: verified publisher 등록 후 가능

## 배포 대상

### 1차 (즉시 배포 가능)

| 패키지 | ClawHub 이름 (예정) | 유형 | 인증 필요 |
|---|---|---|---|
| `packages/permission-profiles/alpha-secure.json` | `@noma/alpha-secure` | 프로필 | ❌ |
| `packages/verified-kr-skills/naver-search` | `@noma/naver-search` | 스킬 | ✅ 네이버 API |
| `packages/verified-kr-skills/hwp-convert` | `@noma/hwp-convert` | 스킬 | ❌ |
| `packages/verified-kr-skills/seoul-metro` | `@noma/seoul-metro` | 스킬 | ✅ 서울 공공API |
| `packages/verified-kr-skills/postal-code` | `@noma/postal-code` | 스킬 | ✅ juso.go.kr |

### 2차 (테스트 후 배포)

| 패키지 | ClawHub 이름 (예정) | 비고 |
|---|---|---|
| `packages/verified-kr-skills/srt-query` | `@noma/srt-query` | 비공식 엔드포인트 주의 |
| `packages/verified-kr-skills/lotto-results` | `@noma/lotto-results` | k-lotto 의존 |
| `packages/verified-kr-skills/kbo-scores` | `@noma/kbo-scores` | kbo-game 의존 |
| `packages/verified-kr-skills/fine-dust` | `@noma/fine-dust` | k-skill-proxy 의존 |
| `packages/verified-kr-skills/delivery-tracking` | `@noma/delivery-tracking` | CJ/우체국 |
| `packages/verified-kr-skills/blue-ribbon` | `@noma/blue-ribbon` | k-skill 소스 포크 |
| `packages/verified-kr-skills/daiso-search` | `@noma/daiso-search` | k-skill 소스 포크 |

### 보류

| 패키지 | 사유 |
|---|---|
| `plugins/kakao-entry` | 사용자별 봇/채널 설정 필요. ClawHub 단독 설치로는 동작하지 않음 |

## Publisher 등록 절차

1. ClawHub 계정 생성 + publisher 신청 (`@noma`)
2. 이메일/GitHub 인증
3. 스킬별 `SKILL.md` 검증 통과 (frontmatter 필수 필드)
4. `openclaw publish` 명령으로 배포

## SKILL.md 요구사항

ClawHub verified 배지를 받으려면:
- `name`, `description`, `license` frontmatter 필수
- `metadata.openclaw.requires.bins`, `metadata.openclaw.requires.env` 명시
- README.md 포함

## 배포 스크립트

```bash
# 개별 스킬 배포 (예시)
cd packages/verified-kr-skills/hwp-convert
openclaw publish

# 프로필 배포
cd packages/permission-profiles
openclaw publish
```

## alpha-secure 호환 확인

배포 전 모든 스킬이 아래를 만족해야 함:
- `install` 도구 미사용
- `image` 도구 미사용
- `agents.create` / `agents.update` 미사용
- `askBeforeExecute=true`와 호환

## 타임라인

- Phase 2 초반: publisher 등록 + 1차 배포 (인증 불필요 5개)
- Phase 2 중반: 2차 배포 (테스트 후 추가)
- Phase 2 후반: kakao-entry 번들 배포 방안 검토
