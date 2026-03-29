#!/usr/bin/env node
// plugins/kakao-entry/test/echo.test.js
// 카카오 스킬 서버 통합 테스트 — mock gateway로 round-trip 검증
const http = require('http');
const assert = require('assert');

// --- 테스트 설정 ---
const MOCK_GW_PORT = 18790;
const SKILL_PORT = 3099;
const MOCK_CB_PORT = 18791; // 콜백 수신용 mock 서버
const BOT_ID = '69c53d4c45b6624e9317cef8';

let mockGateway;
let skillServer;
let mockCallbackServer;
let mockHandler = null; // 테스트별 gateway 응답 제어
let callbackReceived = null; // 콜백으로 받은 데이터
let callbackResolve = null; // 콜백 대기용 Promise resolve

// --- Helper: HTTP POST ---
function post(port, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: 8000,
      },
      (res) => {
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('request timeout'));
    });
    req.write(data);
    req.end();
  });
}

// --- Helper: 카카오 요청 생성 ---
function kakaoRequest(utterance, userId = 'testuser123', botId = BOT_ID, callbackUrl = undefined) {
  const req = {
    userRequest: {
      utterance,
      user: { id: userId, type: 'botUserKey', properties: {} },
      lang: 'ko',
      timezone: 'Asia/Seoul',
    },
    bot: { id: botId, name: 'openclaw-kr' },
    intent: { id: 'test', name: 'test' },
    action: { name: 'test', params: {}, id: 'test', detailParams: {} },
  };
  if (callbackUrl) {
    req.userRequest.callbackUrl = callbackUrl;
  }
  return req;
}

// --- Mock Gateway ---
function startMockGateway() {
  return new Promise((resolve) => {
    mockGateway = http.createServer((req, res) => {
      // GET 헬스체크 응답
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        if (mockHandler) {
          mockHandler(req, res, body);
        } else {
          // 기본: 에코 응답
          const parsed = JSON.parse(body);
          const userMsg = parsed.messages?.find((m) => m.role === 'user')?.content || 'echo';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              choices: [{ message: { role: 'assistant', content: `에코: ${userMsg}` } }],
            }),
          );
        }
      });
    });
    mockGateway.listen(MOCK_GW_PORT, () => resolve());
  });
}

// --- Mock Callback Server (콜백 수신용) ---
function startMockCallbackServer() {
  return new Promise((resolve) => {
    mockCallbackServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          callbackReceived = JSON.parse(body);
        } catch {
          callbackReceived = body;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        if (callbackResolve) {
          callbackResolve(callbackReceived);
          callbackResolve = null;
        }
      });
    });
    mockCallbackServer.listen(MOCK_CB_PORT, () => resolve());
  });
}

function waitForCallback(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('callback timeout')), timeoutMs);
    callbackResolve = (data) => {
      clearTimeout(timer);
      resolve(data);
    };
  });
}

// --- 스킬 서버 시작 (환경변수로 포트/gateway 오버라이드) ---
function startSkillServer() {
  return new Promise((resolve, reject) => {
    // 환경변수 설정 후 require
    process.env.KAKAO_SKILL_PORT = String(SKILL_PORT);
    process.env.OPENCLAW_GATEWAY_PORT = String(MOCK_GW_PORT);
    process.env.OPENCLAW_GATEWAY_HOST = '127.0.0.1';

    // require 캐시 제거 후 로드
    const modPath = require.resolve('../index');
    delete require.cache[modPath];
    const relayPath = require.resolve('../relay');
    delete require.cache[relayPath];

    const mod = require('../index');
    // server.listen이 이미 호출됨 — listening 이벤트 대기
    if (mod.server.listening) {
      resolve(mod);
    } else {
      mod.server.on('listening', () => resolve(mod));
      mod.server.on('error', reject);
    }
  });
}

