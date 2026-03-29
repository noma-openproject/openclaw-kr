# 네이버 검색 스킬

> Day 4 구현 예정. 이 문서는 설계안이다.

## 목표

OpenClaw에서 네이버 검색을 사용할 수 있게 한다.
사용자가 "네이버에서 [검색어] 검색해줘"라고 하면 결과를 반환한다.

## API 정보

### 네이버 검색 API (Naver Developers)

- **엔드포인트**: `https://openapi.naver.com/v1/search/{type}`
- **지원 타입**: web, news, blog, shop, image, local, book 등
- **인증**: Client ID + Client Secret (Naver Developers 앱 등록)
- **일일 제한**: 25,000건/일 (기본)
- **응답 형식**: JSON

### 필요한 환경 변수

```
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret
```

## 기능 설계

### 기본 기능

1. **웹 검색**: 네이버 웹 검색 결과 반환
2. **뉴스 검색**: 최신 뉴스 검색
3. **블로그 검색**: 네이버 블로그 검색

### 입력

```json
{
  "query": "검색어",
  "type": "web",
  "display": 10,
  "sort": "sim"
}
```

### 출력

```json
{
  "total": 12345,
  "items": [
    {
      "title": "결과 제목",
      "link": "https://...",
      "description": "결과 설명"
    }
  ]
}
```

## 구현 계획

### 파일 구조 (OpenClaw 스킬 형식)

```
naver-search/
├── SKILL.md              # OpenClaw 스킬 매니페스트 (frontmatter + 사용 지침)
├── README.md             # 이 파일 (개발 문서)
└── scripts/
    └── naver-search.sh   # curl + jq 기반 API 호출 스크립트
```

### 구현 단계 (Day 4)

1. [ ] 네이버 Developers 앱 등록 + API key 발급
2. [ ] index.js: 검색 API 호출 함수 구현
3. [ ] OpenClaw 스킬 형식으로 래핑
4. [ ] rate limiting 구현 (25,000건/일 제한 준수)
5. [ ] 에러 핸들링 (한국어 메시지)
6. [ ] 테스트 작성 + 실행
7. [ ] alpha-secure 프로필 호환 확인

## 제한사항

- 네이버 API 일일 호출 제한 (25,000건)
- 상업적 사용 시 별도 계약 필요할 수 있음
- 검색 결과의 저작권은 원 콘텐츠 제공자에게 있음
- HTML 태그가 포함된 결과 정제 필요

## 대안

API 제한 초과 시:
1. 검색 결과 캐싱 (TTL: 10분)
2. DuckDuckGo 한국어 검색 fallback
3. 사용량 알림 + 일시 중단
