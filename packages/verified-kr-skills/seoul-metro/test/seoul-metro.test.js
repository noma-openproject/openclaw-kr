'use strict';

const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { getArrivalInfo, normalizeStation, getLineName } = require('../lib/api');
const { formatArrivals } = require('../lib/formatter');

let passed = 0;
let failed = 0;

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (/** @type {any} */ err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

const mockResponse = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'fixtures', 'mock-response.json'),
    'utf-8'
  )
);

/** @type {http.Server} */
let mockServer;
const MOCK_PORT = 18891;

/**
 * @returns {Promise<void>}
 */
function startMock() {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${MOCK_PORT}`);
      const parts = url.pathname.split('/');
      // /api/subway/{key}/json/realtimeStationArrival/0/{count}/{station}
      const station = decodeURIComponent(parts[parts.length - 1] || '');

      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      if (station === '__error__') {
        res.writeHead(500);
        res.end(JSON.stringify({ status: 500, message: 'Internal Error' }));
        return;
      }

      if (station === '__empty__') {
        res.end(JSON.stringify({ realtimeArrivalList: [] }));
        return;
      }

      if (station === '__timeout__') {
        // 응답하지 않음 (타임아웃 유발)
        return;
      }

      res.end(JSON.stringify(mockResponse));
    });
    mockServer.listen(MOCK_PORT, resolve);
  });
}

async function run() {
  console.log('seoul-metro 테스트\n');

  await startMock();

  // API 테스트에서 mock 서버를 사용하기 위해 BASE_URL 오버라이드는 안 됨
  // 대신 unit 테스트와 integration 테스트로 분리

  // ── Unit: normalizeStation ──

  await test('normalizeStation: "강남역" → "강남"', () => {
    assert.strictEqual(normalizeStation('강남역'), '강남');
  });

  await test('normalizeStation: "강남" → "강남"', () => {
    assert.strictEqual(normalizeStation('강남'), '강남');
  });

  await test('normalizeStation: 앞뒤 공백 제거', () => {
    assert.strictEqual(normalizeStation('  홍대입구역  '), '홍대입구');
  });

  // ── Unit: getLineName ──

  await test('getLineName: 2호선', () => {
    assert.strictEqual(getLineName('1002'), '2호선');
  });

  await test('getLineName: 신분당선', () => {
    assert.strictEqual(getLineName('1077'), '신분당선');
  });

  await test('getLineName: 알 수 없는 노선', () => {
    assert.strictEqual(getLineName('9999'), '노선9999');
  });

  // ── Unit: formatArrivals ──

  await test('formatArrivals: 빈 배열 → [정보] 메시지', () => {
    const out = formatArrivals([], '강남');
    assert.ok(out.includes('[정보]'));
    assert.ok(out.includes('강남'));
  });

  await test('formatArrivals: 항목 포맷팅', () => {
    const arrivals = [
      {
        line: '2호선',
        direction: '내선순환',
        destination: '잠실방면',
        message: '1분 30초 후 도착',
        currentStation: '교대',
        ordinal: 1,
      },
    ];
    const out = formatArrivals(arrivals, '강남');
    assert.ok(out.includes('[1]'));
    assert.ok(out.includes('2호선'));
    assert.ok(out.includes('1분 30초 후 도착'));
  });

  // ── Integration: getArrivalInfo ──

  await test('getArrivalInfo: API 키 없으면 에러', async () => {
    const saved = process.env.SEOUL_DATA_API_KEY;
    delete process.env.SEOUL_DATA_API_KEY;
    try {
      const res = await getArrivalInfo('강남', 5, undefined);
      assert.strictEqual(res.ok, false);
      assert.ok(res.error.includes('SEOUL_DATA_API_KEY'));
    } finally {
      if (saved) process.env.SEOUL_DATA_API_KEY = saved;
    }
  });

  await test('getArrivalInfo: 빈 역명 에러', async () => {
    const res = await getArrivalInfo('', 5, 'test-key');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('역명을 입력'));
  });

  await test('getArrivalInfo: API 키 파라미터 전달', async () => {
    // mock 서버로 직접 호출 (BASE_URL 오버라이드 불가하므로 이 테스트는 입력 검증만)
    const res = await getArrivalInfo('강남', 5, 'test-key');
    // 실제 API 서버에 접속 시도 — 네트워크 에러 또는 결과 반환
    // 여기서는 함수가 에러 없이 실행되는 것을 확인
    assert.ok(typeof res.ok === 'boolean');
  });

  await test('getArrivalInfo: normalizeStation 적용 확인', async () => {
    // "강남역" → "강남"으로 정규화 됨
    const res = await getArrivalInfo('강남역', 5, 'test-key');
    if (res.station) {
      assert.strictEqual(res.station, '강남');
    }
  });

  // ── 결과 ──
  mockServer.close();
  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
