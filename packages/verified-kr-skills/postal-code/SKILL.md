---
name: postal-code
description: Look up Korean postal codes and road-name addresses with the official juso.go.kr API. Use when the user knows an address but wants the postal code quickly.
license: MIT
metadata:
  category: utility
  locale: ko-KR
  phase: v1
---

# 우편번호 검색

## What this skill does

도로명주소 API(juso.go.kr)로 한국 주소와 우편번호를 검색한다.

## When to use

- "이 주소 우편번호 뭐야"
- "세종대로 209 우편번호 찾아줘"
- "판교역로 235 주소 코드만 알려줘"

## When not to use

- 해외 주소 검색
- 길찾기/네비게이션
- 부동산 시세, 택배 추적

## Prerequisites

- Node.js 22+
- `JUSO_API_KEY` 환경변수 (도로명주소 안내시스템에서 발급)

## Required secrets

- `JUSO_API_KEY`

## Inputs

- 주소 키워드 (도로명, 건물명, 지번)
- 선택: 결과 수 (1~20, 기본 5)

## Workflow

### 1. Stop when API key is missing

`JUSO_API_KEY`가 없으면 안내하고 멈춘다.

### 2. Query the official API

```bash
JUSO_API_KEY=xxx node scripts/postal-code.js "세종대로 209" 5
```

API: `https://business.juso.go.kr/addrlink/addrLinkApi.do`

### 3. Normalize for humans

- 우편번호, 도로명주소, 지번주소 정리
- 후보가 여러 개면 상위 5개만 표시

## Done when

- 적어도 한 개의 우편번호 후보가 정리되어 있다
- 다중 후보일 때 주소 차이가 보인다

## Failure modes

- API key 미설정
- 검색어가 너무 넓으면 결과 과다
- 행정구역 변경 시 결과 변동

## Notes

- k-skill의 zipcode-search는 우체국 ePost HTML 스크래핑 방식 — 우리는 juso.go.kr 공식 API 사용 (더 안정적)
- 상세주소(동/호수)는 미포함
