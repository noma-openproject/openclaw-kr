# KR 스킬팩

## 개요

한국 서비스를 OpenClaw에서 사용할 수 있게 하는 스킬(플러그인) 모음이다.

## 설계 원칙

### API-first, Browser-last

1. **API 우선**: 공식 API가 있으면 API를 사용한다.
   - 안정적, 빠름, rate limit 명확
   - 예: 네이버 검색 API, 카카오 API

2. **스크래핑 차선**: API가 없거나 부족하면 구조화된 스크래핑.
   - robots.txt 준수
   - rate limiting 내장
   - 구조 변경 시 깨질 수 있음을 문서화

3. **브라우저 최후**: 위 두 방법 모두 불가능할 때만.
   - 가장 느리고 불안정
   - 인증이 필요한 경우에만 고려

### 스킬 구조 표준

```
kr-skills/
└── [skill-name]/
    ├── README.md         # 설계안 + API 문서 + 제한사항
    ├── index.js          # 스킬 진입점
    ├── config.json       # 스킬 설정 (API key 참조 등)
    └── test/             # 테스트
```

### 보안 요구사항

- API key는 환경 변수(.env)에서 로드. 코드에 하드코딩 금지.
- 사용자 데이터는 로컬에서만 처리. 외부 전송 금지.
- rate limiting 내장 필수.
- alpha-secure 프로필과 호환 필수.

## 스킬 목록

| 스킬 | 상태 | 방식 | 비고 |
|---|---|---|---|
| 네이버 검색 | 완료 | API | 네이버 검색 API (웹/뉴스/블로그/쇼핑) |
| HWP 문서 변환 | 완료 | 로컬 | @ohah/hwpjs 기반 HWP→JSON/MD/HTML/텍스트 |
| 서울 지하철 | 완료 | API | 서울시 공공데이터 실시간 도착정보 |
| 우편번호 검색 | 완료 | API | 도로명주소 API (juso.go.kr) |
| SRT 조회 | 완료 | 웹 | SRT 시간표/잔여석 (비공식, 조회 전용) |
| 로또 결과 | 완료 | npm | k-lotto 패키지 (k-skill 포크) |
| KBO 경기 결과 | 완료 | npm | kbo-game 패키지 (k-skill 참조) |
| 미세먼지 | 완료 | API | k-skill-proxy 경유 에어코리아 (k-skill 포크) |
| 택배 배송조회 | 완료 | 웹 | CJ대한통운/우체국 공식 (k-skill 참조) |
| 블루리본 맛집 | 완료 | API | 블루리본 서베이 공식 (k-skill 소스 포크) |
| 다이소 재고 | 완료 | API | 다이소몰 공식 매장/상품/재고 (k-skill 소스 포크) |

## 공유 유틸 (`_shared/`)

`_shared/kr-skill-utils.js` — 모든 스킬이 공유하는 유틸리티:
- 한국어 메시지 포맷터 (`formatError`, `formatInfo`, `formatWarn`)
- HTML 태그 제거 (`stripHtml`)
- 환경변수 검증 (`requireEnv`)
- Rate limiter (`createRateLimiter`)
- HTTP 래퍼 (`fetchJson`)
- 결과 포맷터 (`formatResults`)

## k-skill 통합

[NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) (MIT)에서 선별 포크.
- SKILL.md 포맷: k-skill 표준 (What/When to use, Prerequisites, Workflow, Done when, Failure modes)
- 기존 스킬(HWP/지하철/우편번호/SRT): 우리 코드(lib/) + k-skill 참조 SKILL.md
- 새 스킬(로또/미세먼지/블루리본/다이소/KBO/택배): k-skill SKILL.md 포크 + Phase 2-2 구현

## 향후 스킬 후보

| 스킬 | 우선순위 | 방식 | 비고 |
|---|---|---|---|
| 네이버 지도 | 중간 | API | 장소 검색/길찾기 |
| 카카오 번역 | 중간 | API | 한영 번역 |
| 은행 환율 | 낮음 | API | 환율 조회 |

## ClawhHub 배포

완성된 스킬은 ClawhHub managed skill로 배포한다:
- verified 검증 통과 필수
- README에 한국어 + 영어 설명 포함
- 라이선스: MIT
