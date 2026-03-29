'use strict';

const assert = require('node:assert');
const { formatLottoResult, formatCheckResult } = require('../lib/formatter');

let passed = 0;
let failed = 0;
let skipped = 0;

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

/** @param {string} name @param {string} reason */
function skip(name, reason) {
  skipped++;
  console.log(`  ⊘ ${name} (${reason})`);
}

let klottoAvailable = false;
try {
  require.resolve('k-lotto');
  klottoAvailable = true;
} catch { /* not installed */ }

async function run() {
  console.log('lotto-results 테스트\n');

  // ── formatter unit tests ──

  await test('formatLottoResult: 기본 출력', () => {
    const out = formatLottoResult({
      round: 1216,
      date: '2026-03-28',
      numbers: [3, 10, 14, 15, 23, 24],
      bonus: 42,
      firstPrize: '25억원',
      firstWinners: 3,
    });
    assert.ok(out.includes('1216'));
    assert.ok(out.includes('3, 10, 14, 15, 23, 24'));
    assert.ok(out.includes('보너스 42'));
    assert.ok(out.includes('25억원'));
    assert.ok(out.includes('3명'));
  });

  await test('formatLottoResult: 당첨금 없어도 동작', () => {
    const out = formatLottoResult({
      round: 1216,
      date: '2026-03-28',
      numbers: [1, 2, 3, 4, 5, 6],
      bonus: 7,
    });
    assert.ok(out.includes('1216'));
    assert.ok(!out.includes('당첨금'));
  });

  await test('formatCheckResult: 낙첨', () => {
    const out = formatCheckResult({
      round: 1216,
      matched: [],
      bonusMatched: false,
      matchCount: 0,
      rank: '낙첨',
    });
    assert.ok(out.includes('낙첨'));
  });

  await test('formatCheckResult: 일치 있음', () => {
    const out = formatCheckResult({
      round: 1216,
      matched: [3, 10, 14],
      bonusMatched: false,
      matchCount: 3,
      rank: '5등',
    });
    assert.ok(out.includes('3, 10, 14'));
    assert.ok(out.includes('3개'));
    assert.ok(out.includes('5등'));
  });

  // ── API integration tests (k-lotto 설치 시만) ──

  if (klottoAvailable) {
    const { getLatestRound, getResult } = require('../lib/api');

    await test('getLatestRound: 회차 번호 반환', async () => {
      const res = await getLatestRound();
      assert.strictEqual(res.ok, true);
      assert.ok(typeof res.round === 'number');
      assert.ok(res.round > 1000);
    });

    await test('getResult: 특정 회차 결과 반환', async () => {
      const res = await getResult(1100);
      assert.strictEqual(res.ok, true);
      assert.ok(res.result.numbers.length === 6);
      assert.ok(res.result.bonus > 0);
    });
  } else {
    skip('getLatestRound: 회차 번호 반환', 'k-lotto 미설치');
    skip('getResult: 특정 회차 결과 반환', 'k-lotto 미설치');
  }

  console.log(`\n결과: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exit(1);
}

run();
