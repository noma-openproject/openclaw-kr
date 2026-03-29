# srt-query

SRT(수서고속철도) 시간표/잔여석 조회 OpenClaw 스킬. 조회 전용.

## 사용법

```bash
node scripts/srt-query.js <출발역> <도착역> [날짜] [시간]
```

## API

```javascript
const { searchTrains } = require('./lib/api');
const { formatTrains } = require('./lib/formatter');

const result = await searchTrains('수서', '부산', '20260401', '14');
if (result.ok) {
  console.log(formatTrains(result.trains, result.dep, result.arr, result.date));
}
```

## 제한사항

- 비공식 웹 엔드포인트 사용 (SRT 측 변경 시 동작 불가)
- 조회 전용 (예매/결제/취소 불가)
- Rate limit: 1분 10건
