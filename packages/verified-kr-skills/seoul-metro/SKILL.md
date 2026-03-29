---
name: seoul-metro
description: Look up Seoul real-time subway arrival information with the official Seoul Open Data API. Use when the user asks when a train arrives or which trains are approaching a station.
license: MIT
metadata:
  category: transit
  locale: ko-KR
  phase: v1
---

# 서울 지하철 도착정보

## What this skill does

서울 열린데이터 광장의 실시간 지하철 도착정보 Open API로 역 기준 도착 예정 열차 정보를 요약한다.

## When to use

- "강남역 지금 몇 분 뒤 도착해?"
- "서울역 1호선 도착 정보 보여줘"
- "잠실역 곧 들어오는 열차 정리해줘"

## When not to use

- 버스, 택시, KTX/SRT 조회
- 지방 지하철 (부산/대구/대전/광주)
- 노선도, 길찾기

## Prerequisites

- Node.js 22+
- `SEOUL_DATA_API_KEY` 환경변수 (서울 열린데이터 광장에서 발급)

## Required secrets

- `SEOUL_DATA_API_KEY`

## Inputs

- 역명 (예: 강남, 홍대입구)
- 선택: 표시 개수 (1~10, 기본 5)

## Workflow

### 1. Stop when API key is missing

`SEOUL_DATA_API_KEY`가 없으면 안내하고 멈춘다. 비공식 경로로 우회하지 않는다.

### 2. Query the official endpoint

```bash
SEOUL_DATA_API_KEY=xxx node scripts/seoul-metro.js 강남 5
```

API: `http://swopenAPI.seoul.go.kr/api/subway/{key}/json/realtimeStationArrival/0/{count}/{station}`

"강남역" → "강남" 자동 정규화.

### 3. Summarize the response

- 호선, 방면, 도착 메시지, 현재 위치
- 조회 시점 명시 (실시간 데이터는 몇 초 단위로 변동)

## Done when

- 요청 역의 도착 예정 열차가 정리되어 있다
- 조회 시점이 명시되어 있다

## Failure modes

- API key 미설정
- quota 초과 (일일 1,000건)
- 역명 표기 불일치
- API 엔드포인트 HTTP only (보안 유의)

## Notes

- k-skill의 seoul-subway-arrival 스킬을 참조하여 구성 (MIT)
- Rate limit: 950/일 (공식 1,000에서 버퍼)
- API 버전 변경 시 endpoint path 확인 필요
