# seoul-metro

서울 지하철 실시간 도착정보를 조회하는 OpenClaw 스킬.

## 설치

```bash
export SEOUL_DATA_API_KEY="your_api_key"
```

인증키는 [서울 열린데이터 광장](https://data.seoul.go.kr)에서 무료 발급.

## 사용법

```bash
node scripts/seoul-metro.js <역명> [표시개수]
```

## API

```javascript
const { getArrivalInfo } = require('./lib/api');
const { formatArrivals } = require('./lib/formatter');

const result = await getArrivalInfo('강남', 5);
if (result.ok) {
  console.log(formatArrivals(result.arrivals, result.station));
}
```

## 제한사항

- 서울 지하철만 지원
- 일일 1,000건 API 제한
- HTTP only (보안 유의)
