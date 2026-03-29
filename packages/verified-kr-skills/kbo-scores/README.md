# kbo-scores (설계 문서)

KBO 프로야구 경기 결과를 조회하는 OpenClaw 스킬. **Phase 2-1에서는 설계만. 구현은 Phase 2-2.**

## 설계 배경

- 공식 API 없음 — API-first 원칙(P-2)에 따라 브라우저/스크래핑이 필요
- 커뮤니티/데모 가치 높음 (한국 프로야구 팬층)
- Phase 2-1 우선순위: 🟢 (낮음)

## 데이터 소스 후보

| 소스 | 방식 | 장점 | 단점 |
|---|---|---|---|
| KBO 공식 사이트 (koreabaseball.com) | 스크래핑 | 공식 데이터 | 구조 변경 잦음, robots.txt 제한적 |
| 네이버 스포츠 (sports.naver.com) | 스크래핑 | 구조화된 HTML, 빠른 업데이트 | 저작권, ToS |
| 스탯티즈 (statiz.co.kr) | 스크래핑 | 상세 통계 | 커뮤니티 사이트, 부하 우려 |
| ESPN Korea | API 가능성 | 국제 표준 | 한국 데이터 커버리지 불확실 |

**권장**: 네이버 스포츠 (가장 구조화, 빠른 업데이트) + robots.txt 준수 + rate limiting

## 기능 범위

### MVP (Phase 2-2)

1. **오늘 경기 결과** — 날짜별 전 경기 스코어
2. **팀별 순위** — 시즌 순위표
3. **최근 결과** — 특정 팀의 최근 N경기

### 확장 (Phase 2-3+)

- 선수 타율/방어율
- 일정 (다가오는 경기)
- 실시간 중계 스코어

## 기술 설계

```
kbo-scores/
├── SKILL.md
├── README.md
├── lib/
│   ├── scraper.js       # HTML 파싱 (cheerio 또는 regex)
│   ├── formatter.js     # 결과 포맷팅
│   └── cache.js         # 인메모리 캐시 (5분 TTL)
├── scripts/
│   └── kbo-scores.js    # CLI
└── test/
    ├── kbo-scores.test.js
    └── fixtures/
        └── mock-scores.html
```

### 의존성 후보

| 패키지 | 용도 | 라이선스 |
|---|---|---|
| cheerio | HTML 파싱 | MIT |
| (없음 — regex) | HTML 파싱 대안 | — |

**결정 보류**: cheerio vs regex. cheerio는 더 안정적이지만 의존성 추가. regex는 의존성 없지만 구조 변경에 취약.

### 캐싱 전략

- 인메모리 캐시, 5분 TTL
- 같은 날짜 + 같은 팀 요청 → 캐시 히트
- 이유: KBO 데이터는 실시간이 아니며, 과도한 요청으로 IP 차단 방지

### Rate Limiting

- 1분 5건 (보수적 — 스크래핑 대상이므로)
- robots.txt crawl-delay 준수

## 보안 고려사항

- scan-skill.js: REVIEW 예상 (네트워크 패턴)
- alpha-secure 호환: read-only, 사용자 데이터 외부 전송 없음
- 스크래핑 대상 사이트의 ToS 확인 필요

## 구현 일정

- Phase 2-2 초반: cheerio/regex 결정 + scraper 구현
- Phase 2-2 중반: CLI + 테스트 + 캐시
- Phase 2-2 후반: 통합 + 보안 스캔

## 미결 사항

1. 네이버 스포츠 스크래핑 vs KBO 공식 사이트?
2. cheerio 의존성 추가 vs regex only?
3. 시즌 오프 기간(11~3월) 대응?
4. kbo-game npm 패키지 (라이선스 미확인) 사용 여부?
