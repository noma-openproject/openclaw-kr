'use strict';

const assert = require('node:assert');
const { trackDelivery, validateInvoice } = require('../lib/api');
const { formatTracking } = require('../lib/formatter');

let passed = 0;
let failed = 0;

/** @param {string} name @param {() => void | Promise<void>} fn */
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (/** @type {any} */ e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); }
}

async function run() {
  console.log('delivery-tracking 테스트\n');

  // ── validateInvoice ──

  await test('CJ: 10자리 유효', () => {
    assert.strictEqual(validateInvoice('cj', '1234567890'), null);
  });

  await test('CJ: 12자리 유효', () => {
    assert.strictEqual(validateInvoice('cj', '123456789012'), null);
  });

  await test('CJ: 9자리 무효', () => {
    assert.ok(validateInvoice('cj', '123456789') !== null);
  });

  await test('우체국: 13자리 유효', () => {
    assert.strictEqual(validateInvoice('epost', '1234567890123'), null);
  });

  await test('우체국: 12자리 무효', () => {
    assert.ok(validateInvoice('epost', '123456789012') !== null);
  });

  // ── trackDelivery 입력 검증 ──

  await test('입력 없으면 에러', async () => {
    const res = await trackDelivery('', '');
    assert.strictEqual(res.ok, false);
  });

  await test('지원하지 않는 택배사', async () => {
    const res = await trackDelivery('fedex', '123');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('지원하지 않는'));
  });

  await test('CJ 잘못된 자릿수', async () => {
    const res = await trackDelivery('cj', '123');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('10~12자리'));
  });

  // ── formatTracking ──

  await test('formatTracking: 정상 데이터', () => {
    const out = formatTracking({
      carrier: 'cj', invoice: '1234567890',
      status: '배달완료', timestamp: '2026-03-28 12:00',
      location: '강남', eventCount: 3,
      recentEvents: [
        { timestamp: '2026-03-28 10:00', location: '허브', status: '상품이동중' },
        { timestamp: '2026-03-28 12:00', location: '강남', status: '배달완료' },
      ],
    });
    assert.ok(out.includes('CJ대한통운'));
    assert.ok(out.includes('배달완료'));
    assert.ok(out.includes('강남'));
  });

  await test('formatTracking: 우체국', () => {
    const out = formatTracking({
      carrier: 'epost', invoice: '1234567890123',
      status: '배달완료', eventCount: 0, recentEvents: [],
    });
    assert.ok(out.includes('우체국'));
  });

  await test('formatTracking: undefined → [정보]', () => {
    const out = formatTracking(undefined);
    assert.ok(out.includes('[정보]'));
  });

  // ── 실제 조회 (공개 테스트 송장) ──

  await test('CJ 실제 조회 (공개 테스트 송장)', async () => {
    const res = await trackDelivery('cj', '1234567890');
    assert.ok(typeof res.ok === 'boolean');
    if (res.ok && res.result) {
      assert.strictEqual(res.result.carrier, 'cj');
    }
  });

  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
