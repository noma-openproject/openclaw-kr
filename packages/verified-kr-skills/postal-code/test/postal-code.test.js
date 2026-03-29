'use strict';

const assert = require('node:assert');
const { searchAddress } = require('../lib/api');
const { formatAddresses } = require('../lib/formatter');

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

async function run() {
  console.log('postal-code 테스트\n');

  // ── Unit: searchAddress 입력 검증 ──

  await test('API 키 없으면 에러', async () => {
    const saved = process.env.JUSO_API_KEY;
    delete process.env.JUSO_API_KEY;
    try {
      const res = await searchAddress('테스트', 5, undefined);
      assert.strictEqual(res.ok, false);
      assert.ok(res.error.includes('JUSO_API_KEY'));
    } finally {
      if (saved) process.env.JUSO_API_KEY = saved;
    }
  });

  await test('빈 검색어 에러', async () => {
    const res = await searchAddress('', 5, 'test-key');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('검색어를 입력'));
  });

  await test('공백만 있는 검색어 에러', async () => {
    const res = await searchAddress('   ', 5, 'test-key');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('검색어를 입력'));
  });

  await test('API 키 파라미터 전달 시 함수 실행', async () => {
    // 실제 API 호출 (네트워크 에러 또는 인증 에러 가능)
    const res = await searchAddress('서울시청', 5, 'test-key');
    assert.ok(typeof res.ok === 'boolean');
  });

  // ── Unit: formatAddresses ──

  await test('빈 결과 → [정보] 메시지', () => {
    const out = formatAddresses([], '서울시청');
    assert.ok(out.includes('[정보]'));
    assert.ok(out.includes('서울시청'));
  });

  await test('결과 포맷팅 — 우편번호 + 도로명 + 지번', () => {
    const results = [
      {
        zipNo: '06621',
        roadAddr: '서울특별시 중구 세종대로 209',
        roadAddrPart1: '서울특별시 중구 세종대로 209',
        roadAddrPart2: '',
        jibunAddr: '서울특별시 중구 태평로1가 31',
        engAddr: '',
        bdNm: '서울특별시청',
        siNm: '서울특별시',
        sggNm: '중구',
        emdNm: '태평로1가',
        rn: '세종대로',
      },
    ];
    const out = formatAddresses(results, '서울시청');
    assert.ok(out.includes('[1] 06621'));
    assert.ok(out.includes('세종대로 209'));
    assert.ok(out.includes('지번:'));
  });

  await test('totalCount > results.length → 건수 표시', () => {
    const results = [
      {
        zipNo: '06621',
        roadAddr: '서울특별시 중구 세종대로 209',
        roadAddrPart1: '',
        roadAddrPart2: '',
        jibunAddr: '',
        engAddr: '',
        bdNm: '',
        siNm: '',
        sggNm: '',
        emdNm: '',
        rn: '',
      },
    ];
    const out = formatAddresses(results, '세종대로', 50);
    assert.ok(out.includes('총 50건'));
    assert.ok(out.includes('1건 표시'));
  });

  await test('totalCount <= results.length → 건수 미표시', () => {
    const results = [
      {
        zipNo: '06621',
        roadAddr: '서울특별시 중구 세종대로 209',
        roadAddrPart1: '',
        roadAddrPart2: '',
        jibunAddr: '',
        engAddr: '',
        bdNm: '',
        siNm: '',
        sggNm: '',
        emdNm: '',
        rn: '',
      },
    ];
    const out = formatAddresses(results, '세종대로', 1);
    assert.ok(!out.includes('총'));
  });

  await test('jibunAddr 없으면 지번 행 생략', () => {
    const results = [
      {
        zipNo: '06621',
        roadAddr: '서울특별시 중구 세종대로 209',
        roadAddrPart1: '',
        roadAddrPart2: '',
        jibunAddr: '',
        engAddr: '',
        bdNm: '',
        siNm: '',
        sggNm: '',
        emdNm: '',
        rn: '',
      },
    ];
    const out = formatAddresses(results, '세종대로');
    assert.ok(!out.includes('지번:'));
  });

  await test('여러 결과 번호 매기기', () => {
    const results = [
      {
        zipNo: '06621', roadAddr: '주소1', roadAddrPart1: '', roadAddrPart2: '',
        jibunAddr: '', engAddr: '', bdNm: '', siNm: '', sggNm: '', emdNm: '', rn: '',
      },
      {
        zipNo: '04524', roadAddr: '주소2', roadAddrPart1: '', roadAddrPart2: '',
        jibunAddr: '', engAddr: '', bdNm: '', siNm: '', sggNm: '', emdNm: '', rn: '',
      },
    ];
    const out = formatAddresses(results, '테스트');
    assert.ok(out.includes('[1] 06621'));
    assert.ok(out.includes('[2] 04524'));
  });

  // ── 결과 ──
  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
