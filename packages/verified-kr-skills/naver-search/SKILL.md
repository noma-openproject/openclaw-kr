---
name: naver-search
description: "네이버 검색 API로 웹/뉴스/블로그/쇼핑 검색 결과를 가져온다. Use when: 사용자가 '네이버에서 검색해줘', '네이버 뉴스 찾아줘', '네이버 쇼핑에서 찾아봐', '네이버 블로그 검색' 등 네이버 검색을 요청할 때. NOT for: 구글 검색, 영어 전용 검색, 실시간 트렌드, 이미지 생성, 지도/길찾기."
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "requires":
          {
            "bins": ["curl", "jq"],
            "env": ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],
          },
      },
  }
---

# 네이버 검색 스킬

네이버 검색 API를 사용하여 한국어 검색 결과를 가져온다.

## 사용법

검색 스크립트를 실행한다:

```bash
bash scripts/naver-search.sh "검색어" [타입] [개수]
```

### 파라미터

| 파라미터 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| 검색어 | ✅ | — | 검색할 키워드 |
| 타입 | — | `web` | `web`, `news`, `blog`, `shop`, `book`, `local` |
| 개수 | — | `5` | 결과 수 (1~100) |

### 예시

```bash
# 웹 검색
bash scripts/naver-search.sh "한국 AI 스타트업"

# 뉴스 검색 10개
bash scripts/naver-search.sh "반도체 수출" news 10

# 쇼핑 검색
bash scripts/naver-search.sh "무선 이어폰" shop 5

# 블로그 검색
bash scripts/naver-search.sh "제주도 맛집" blog 5
```

### 출력 형식

각 결과는 아래 형식으로 출력된다:

```
[1] 결과 제목 (HTML 태그 제거됨)
    https://example.com/link
    결과 설명 텍스트
```

### 에러 처리

| 상황 | 메시지 |
|---|---|
| API key 미설정 | `[오류] NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다.` |
| API 호출 실패 | `[오류] 네이버 API 호출 실패 (HTTP {code})` |
| 결과 없음 | `[정보] '{검색어}'에 대한 검색 결과가 없습니다.` |
| rate limit | `[오류] API 호출 한도 초과. 일일 25,000건 제한.` |

## 환경 변수

네이버 Developers(https://developers.naver.com)에서 앱 등록 후 발급:

```bash
export NAVER_CLIENT_ID="your_client_id"
export NAVER_CLIENT_SECRET="your_client_secret"
```

## 제한사항

- 일일 API 호출 25,000건 제한
- 검색 결과 저작권은 원 콘텐츠 제공자에게 있음
- 상업적 사용 시 네이버 별도 계약 필요 가능
