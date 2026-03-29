---
name: kbo-scores
description: Check KBO Korean baseball game schedules, scores, and results by date. Use when the user asks for baseball game results or schedules.
license: MIT
metadata:
  category: sports
  locale: ko-KR
  phase: v2
---

# KBO 경기 결과

## What this skill does

`kbo-game` npm 패키지로 날짜별 KBO 경기 일정, 결과, 스코어를 조회한다.

## When to use

- "오늘 야구 결과 어때?"
- "어제 KBO 스코어 보여줘"
- "삼성 경기 결과 알려줘"

## When not to use

- MLB, NPB 등 해외 야구
- 선수 상세 통계 (타율, 방어율)
- 경기 중계/실시간 스코어

## Prerequisites

- Node.js 22+
- `npm install -g kbo-game`
- `export NODE_PATH="$(npm root -g)"`

## Inputs

- 날짜: YYYY-MM-DD (기본: 오늘)
- 선택: 팀명 (필터링)

## Workflow

### 1. Install when missing

```bash
npm install -g kbo-game
export NODE_PATH="$(npm root -g)"
```

패키지가 없다면 다른 방법으로 우회하지 않는다.

### 2. Query

`getGame`은 `Date` 객체를 받는다. 문자열이 아님.

```javascript
const { getGame } = require("kbo-game");
const games = await getGame(new Date("2026-03-25T00:00:00+09:00"));
```

### 3. Summarize

- 홈팀 vs 원정팀, 스코어, 경기 상태
- 팀 필터 요청 시 해당 팀 경기만

## Done when

- 요청 날짜의 경기가 정리되어 있다
- 팀 필터 요청이면 해당 팀만 남아 있다

## Failure modes

- `kbo-game` 미설치
- 비시즌 날짜 → 빈 결과
- `getGame` API 변경 (README의 `getGameInfo`는 동작하지 않음)

## Notes

- k-skill의 kbo-results 스킬을 참조하여 구성 (MIT)
- `kbo-game@0.0.2` 기준 export는 `getGame` (README 예시 `getGameInfo` 아님)
- 구현은 Phase 2-2 예정

## Attribution

이 SKILL.md는 [NomaDamas/k-skill](https://github.com/NomaDamas/k-skill) (MIT)의 kbo-results 기능 문서를 참조하여 작성하였습니다.