// --- 테스트 러너 ---
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('\n=== 카카오 스킬 서버 테스트 ===\n');

  for (const t of tests) {
    mockHandler = null; // 매 테스트 리셋
    try {
      await t.fn();
      console.log(`  ✅ ${t.name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ${t.name}`);
      console.log(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n결과: ${passed} passed, ${failed} failed (총 ${tests.length})\n`);
  return failed;
}

// ============================================================
// 테스트 케이스
// ============================================================

test('1. 정상 요청 → 에코 응답 + 카카오 포맷', async () => {
  const res = await post(SKILL_PORT, kakaoRequest('안녕하세요'));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.version, '2.0');
  assert.ok(res.body.template?.outputs?.[0]?.simpleText?.text);
  assert.ok(res.body.template.outputs[0].simpleText.text.includes('에코: 안녕하세요'));
});

test('2. 빈 메시지 → 에러 응답', async () => {
  const res = await post(SKILL_PORT, kakaoRequest(''));
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.template.outputs[0].simpleText.text.includes('비어있습니다'));
});

test('3. 잘못된 bot.id → 403', async () => {
  const res = await post(SKILL_PORT, kakaoRequest('안녕', 'user1', 'wrong-bot-id'));
  assert.strictEqual(res.status, 403);
});

test('4. Safe Mode 차단 — 파일 삭제', async () => {
  const res = await post(SKILL_PORT, kakaoRequest('파일 삭제해줘'));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.template.outputs[0].simpleText.text.includes('Safe Mode'));
});

test('5. Safe Mode 차단 — 브라우저 열기', async () => {
  const res = await post(SKILL_PORT, kakaoRequest('브라우저 열어줘'));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.template.outputs[0].simpleText.text.includes('Safe Mode'));
});

test('6. Safe Mode 통과 — 검색 요청', async () => {
  const res = await post(SKILL_PORT, kakaoRequest('오늘 날씨 알려줘'));
  assert.strictEqual(res.status, 200);
  // 차단 메시지가 아닌 에코 응답이어야 함
  assert.ok(!res.body.template.outputs[0].simpleText.text.includes('Safe Mode'));
});

test('7. Gateway 타임아웃 → "처리 중" 메시지', async () => {
  mockHandler = (_req, res) => {
    // 6초 딜레이 (4초 타임아웃보다 김)
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'late' } }] }));
    }, 6000);
  };
  const res = await post(SKILL_PORT, kakaoRequest('느린 작업'));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.template.outputs[0].simpleText.text.includes('처리 중'));
});

test('8. 긴 응답 → 1000자 잘림', async () => {
  mockHandler = (_req, res) => {
    const longText = '가'.repeat(1500);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: longText } }] }));
  };
  const res = await post(SKILL_PORT, kakaoRequest('긴 응답'));
  assert.strictEqual(res.status, 200);
  const text = res.body.template.outputs[0].simpleText.text;
  assert.ok(text.length <= 1000, `응답 길이 ${text.length} > 1000`);
  assert.ok(text.includes('일부만 표시'));
});

test('9. Rate limit 초과', async () => {
  const userId = 'ratelimit-test-user';
  // 10번은 정상
  for (let i = 0; i < 10; i++) {
    await post(SKILL_PORT, kakaoRequest(`msg${i}`, userId));
  }
  // 11번째는 차단
  const res = await post(SKILL_PORT, kakaoRequest('11번째', userId));
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.template.outputs[0].simpleText.text.includes('너무 빠릅니다'));
});

test('10. GET /health → gateway 상태', async () => {
  const res = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${SKILL_PORT}/health`, (r) => {
      let buf = '';
      r.on('data', (c) => (buf += c));
      r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(buf) }));
    }).on('error', reject);
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
});

// --- 콜백 모드 테스트 ---

test('11. 콜백 모드 — 즉시 useCallback 응답 반환', async () => {
  callbackReceived = null;
  const cbUrl = `http://127.0.0.1:${MOCK_CB_PORT}/callback`;
  const cbPromise = waitForCallback(8000);

  const res = await post(SKILL_PORT, kakaoRequest('안녕하세요', 'cb-user-1', BOT_ID, cbUrl));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.version, '2.0');
  assert.strictEqual(res.body.useCallback, true);
  assert.ok(!res.body.template, 'useCallback 응답에 template이 없어야 함');

  // 백그라운드 콜백 소비 (test 12에 간섭 방지)
  await cbPromise;
});

test('12. 콜백 모드 — 백그라운드에서 callbackUrl로 AI 응답 전달', async () => {
  callbackReceived = null;
  const cbUrl = `http://127.0.0.1:${MOCK_CB_PORT}/callback`;
  const cbPromise = waitForCallback(8000);

  // 스킬 서버에 콜백 요청
  const res = await post(SKILL_PORT, kakaoRequest('콜백 테스트', 'cb-user-2', BOT_ID, cbUrl));
  assert.strictEqual(res.body.useCallback, true);

  // 콜백 수신 대기
  const cbData = await cbPromise;
  assert.strictEqual(cbData.version, '2.0');
  assert.ok(cbData.template?.outputs?.[0]?.simpleText?.text);
  assert.ok(cbData.template.outputs[0].simpleText.text.includes('에코: 콜백 테스트'));
});

