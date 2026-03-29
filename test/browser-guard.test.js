'use strict';

/**
 * Browser Guard: isAllowedUrl 유닛 테스트
 * Electron 없이 함수 로직만 테스트.
 * main.js에서 직접 require할 수 없으므로 로직을 복제.
 */

const assert = require('node:assert');

// main.js의 isAllowedUrl 로직 복제 (Electron 의존 없이 테스트)
const DASHBOARD_PORT = 18789;
const BLOCKED_PROTOCOLS = ['chrome:', 'chrome-extension:', 'data:', 'javascript:'];
const ALLOWED_ORIGINS = new Set([
  `http://127.0.0.1:${DASHBOARD_PORT}`,
  `http://localhost:${DASHBOARD_PORT}`,
]);

/**
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedUrl(url) {
  if (url.startsWith('file://') && url.includes('/launcher/')) return true;
  for (const proto of BLOCKED_PROTOCOLS) {
    if (url.startsWith(proto)) return false;
  }
  try {
    const parsed = new URL(url);
    const origin = `${parsed.protocol}//${parsed.host}`;
    return ALLOWED_ORIGINS.has(origin);
  } catch {
    return false;
  }
}

let passed = 0;
let failed = 0;

/** @param {string} name @param {() => void} fn */
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (/** @type {any} */ e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); }
}

console.log('browser-guard 테스트\n');

test('localhost dashboard 허용', () => {
  assert.strictEqual(isAllowedUrl('http://localhost:18789/dashboard'), true);
});

test('127.0.0.1 dashboard 허용', () => {
  assert.strictEqual(isAllowedUrl('http://127.0.0.1:18789/?token=abc'), true);
});

test('로컬 fallback.html 허용', () => {
  assert.strictEqual(isAllowedUrl('file:///Users/test/launcher/fallback.html'), true);
});

test('chrome:// 차단', () => {
  assert.strictEqual(isAllowedUrl('chrome://settings'), false);
});

test('javascript: 차단', () => {
  assert.strictEqual(isAllowedUrl('javascript:alert(1)'), false);
});

test('data: 차단', () => {
  assert.strictEqual(isAllowedUrl('data:text/html,<h1>hi</h1>'), false);
});

test('외부 URL 차단', () => {
  assert.strictEqual(isAllowedUrl('https://evil.com/steal'), false);
});

test('다른 포트 차단', () => {
  assert.strictEqual(isAllowedUrl('http://localhost:3000/admin'), false);
});

test('빈 URL 차단', () => {
  assert.strictEqual(isAllowedUrl(''), false);
});

test('잘못된 URL 차단', () => {
  assert.strictEqual(isAllowedUrl('not-a-url'), false);
});

console.log(`\n결과: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
