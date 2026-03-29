'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ChannelRegistry, BINDINGS_PATH } = require('../launcher/channel-registry');

let passed = 0;
let failed = 0;

/** @param {string} name @param {() => void} fn */
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (/** @type {any} */ e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); }
}

// 테스트 전 기존 바인딩 백업
const backupPath = BINDINGS_PATH + '.backup';
const hadFile = fs.existsSync(BINDINGS_PATH);
if (hadFile) fs.copyFileSync(BINDINGS_PATH, backupPath);

console.log('channel-registry 테스트\n');

test('bind + lookup', () => {
  const reg = new ChannelRegistry();
  reg.clear();
  reg.bind('kakao', 'user1', 'sess_abc');
  assert.strictEqual(reg.lookup('kakao', 'user1'), 'sess_abc');
});

test('lookup 없는 키 → null', () => {
  const reg = new ChannelRegistry();
  reg.clear();
  assert.strictEqual(reg.lookup('kakao', 'nonexistent'), null);
});

test('unbind', () => {
  const reg = new ChannelRegistry();
  reg.clear();
  reg.bind('kakao', 'user1', 'sess_abc');
  assert.strictEqual(reg.unbind('kakao', 'user1'), true);
  assert.strictEqual(reg.lookup('kakao', 'user1'), null);
});

test('unbind 없는 키 → false', () => {
  const reg = new ChannelRegistry();
  reg.clear();
  assert.strictEqual(reg.unbind('kakao', 'nonexistent'), false);
});

test('listBindings', () => {
  const reg = new ChannelRegistry();
  reg.clear();
  reg.bind('kakao', 'user1', 'sess_1');
  reg.bind('telegram', 'user2', 'sess_2');
  const list = reg.listBindings();
  assert.strictEqual(list.length, 2);
  assert.ok(list.some((b) => b.platform === 'kakao'));
  assert.ok(list.some((b) => b.platform === 'telegram'));
});

test('bind overwrites existing', () => {
  const reg = new ChannelRegistry();
  reg.clear();
  reg.bind('kakao', 'user1', 'sess_old');
  reg.bind('kakao', 'user1', 'sess_new');
  assert.strictEqual(reg.lookup('kakao', 'user1'), 'sess_new');
});

test('threadId 저장', () => {
  const reg = new ChannelRegistry();
  reg.clear();
  reg.bind('kakao', 'user1', 'sess_1', 'thread_xyz');
  const list = reg.listBindings();
  assert.strictEqual(list[0].threadId, 'thread_xyz');
});

test('파일 persistence', () => {
  const reg1 = new ChannelRegistry();
  reg1.clear();
  reg1.bind('kakao', 'persist_user', 'sess_persist');

  // 새 인스턴스로 로드
  const reg2 = new ChannelRegistry();
  assert.strictEqual(reg2.lookup('kakao', 'persist_user'), 'sess_persist');
  reg2.clear();
});

// 테스트 후 복원
if (hadFile) {
  fs.copyFileSync(backupPath, BINDINGS_PATH);
  fs.unlinkSync(backupPath);
} else {
  try { fs.unlinkSync(BINDINGS_PATH); } catch { /* */ }
}

console.log(`\n결과: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
