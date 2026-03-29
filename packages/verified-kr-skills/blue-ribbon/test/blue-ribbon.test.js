'use strict';

const assert = require('node:assert');
const {
  buildNearbySearchParams,
  findZoneMatches,
  parseZoneCatalogHtml,
  normalizeNearbyItem,
} = require('../lib/index');

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

async function run() {
  console.log('blue-ribbon 테스트\n');

  // ── buildNearbySearchParams ──

  await test('좌표 기반 파라미터 생성', () => {
    const params = buildNearbySearchParams({
      latitude: 37.5,
      longitude: 127.0,
      distanceMeters: 1000,
    });
    assert.strictEqual(params.isAround, 'true');
    assert.strictEqual(params.ribbon, 'true');
    assert.strictEqual(params.distance, '1000');
  });

  await test('zone 기반 파라미터 생성', () => {
    const params = buildNearbySearchParams({
      zone: { zone1: '서울', zone2: '강남구', latitude: 37.5, longitude: 127.0 },
      distanceMeters: 500,
    });
    assert.strictEqual(params.zone1, '서울');
    assert.strictEqual(params.zone2, '강남구');
  });

  await test('좌표도 zone도 없으면 에러', () => {
    assert.throws(() => buildNearbySearchParams({}));
  });

  await test('distanceMeters 음수 → 에러', () => {
    assert.throws(() =>
      buildNearbySearchParams({ latitude: 37.5, longitude: 127.0, distanceMeters: -1 })
    );
  });

  // ── normalizeNearbyItem ──

  await test('normalizeNearbyItem: 기본 필드 추출', () => {
    const item = normalizeNearbyItem(
      { name: '맛집', ribbonType: 'RIBBON_TWO', category: '한식', address: '서울', lat: 37.5, lng: 127.0 },
      { latitude: 37.5, longitude: 127.0 }
    );
    assert.strictEqual(item.name, '맛집');
    assert.ok(item.ribbonCount >= 0);
  });

  // ── parseZoneCatalogHtml ──

  await test('parseZoneCatalogHtml: 빈 HTML → 에러', () => {
    assert.throws(() => parseZoneCatalogHtml(''));
  });

  // ── findZoneMatches ──

  await test('findZoneMatches: 빈 zones → 빈 결과', () => {
    const matches = findZoneMatches('강남', []);
    assert.ok(Array.isArray(matches));
    assert.strictEqual(matches.length, 0);
  });

  // ── 실제 API (네트워크 필요) ──

  try {
    const { searchNearbyByLocationQuery } = require('../lib/index');

    await test('searchNearbyByLocationQuery: 좌표 검색', async () => {
      const result = await searchNearbyByLocationQuery('37.573713, 126.978338', {
        limit: 3,
        distanceMeters: 2000,
      });
      assert.ok(result.items);
      assert.ok(Array.isArray(result.items));
    });
  } catch {
    skip('searchNearbyByLocationQuery: 좌표 검색', '네트워크 불가');
  }

  console.log(`\n결과: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exit(1);
}

run();
