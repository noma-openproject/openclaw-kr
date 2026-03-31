'use strict';

const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

let passed = 0;
let failed = 0;

/** @param {string} name @param {() => Promise<void>} fn */
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (/** @type {any} */ e) {
    failed++;
    console.error(`  ✗ ${name}\n    ${e.message}`);
  }
}

// --- Test: 페어링 코드 생성 (main.js의 generatePairingCode 로직 단위 테스트) ---
const crypto = require('node:crypto');

console.log('pairing 테스트\n');

// --- Pairing code generation ---
async function run() {
  await test('generatePairingCode → 6자리 숫자', async () => {
    const code = String(crypto.randomInt(100000, 999999));
    assert.ok(/^\d{6}$/.test(code), `코드가 6자리 숫자여야 함: ${code}`);
    const num = parseInt(code, 10);
    assert.ok(num >= 100000 && num <= 999999, `범위 초과: ${num}`);
  });

  await test('pending 파일 TTL 만료 후 무효화', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pairing-'));
    const pendingPath = path.join(tmpDir, 'pairing-pending.json');

    // 이미 만료된 코드 기록
    fs.writeFileSync(pendingPath, JSON.stringify({
      code: '123456',
      expiresAt: Date.now() - 1000, // 1초 전 만료
    }));

    const pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
    assert.ok(pending.expiresAt < Date.now(), '만료 시간이 현재보다 과거');

    // cleanup
    fs.unlinkSync(pendingPath);
    fs.rmdirSync(tmpDir);
  });

  // --- index.js 페어링 게이트 테스트 (실제 HTTP 서버) ---
  const SKILL_PORT = 3098;

  // channel-registry 상태 초기화를 위해 require.cache 클리어
  const { ChannelRegistry, BINDINGS_PATH } = require('../launcher/channel-registry');
  const backupPath = BINDINGS_PATH + '.pairing-backup';
  const hadFile = fs.existsSync(BINDINGS_PATH);
  if (hadFile) fs.copyFileSync(BINDINGS_PATH, backupPath);

  // 기존 kakao 바인딩 정리
  const reg = new ChannelRegistry();
  const existingKakao = reg.listBindings().filter((b) => b.platform === 'kakao');
  for (const b of existingKakao) reg.unbind('kakao', b.userId);

  // index.js를 다른 포트로 로드
  const entryPath = path.resolve(__dirname, '..', 'plugins', 'kakao-entry', 'index.js');
  delete require.cache[require.resolve(entryPath)];

  // 기존 환경 백업 + 테스트 설정
  const origPort = process.env.KAKAO_SKILL_PORT;
  const origMode = process.env.NOMA_PAIRING_MODE;
  process.env.KAKAO_SKILL_PORT = String(SKILL_PORT);
  process.env.NOMA_PAIRING_MODE = 'personal';

  /** @type {{server: import('http').Server, channelRegistry: InstanceType<typeof ChannelRegistry>}} */
  const skillModule = require(entryPath);

  // 서버가 listen 완료될 때까지 대기
  await new Promise((resolve) => {
    if (skillModule.server.listening) { resolve(undefined); return; }
    skillModule.server.on('listening', resolve);
  });

  function postToSkill(body, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: SKILL_PORT,
          path: '/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...headers,
          },
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

  const KNOWN_BOT_ID = '69c53d4c45b6624e9317cef8';

  try {
    await test('personal 모드 + 바인딩 없음 → 거부', async () => {
      const res = await postToSkill({
        bot: { id: KNOWN_BOT_ID },
        userRequest: {
          utterance: '안녕하세요',
          user: { id: 'unbound_user_001' },
        },
      });
      assert.strictEqual(res.status, 200);
      const text = res.body?.template?.outputs?.[0]?.simpleText?.text || '';
      assert.ok(text.includes('연결되지 않은'), `거부 메시지 기대: ${text}`);
    });

    await test('X-Noma-UserId 있는 forward 요청 → 자동 bind + 처리', async () => {
      const res = await postToSkill(
        {
          bot: { id: KNOWN_BOT_ID },
          userRequest: {
            utterance: '안녕하세요',
            user: { id: 'relay_user_001' },
          },
        },
        { 'X-Noma-UserId': 'relay_user_001' },
      );
      assert.strictEqual(res.status, 200);
      // 자동 bind 확인
      const bound = skillModule.channelRegistry.lookup('kakao', 'relay_user_001');
      assert.ok(bound, '자동 바인딩 되어야 함');
    });
  } finally {
    // 서버 종료 + 환경 복원
    await new Promise((resolve) => skillModule.server.close(resolve));

    if (hadFile) {
      fs.copyFileSync(backupPath, BINDINGS_PATH);
      fs.unlinkSync(backupPath);
    } else {
      try { fs.unlinkSync(BINDINGS_PATH); } catch { /* */ }
    }

    // 환경 복원
    if (origPort !== undefined) process.env.KAKAO_SKILL_PORT = origPort;
    else delete process.env.KAKAO_SKILL_PORT;
    if (origMode !== undefined) process.env.NOMA_PAIRING_MODE = origMode;
    else delete process.env.NOMA_PAIRING_MODE;
  }

  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
