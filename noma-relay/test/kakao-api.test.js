'use strict';

const assert = require('node:assert');
const http = require('node:http');

// Force file storage for testing
process.env.NOMA_RELAY_STORAGE = 'file';
process.env.NODE_ENV = 'test';

const routing = require('../lib/routing');
const kakaoHandler = require('../api/kakao');

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

// --- Mock HTTP server wrapping kakaoHandler ---
let relayServer;
const RELAY_PORT = 18795;

function startRelay() {
  return new Promise((resolve) => {
    relayServer = http.createServer((req, res) => {
      // Simulate Vercel: parse body and attach to req
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        try { req.body = JSON.parse(data); } catch { req.body = null; }
        kakaoHandler(req, res);
      });
    });
    relayServer.listen(RELAY_PORT, resolve);
  });
}

function stopRelay() {
  return new Promise((resolve) => {
    if (relayServer) relayServer.close(resolve);
    else resolve();
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: RELAY_PORT,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: 5000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function makeKakaoBody(userId, utterance) {
  return {
    bot: { id: 'test-bot' },
    userRequest: {
      utterance,
      user: { id: userId },
    },
  };
}

async function run() {
  console.log('noma-relay kakao API 테스트\n');

  await startRelay();

  try {
    await test('/pair 성공 → 바인딩 생성', async () => {
      // 먼저 pending 등록 (register.js가 하는 일)
      await routing.setPending('654321', 'https://test.ngrok.dev', 300_000);

      const res = await post('/', makeKakaoBody('user_pair', '/pair 654321'));
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.template.outputs[0].simpleText.text.includes('페어링 완료'));

      // 바인딩 확인
      const endpoint = await routing.getEndpoint('user_pair');
      assert.strictEqual(endpoint, 'https://test.ngrok.dev');

      // pending 삭제 확인
      const pending = await routing.getPending('654321');
      assert.strictEqual(pending, null);
    });

    await test('/pair 틀린 코드 → 바인딩 안 함', async () => {
      await routing.setPending('111111', 'https://test.ngrok.dev', 300_000);

      const res = await post('/', makeKakaoBody('user_wrong', '/pair 999999'));
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.template.outputs[0].simpleText.text.includes('유효하지 않'));

      // 바인딩 없음
      const endpoint = await routing.getEndpoint('user_wrong');
      assert.strictEqual(endpoint, null);
    });

    await test('바인딩 안 된 userId → 거부 메시지', async () => {
      const res = await post('/', makeKakaoBody('user_nobound', '오늘 날씨'));
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.template.outputs[0].simpleText.text.includes('연결되지 않은'));
    });

    await test('/unpair → 데스크톱 안내', async () => {
      const res = await post('/', makeKakaoBody('user_unpair', '/unpair'));
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.template.outputs[0].simpleText.text.includes('데스크톱 앱'));
    });

    await test('/status — 바인딩 없을 때', async () => {
      const res = await post('/', makeKakaoBody('user_status', '/status'));
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.template.outputs[0].simpleText.text.includes('페어링되지 않'));
    });

    await test('/status — 바인딩 있을 때', async () => {
      await routing.bindUser('user_bound', 'https://bound.ngrok.dev');
      const res = await post('/', makeKakaoBody('user_bound', '/status'));
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.template.outputs[0].simpleText.text.includes('연결됨'));
    });

  } finally {
    await stopRelay();
  }

  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
