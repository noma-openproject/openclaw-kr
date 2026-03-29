---
name: srt-query
description: Search SRT train schedules and seat availability. Query-only — no booking, payment, or cancellation. Use when the user asks for SRT timetables or available seats.
license: MIT
metadata:
  category: travel
  locale: ko-KR
  phase: v1
---

# SRT 열차 조회

## What this skill does

SRT(수서고속철도) 시간표와 잔여석을 조회한다. 조회 전용 — 예매/결제/취소 불가.

## When to use

- "수서에서 부산 가는 SRT 찾아줘"
- "내일 오전 SRT 빈자리 있어?"
- "동탄에서 동대구 SRT 시간표"

## When not to use

- SRT 예매/결제/취소 → k-skill의 srt-booking (Python SRTrain) 사용
- KTX/Korail 열차
- 결제까지 자동화해야 하는 경우

## Prerequisites

- Node.js 22+
- 환경변수 불필요 (비공식 웹 엔드포인트 직접 호출)

## Inputs

- 출발역, 도착역
- 선택: 날짜 (YYYYMMDD, 기본 오늘), 시간 (HH, 기본 현재)

## Supported stations

수서, 동탄, 평택지제, 천안아산, 오송, 대전, 김천구미, 동대구, 신경주, 울산, 부산, 공주, 익산, 정읍, 광주송정, 나주, 목포

## Workflow

### 1. Validate stations

역명이 지원 목록에 없으면 에러. "부산역" → "부산" 자동 정규화.

### 2. Query

```bash
node scripts/srt-query.js 수서 부산
node scripts/srt-query.js 수서 부산 20260401 14
```

### 3. Summarize

- 열차번호, 출발/도착 시각, 소요시간
- 일반실/특실 잔여석 상태

## Done when

- 후보 열차가 시간순으로 정리되어 있다
- 잔여석 상태가 확인되어 있다

## Failure modes

- 비공식 웹 엔드포인트 → SRT 측 변경 시 파싱 실패
- 과도한 요청 시 IP 차단 가능
- HTML 구조 변경 시 업데이트 필요

## Notes

- k-skill의 srt-booking은 Python SRTrain 기반으로 예매까지 지원 — 우리는 Node.js 조회 전용
- 예매 기능은 Phase 2-2에서 SRTrain 통합 검토
- Rate limit: 1분 10건 (보수적)