test('13. 콜백 모드 — gateway 오류 시에도 callbackUrl로 에러 메시지 전달', async () => {
  callbackReceived = null;
  mockHandler = (_req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal error' }));
  };

  const cbUrl = `http://127.0.0.1:${MOCK_CB_PORT}/callback`;
  const cbPromise = waitForCallback(8000);

  const res = await post(SKILL_PORT, kakaoRequest('에러 테스트', 'cb-user-3', BOT_ID, cbUrl));
  assert.strictEqual(res.body.useCallback, true);

  const cbData = await cbPromise;
  assert.strictEqual(cbData.version, '2.0');
  assert.ok(cbData.template?.outputs?.[0]?.simpleText?.text);
  // 에러 메시지가 전달되어야 함
  const text = cbData.template.outputs[0].simpleText.text;
  assert.ok(text.includes('문제') || text.includes('오류') || text.includes('다시'));
});

// --- relay.js 유닛 테스트 (토큰 검증 + retry 로직) ---

test('14. validateToken — 반환 형식 검증', () => {
  const relay = require('../relay');
  const result = relay.validateToken();
  // 테스트 환경에 ~/.openclaw/openclaw.json이 있으면 valid: true, 없으면 valid: false
  assert.strictEqual(typeof result.valid, 'boolean');
  if (result.valid) {
    assert.strictEqual(result.reason, undefined);
  } else {
    assert.strictEqual(result.reason, 'no-token');
  }
});

test('15. readGatewayToken — 빈 토큰 시 empty string 반환', () => {
  const relay = require('../relay');
  const token = relay.readGatewayToken();
  assert.strictEqual(typeof token, 'string');
});

test('16. healthCheckWithRetry — gateway online 시 즉시 반환', async () => {
  // mockGateway가 이미 실행 중이므로 바로 성공해야 함
  const relay = require('../relay');
  const result = await relay.healthCheckWithRetry(3, 100);
  assert.strictEqual(result.online, true);
  assert.strictEqual(result.retries, 0);
});

test('17. isRetryableError — ECONNREFUSED는 재시도 가능', () => {
  const relay = require('../relay');
  assert.strictEqual(relay.isRetryableError({ code: 'ECONNREFUSED' }), true);
  assert.strictEqual(relay.isRetryableError({ code: 'ETIMEDOUT' }), true);
  assert.strictEqual(relay.isRetryableError({ code: 'ECONNRESET' }), true);
  assert.strictEqual(relay.isRetryableError({ code: 'EPIPE' }), true);
  assert.strictEqual(relay.isRetryableError({ code: 'ENOTFOUND' }), false);
  assert.strictEqual(relay.isRetryableError({ code: undefined }), false);
});

test('18. 콜백 모드 — gateway 500 시 retry 후 에러 응답 전달', async () => {
  callbackReceived = null;
  let requestCount = 0;
  mockHandler = (_req, res) => {
    requestCount++;
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal error' }));
  };

  const cbUrl = `http://127.0.0.1:${MOCK_CB_PORT}/callback`;
  const cbPromise = waitForCallback(30000);

  const res = await post(SKILL_PORT, kakaoRequest('retry 테스트', 'cb-user-retry', BOT_ID, cbUrl));
  assert.strictEqual(res.body.useCallback, true);

  const cbData = await cbPromise;
  assert.strictEqual(cbData.version, '2.0');
  // 500 에러에 대해 retry가 시도되어야 함 (최소 2회 이상 요청)
  assert.ok(requestCount >= 2, `retry expected ≥2 requests, got ${requestCount}`);
});

// ============================================================
// 실행
// ============================================================
(async () => {
  try {
    await startMockGateway();
    console.log(`Mock gateway started on :${MOCK_GW_PORT}`);

    await startMockCallbackServer();
    console.log(`Mock callback server started on :${MOCK_CB_PORT}`);

    await startSkillServer();
    console.log(`Skill server started on :${SKILL_PORT}`);

    const failures = await runTests();

    // 정리
    skillServer?.close?.();
    mockGateway?.close?.();
    mockCallbackServer?.close?.();
    process.exit(failures > 0 ? 1 : 0);
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
})();
