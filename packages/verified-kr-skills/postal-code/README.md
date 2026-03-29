# postal-code

한국 도로명주소/우편번호 검색 OpenClaw 스킬.

## 설치

```bash
export JUSO_API_KEY="your_api_key"
```

승인키는 [도로명주소 안내시스템](https://www.juso.go.kr/addrlink/openApi/apiExprn.do)에서 무료 발급.

## 사용법

```bash
node scripts/postal-code.js <검색어> [개수]
```

## API

```javascript
const { searchAddress } = require('./lib/api');
const { formatAddresses } = require('./lib/formatter');

const result = await searchAddress('세종대로 209', 5);
if (result.ok) {
  console.log(formatAddresses(result.results, result.keyword, result.totalCount));
}
```

## 제한사항

- 승인 등급별 일일 호출 제한
- 상세주소(동/호수) 미포함
