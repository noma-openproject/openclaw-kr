'use strict';

const assert = require('node:assert');
const { ChannelReliability } = require('../dedup');

let passed = 0;
let failed = 0;

/** @param {string} name @param {() => void | Promise<void>} fn */
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (/** @type {any} */ e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); }
}

async function run() {
  console.log('dedup 테스트\n');

  // ── isDuplicate ──

  await test('첫 요청은 중복이 아님', () => {
    const kit = new ChannelReliability({ dedupWindowMs: 2000 });
    assert.strictEqual(kit.isDuplicate('user1', '안녕'), false);
    kit.destroy();
  });

  await test('같은 요청 즉시 반복 → 중복', () => {
    const kit = new ChannelReliability({ dedupWindowMs: 2000 });
    kit.isDuplicate('user1', '안녕');
    assert.strictEqual(kit.isDuplicate('user1', '안녕'), true);
    kit.destroy();
  });

  await test('다른 사용자 같은 메시지 → 중복 아님', () => {
    const kit = new ChannelReliability({ dedupWindowMs: 2000 });
    kit.isDuplicate('user1', '안녕');
    assert.strictEqual(kit.isDuplicate('user2', '안녕'), false);
    kit.destroy();
  });

  await test('같은 사용자 다른 메시지 → 중복 아님', () => {
    const kit = new ChannelReliability({ dedupWindowMs: 2000 });
    kit.isDuplicate('user1', '안녕');
    assert.strictEqual(kit.isDuplicate('user1', '반갑'), false);
    kit.destroy();
  });

  // ── 채널 상태 ──

  await test('초기 상태 = connected', () => {
    const kit = new ChannelReliability();
    assert.strictEqual(kit.getChannelStatus('ch1'), 'connected');
    kit.destroy();
  });

  await test('recordRequest → processing', () => {
    const kit = new ChannelReliability();
    kit.recordRequest('ch1', 'req1');
    assert.strictEqual(kit.getChannelStatus('ch1'), 'processing');
    kit.destroy();
  });

  await test('recordResponse(ok) → connected', () => {
    const kit = new ChannelReliability();
    kit.recordRequest('ch1', 'req1');
    kit.recordResponse('ch1', 'req1', true);
    assert.strictEqual(kit.getChannelStatus('ch1'), 'connected');
    kit.destroy();
  });

  await test('recordResponse(fail) → error', () => {
    const kit = new ChannelReliability();
    kit.recordRequest('ch1', 'req1');
    kit.recordResponse('ch1', 'req1', false);
    assert.strictEqual(kit.getChannelStatus('ch1'), 'error');
    kit.destroy();
  });

  await test('setChannelStatus 수동 설정', () => {
    const kit = new ChannelReliability();
    kit.setChannelStatus('ch1', 'delayed');
    assert.strictEqual(kit.getChannelStatus('ch1'), 'delayed');
    kit.destroy();
  });

  // ── cleanup ──

  await test('cleanup으로 만료 항목 제거', async () => {
    const kit = new ChannelReliability({ dedupWindowMs: 1 });
    kit.isDuplicate('user1', '테스트');
    // dedupWindowMs*10 = 10ms 대기 → 만료
    await new Promise((r) => setTimeout(r, 20));
    kit.cleanup();
    assert.strictEqual(kit.isDuplicate('user1', '테스트'), false);
    kit.destroy();
  });

  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
