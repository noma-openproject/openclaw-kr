'use strict';

const assert = require('node:assert');
const { formatGames } = require('../lib/formatter');

let passed = 0;
let failed = 0;
let skipped = 0;

/** @param {string} name @param {() => void | Promise<void>} fn */
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (/** @type {any} */ e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); }
}

/** @param {string} name @param {string} reason */
function skip(name, reason) { skipped++; console.log(`  ⊘ ${name} (${reason})`); }

let kboAvailable = false;
try { require.resolve('kbo-game'); kboAvailable = true; } catch { /* */ }

async function run() {
  console.log('kbo-scores 테스트\n');

  // ── formatter ──

  await test('formatGames: 빈 배열 → [정보]', () => {
    const out = formatGames([], '2026-03-28');
    assert.ok(out.includes('[정보]'));
  });

  await test('formatGames: 경기 포맷팅', () => {
    const games = [{
      homeTeam: '삼성', awayTeam: 'LG',
      homeScore: 5, awayScore: 3,
      status: '종료', stadium: '대구',
    }];
    const out = formatGames(games, '2026-03-28');
    assert.ok(out.includes('LG 3 : 5 삼성'));
    assert.ok(out.includes('종료'));
    assert.ok(out.includes('대구'));
  });

  await test('formatGames: 여러 경기 번호 매기기', () => {
    const games = [
      { homeTeam: 'A', awayTeam: 'B', homeScore: 1, awayScore: 2, status: '', stadium: '' },
      { homeTeam: 'C', awayTeam: 'D', homeScore: 3, awayScore: 4, status: '', stadium: '' },
    ];
    const out = formatGames(games, '2026-03-28');
    assert.ok(out.includes('[1]'));
    assert.ok(out.includes('[2]'));
  });

  // ── API ──

  if (kboAvailable) {
    const { getGames } = require('../lib/api');

    await test('getGames: 날짜 없으면 에러', async () => {
      const res = await getGames('');
      assert.strictEqual(res.ok, false);
      assert.ok(res.error.includes('날짜'));
    });

    await test('getGames: 비시즌 날짜 → 빈 결과 또는 정상', async () => {
      const res = await getGames('2026-01-01');
      assert.strictEqual(res.ok, true);
      // 비시즌이면 빈 배열
      assert.ok(Array.isArray(res.games));
    });

    await test('getGames: 팀 필터', async () => {
      const res = await getGames('2026-01-01', '삼성');
      assert.strictEqual(res.ok, true);
      // 비시즌이므로 결과 없을 수 있음
      assert.ok(Array.isArray(res.games));
    });
  } else {
    skip('getGames: 날짜 없으면 에러', 'kbo-game 미설치');
    skip('getGames: 비시즌 날짜', 'kbo-game 미설치');
    skip('getGames: 팀 필터', 'kbo-game 미설치');
  }

  console.log(`\n결과: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exit(1);
}

run();
