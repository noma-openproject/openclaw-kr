'use strict';

const assert = require('node:assert');
const {
  formatError,
  formatInfo,
  formatWarn,
  stripHtml,
  createRateLimiter,
  fetchJson,
  formatResults,
  optionalEnv,
} = require('./kr-skill-utils');

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
  console.log('kr-skill-utils 테스트\n');

  // ── 메시지 포맷터 ──

  await test('formatError: [오류] 접두사', () => {
    assert.strictEqual(formatError('테스트'), '[오류] 테스트');
  });

  await test('formatInfo: [정보] 접두사', () => {
    assert.strictEqual(formatInfo('안내'), '[정보] 안내');
  });

  await test('formatWarn: [주의] 접두사', () => {
    assert.strictEqual(formatWarn('경고'), '[주의] 경고');
  });

  // ── stripHtml ──

  await test('stripHtml: HTML 태그 제거', () => {
    assert.strictEqual(stripHtml('<b>굵은</b> 글씨'), '굵은 글씨');
  });

  await test('stripHtml: HTML 엔티티 디코드', () => {
    assert.strictEqual(stripHtml('A &amp; B &lt;C&gt;'), 'A & B <C>');
  });

  await test('stripHtml: 빈 문자열', () => {
    assert.strictEqual(stripHtml(''), '');
  });

  await test('stripHtml: null/undefined', () => {
    assert.strictEqual(stripHtml(null), '');
    assert.strictEqual(stripHtml(undefined), '');
  });

  await test('stripHtml: 연속 공백 정리', () => {
    assert.strictEqual(stripHtml('A  &nbsp;  B'), 'A B');
  });

  // ── optionalEnv ──

  await test('optionalEnv: 기본값 반환', () => {
    const val = optionalEnv('__NONEXISTENT_VAR__', 'default');
    assert.strictEqual(val, 'default');
  });

  // ── createRateLimiter ──

  await test('rateLimiter: 한도 내 요청 허용', () => {
    const rl = createRateLimiter({ maxRequests: 3, windowMs: 60000 });
    assert.strictEqual(rl.tryAcquire(), true);
    assert.strictEqual(rl.tryAcquire(), true);
    assert.strictEqual(rl.tryAcquire(), true);
    assert.strictEqual(rl.remaining(), 0);
  });

  await test('rateLimiter: 한도 초과 시 거부', () => {
    const rl = createRateLimiter({ maxRequests: 2, windowMs: 60000 });
    rl.tryAcquire();
    rl.tryAcquire();
    assert.strictEqual(rl.tryAcquire(), false);
  });

  // ── fetchJson ──

  await test('fetchJson: 잘못된 URL은 네트워크 오류', async () => {
    const res = await fetchJson('http://127.0.0.1:1/__nonexistent', {
      timeoutMs: 1000,
    });
    assert.strictEqual(res.ok, false);
    assert.ok(res.error);
  });

  // ── formatResults ──

  await test('formatResults: 빈 배열은 [정보] 메시지', () => {
    const out = formatResults([], (item) => item);
    assert.ok(out.includes('[정보]'));
  });

  await test('formatResults: 항목 포맷팅', () => {
    const items = ['A', 'B'];
    const out = formatResults(items, (item, i) => `[${i + 1}] ${item}`);
    assert.ok(out.includes('[1] A'));
    assert.ok(out.includes('[2] B'));
  });

  // ── 결과 ──
  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
