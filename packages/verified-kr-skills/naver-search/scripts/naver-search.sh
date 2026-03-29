#!/usr/bin/env bash
# naver-search.sh — 네이버 검색 API 호출 스크립트
# 사용법: bash naver-search.sh "검색어" [타입] [개수]
# 타입: web(기본), news, blog, shop, book, local
# 개수: 1~100 (기본 5)

set -euo pipefail

# --- 인자 파싱 ---
QUERY="${1:-}"
TYPE="${2:-web}"
DISPLAY="${3:-5}"

if [ -z "$QUERY" ]; then
  echo "[오류] 검색어를 입력하세요."
  echo "사용법: bash naver-search.sh \"검색어\" [web|news|blog|shop|book|local] [개수]"
  exit 1
fi

# --- 환경 변수 확인 ---
if [ -z "${NAVER_CLIENT_ID:-}" ] || [ -z "${NAVER_CLIENT_SECRET:-}" ]; then
  echo "[오류] NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다."
  echo "네이버 Developers(https://developers.naver.com)에서 앱 등록 후 설정하세요:"
  echo "  export NAVER_CLIENT_ID=\"your_id\""
  echo "  export NAVER_CLIENT_SECRET=\"your_secret\""
  exit 1
fi

# --- 타입 검증 ---
VALID_TYPES="web news blog shop book local"
if ! echo "$VALID_TYPES" | grep -qw "$TYPE"; then
  echo "[오류] 지원하지 않는 검색 타입: $TYPE"
  echo "지원 타입: $VALID_TYPES"
  exit 1
fi

# --- API 엔드포인트 ---
# shop 타입은 엔드포인트가 다름
if [ "$TYPE" = "shop" ]; then
  API_URL="https://openapi.naver.com/v1/search/shop.json"
elif [ "$TYPE" = "local" ]; then
  API_URL="https://openapi.naver.com/v1/search/local.json"
else
  API_URL="https://openapi.naver.com/v1/search/${TYPE}.json"
fi

# --- URL 인코딩 ---
ENCODED_QUERY=$(printf '%s' "$QUERY" | jq -sRr @uri)

# --- API 호출 ---
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "X-Naver-Client-Id: ${NAVER_CLIENT_ID}" \
  -H "X-Naver-Client-Secret: ${NAVER_CLIENT_SECRET}" \
  "${API_URL}?query=${ENCODED_QUERY}&display=${DISPLAY}&sort=sim")

# 응답 분리 (body + status code)
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -1)

# --- HTTP 상태 확인 ---
if [ "$HTTP_CODE" != "200" ]; then
  if [ "$HTTP_CODE" = "429" ]; then
    echo "[오류] API 호출 한도 초과. 일일 25,000건 제한."
  elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "[오류] 인증 실패. NAVER_CLIENT_ID/SECRET을 확인하세요. (HTTP $HTTP_CODE)"
  else
    echo "[오류] 네이버 API 호출 실패 (HTTP $HTTP_CODE)"
    ERROR_MSG=$(echo "$HTTP_BODY" | jq -r '.errorMessage // empty' 2>/dev/null)
    [ -n "$ERROR_MSG" ] && echo "  상세: $ERROR_MSG"
  fi
  exit 1
fi

# --- 결과 파싱 ---
TOTAL=$(echo "$HTTP_BODY" | jq -r '.total // 0')
ITEM_COUNT=$(echo "$HTTP_BODY" | jq -r '.items | length')

if [ "$ITEM_COUNT" = "0" ] || [ "$TOTAL" = "0" ]; then
  echo "[정보] '${QUERY}'에 대한 검색 결과가 없습니다."
  exit 0
fi

echo "네이버 ${TYPE} 검색: \"${QUERY}\" (총 ${TOTAL}건 중 ${ITEM_COUNT}건 표시)"
echo "---"

# --- 결과 출력 (HTML 태그 제거) ---
echo "$HTTP_BODY" | jq -r '.items | to_entries[] | "\(.key + 1)) \(.value.title)\n    \(.value.link)\n    \(.value.description)\n"' \
  | sed 's/<[^>]*>//g'
