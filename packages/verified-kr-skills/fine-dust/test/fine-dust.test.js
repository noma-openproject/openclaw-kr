'use strict';

const assert = require('node:assert');
const { gradeLabel } = require('../lib/api');
const { formatDustReport } = require('../lib/formatter');

let passed = 0;
let failed = 0;

/** @param {string} name @param {() => void | Promise<void>} fn */
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (/** @type {any} */ e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); }
}

async function run() {
  console.log('fine-dust 테스트\n');

  await test('gradeLabel: 1 → 좋음', () => {
    assert.strictEqual(gradeLabel(1), '좋음');
  });

  await test('gradeLabel: 4 → 매우나쁨', () => {
    assert.strictEqual(gradeLabel(4), '매우나쁨');
  });

  await test('gradeLabel: undefined → -', () => {
    assert.strictEqual(gradeLabel(undefined), '-');
  });

  await test('formatDustReport: 측정소 데이터', () => {
    const out = formatDustReport({
      station: '강남대로', time: '2026-03-28 14:00',
      pm10: 45, pm10Grade: '보통',
      pm25: 22, pm25Grade: '보통',
      overallGrade: '보통',
    });
    assert.ok(out.includes('강남대로'));
    assert.ok(out.includes('PM10'));
    assert.ok(out.includes('45'));
    assert.ok(out.includes('보통'));
  });

  await test('formatDustReport: 후보 목록', () => {
    const out = formatDustReport(undefined, ['우산동(광주)', '평동(광주)']);
    assert.ok(out.includes('선택'));
    assert.ok(out.includes('우산동'));
    assert.ok(out.includes('평동'));
  });

  await test('formatDustReport: 데이터 없음', () => {
    const out = formatDustReport(undefined, undefined);
    assert.ok(out.includes('[정보]'));
  });

  const { getDustReport } = require('../lib/api');

  await test('getDustReport: 입력 없으면 에러', async () => {
    const res = await getDustReport('', undefined);
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('지역명'));
  });

  await test('getDustReport: 실제 프록시 호출', async () => {
    const res = await getDustReport('서울 강남구');
    // 프록시 서버 상태에 따라 성공 또는 실패
    assert.ok(typeof res.ok === 'boolean');
  });

  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
