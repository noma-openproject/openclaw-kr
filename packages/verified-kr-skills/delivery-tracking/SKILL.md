---
name: delivery-tracking
description: Track Korean delivery packages (CJ Logistics, Korea Post) using official endpoints. Use when the user asks to check a parcel delivery status.
license: MIT
metadata:
  category: utility
  locale: ko-KR
  phase: v2
---

# 택배 배송조회

## What this skill does

CJ대한통운, 우체국 공식 엔드포인트로 택배 배송 상태를 조회한다.

## When to use

- "택배 어디까지 왔어?"
- "송장번호 1234567890 배송 확인해줘"
- "우체국 택배 추적"

## When not to use

- 해외 택배 (FedEx, DHL, UPS)
- 배송 예약, 반품 접수
- 지원되지 않는 택배사

## Prerequisites

- `curl`, `python3`
- 별도 패키지 설치 불필요

## Supported carriers

| 택배사 | 식별자 | 송장 형식 |
|---|---|---|
| CJ대한통운 | `cj` | 숫자 10~12자리 |
| 우체국 | `epost` | 숫자 13자리 |

## Inputs

- 택배사: `cj` 또는 `epost`
- 송장번호

## Workflow

### 1. Validate invoice format

택배사별 자릿수 확인.

### 2. Query official endpoint

- CJ: `_csrf` 토큰 획득 → `tracking-detail` JSON
- 우체국: `RetrieveDomRigiTraceList.comm` HTML → 파싱

### 3. Normalize output

공통 스키마: carrier, invoice, status, timestamp, location, event_count, recent_events

### 4. Privacy

- 수령인 이름, 전화번호는 출력하지 않음
- 담당자 정보 제거

## Done when

- 현재 배송 상태가 확인되어 있다
- 최근 이벤트 (최대 3개)가 정리되어 있다

## Failure modes

- CJ: `_csrf` 없이 직접 호출 불가
- 우체국: `curl --http1.1 --tls-max 1.2` 필요
- HTML 구조 변경 시 파서 업데이트 필요

## Notes

- k-skill의 delivery-tracking 기능 문서를 참조하여 구성 (MIT)
- 비공식 통합 배송조회 서비스로 자동 우회하지 않는다
- 새 택배사 추가 시 carrier adapter 패턴 (validator, entrypoint, transport, parser, status map, retry policy) 준수
- 구현은 Phase 2-2 예정

## Attribution

이 SKILL.md는 [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) (MIT)의 delivery-tracking 기능 문서를 참조하여 작성하였습니다.
