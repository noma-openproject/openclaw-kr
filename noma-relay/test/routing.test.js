'use strict';

const assert = require('node:assert');

// Force file storage backend for testing
process.env.NOMA_RELAY_STORAGE = 'file';
process.env.NODE_ENV = 'test';

const routing = require('../lib/routing');

let passed = 0;
let failed = 0;

/** @param {string} name @param {() => Promise<void>} fn */
async function test(name, fn) {
  try {
    routing._resetFileStore();
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (/** @type {any} */ e) {
    failed++;
    console.error(`  ✗ ${name}\n    ${e.message}`);
  }
}

async function run() {
  console.log('noma-relay routing 테스트\n');

  await test('setPending + getPending 정상 동작', async () => {
    await routing.setPending('123456', 'https://example.ngrok.dev', 300_000);
    const result = await routing.getPending('123456');
    assert.ok(result);
    assert.strictEqual(result.endpoint, 'https://example.ngrok.dev');
    assert.ok(result.createdAt > 0);
  });

  await test('getPending — 없는 코드 → null', async () => {
    const result = await routing.getPending('999999');
    assert.strictEqual(result, null);
  });

  await test('pending TTL 만료 후 무효화', async () => {
    // TTL 1ms (즉시 만료)
    await routing.setPending('111111', 'https://expire.ngrok.dev', 1);
    // 약간 대기
    await new Promise((r) => setTimeout(r, 50));
    const result = await routing.getPending('111111');
    assert.strictEqual(result, null);
  });

  await test('deletePending', async () => {
    await routing.setPending('222222', 'https://del.ngrok.dev', 300_000);
    await routing.deletePending('222222');
    const result = await routing.getPending('222222');
    assert.strictEqual(result, null);
  });

  await test('bindUser + getEndpoint', async () => {
    await routing.bindUser('user_abc', 'https://abc.ngrok.dev');
    const endpoint = await routing.getEndpoint('user_abc');
    assert.strictEqual(endpoint, 'https://abc.ngrok.dev');
  });

  await test('getEndpoint — 없는 userId → null', async () => {
    const endpoint = await routing.getEndpoint('nonexistent');
    assert.strictEqual(endpoint, null);
  });

  await test('unbindUser', async () => {
    await routing.bindUser('user_del', 'https://del.ngrok.dev');
    await routing.unbindUser('user_del');
    const endpoint = await routing.getEndpoint('user_del');
    assert.strictEqual(endpoint, null);
  });

  await test('updateHeartbeat — endpoint 갱신', async () => {
    await routing.bindUser('user_hb', 'https://old.ngrok.dev');
    await routing.updateHeartbeat('user_hb', 'https://new.ngrok.dev');
    const endpoint = await routing.getEndpoint('user_hb');
    assert.strictEqual(endpoint, 'https://new.ngrok.dev');
    const hb = await routing.getHeartbeat('user_hb');
    assert.ok(hb);
    assert.ok(hb.lastSeen > 0);
  });

  await test('bindUser 덮어쓰기', async () => {
    await routing.bindUser('user_ow', 'https://first.ngrok.dev');
    await routing.bindUser('user_ow', 'https://second.ngrok.dev');
    const endpoint = await routing.getEndpoint('user_ow');
    assert.strictEqual(endpoint, 'https://second.ngrok.dev');
  });

  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
