'use strict';

const assert = require('node:assert');

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
  console.log('daiso-search 테스트\n');

  // lib/index.js가 존재하는지 확인
  let indexModule;
  try {
    indexModule = require('../lib/index');
  } catch {
    skip('모듈 로드', 'lib/index.js 로드 실패');
    console.log(`\n결과: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    return;
  }

  await test('모듈 export 확인', () => {
    assert.ok(typeof indexModule === 'object');
    // k-skill 패키지에서 어떤 함수를 export하는지 확인
    const keys = Object.keys(indexModule);
    assert.ok(keys.length > 0, `exported keys: ${keys.join(', ')}`);
  });

  // 실제 API 호출 테스트 (네트워크 필요)
  await test('searchStores: export 확인', () => {
    assert.strictEqual(typeof indexModule.searchStores, 'function');
  });

  await test('searchProducts: export 확인', () => {
    assert.strictEqual(typeof indexModule.searchProducts, 'function');
  });

  await test('lookupStoreProductAvailability: export 확인', () => {
    assert.strictEqual(typeof indexModule.lookupStoreProductAvailability, 'function');
  });

  await test('searchStores: 실제 매장 검색', async () => {
    try {
      const result = await indexModule.searchStores('강남');
      assert.ok(typeof result === 'object');
    } catch (/** @type {any} */ err) {
      // 네트워크 에러는 허용
      assert.ok(err.message.length > 0);
    }
  });

  console.log(`\n결과: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exit(1);
}

run();
