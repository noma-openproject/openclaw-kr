'use strict';
// noma-relay/api/kakao.js
// 카카오 webhook 수신 → /pair 처리 또는 로컬 Noma로 forward

const http = require('http');
const https = require('https');
const routing = require('../lib/routing');

// --- 브루트포스 방어 (인메모리, userId당 3회 실패 → 60초 대기) ---
const PAIR_MAX_ATTEMPTS = 3;
const PAIR_LOCKOUT_MS = 60_000;
/** @type {Map<string, {count: number, lockedUntil: number}>} */
const pairAttempts = new Map();

// --- 카카오 응답 포맷 ---
function kakaoResponse(text) {
  return {
    version: '2.0',
    template: { outputs: [{ simpleText: { text } }] },
  };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let body;
  try {
    body = await parseBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(kakaoResponse('요청을 처리할 수 없습니다.')));
    return;
  }

  const userId = body?.userRequest?.user?.id;
  const utterance = (body?.userRequest?.utterance || '').trim();
  const hasCallback = !!body?.userRequest?.callbackUrl;
  console.log(`[relay] user=${(userId||'?').slice(0,8)} msg="${(utterance||'').slice(0,20)}" callbackUrl=${hasCallback}`);

  if (!userId || !utterance) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(kakaoResponse('요청 형식이 올바르지 않습니다.')));
    return;
  }

  // --- /pair XXXXXX ---
  const pairMatch = utterance.match(/^\/pair\s+(\d{6})$/);
  if (pairMatch) {
    const result = await handlePair(userId, pairMatch[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(kakaoResponse(result)));
    return;
  }

  // --- /unpair ---
  if (utterance === '/unpair') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(kakaoResponse('페어링 해제는 데스크톱 앱에서만 가능합니다.')));
    return;
  }

  // --- /status ---
  if (utterance === '/status') {
    const result = await handleStatus(userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(kakaoResponse(result)));
    return;
  }

  // --- 일반 메시지: forward ---
  const endpoint = await routing.getEndpoint(userId);
  if (!endpoint) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(kakaoResponse(
      '이 노마 인스턴스에 연결되지 않은 계정입니다.\n' +
      '데스크톱 앱에서 페어링 코드를 생성한 후 \'/pair 코드6자리\'를 입력해주세요.',
    )));
    return;
  }

  // callbackUrl을 그대로 로컬에 전달 — 로컬 index.js가 콜백을 직접 처리
  // (Vercel serverless는 res.end() 후 백그라운드 작업을 보장하지 않으므로)
  try {
    const result = await forwardToLocal(endpoint, body, userId, hasCallback);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(kakaoResponse(
      '현재 데스크톱이 오프라인 상태입니다.\n컴퓨터가 켜져 있고 Noma가 실행 중인지 확인해주세요.',
    )));
  }
};

// Also export helpers for testing
module.exports.handlePair = handlePair;
module.exports.handleStatus = handleStatus;
module.exports.forwardToLocal = forwardToLocal;
module.exports.kakaoResponse = kakaoResponse;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function handlePair(userId, code) {
  // 브루트포스 체크
  const attempt = pairAttempts.get(userId);
  if (attempt && attempt.lockedUntil > Date.now()) {
    const waitSec = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    return `너무 많은 시도입니다. ${waitSec}초 후에 다시 시도해주세요.`;
  }

  const pending = await routing.getPending(code);
  if (!pending) {
    // 실패 카운트 증가
    const current = pairAttempts.get(userId) || { count: 0, lockedUntil: 0 };
    current.count++;
    if (current.count >= PAIR_MAX_ATTEMPTS) {
      current.lockedUntil = Date.now() + PAIR_LOCKOUT_MS;
      current.count = 0;
    }
    pairAttempts.set(userId, current);
    return '유효하지 않거나 만료된 페어링 코드입니다.\n데스크톱 앱에서 새 코드를 생성해주세요.';
  }

  // 바인딩 성공
  await routing.bindUser(userId, pending.endpoint);
  await routing.deletePending(code);
  pairAttempts.delete(userId);

  return '페어링 완료! 🎉\n이제 이 채널에서 보내는 메시지가 당신의 컴퓨터로 전달됩니다.';
}

async function handleStatus(userId) {
  const endpoint = await routing.getEndpoint(userId);
  if (!endpoint) {
    return '페어링되지 않은 상태입니다.\n데스크톱 앱에서 페어링 코드를 생성해주세요.';
  }
  const heartbeat = await routing.getHeartbeat(userId);
  const online = heartbeat ? '온라인' : '오프라인';
  return `페어링 상태: 연결됨\n데스크톱: ${online}`;
}

/**
 * 로컬 Noma 스킬 서버로 요청 forward
 * @param {string} endpoint
 * @param {object} body
 * @param {string} userId
 * @param {boolean} [isCallback=false] - callback 컨텍스트 (55초 타임아웃 + 확장 요청)
 * @returns {Promise<object>}
 */
function forwardToLocal(endpoint, body, userId, isCallback) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const payload = JSON.stringify(body);
    const mod = url.protocol === 'https:' ? https : http;

    /** @type {Record<string, string>} */
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(payload)),
      'X-Noma-UserId': userId,
    };
    if (isCallback) headers['X-Noma-Callback'] = '1';

    const forwardReq = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/',
        method: 'POST',
        headers,
        timeout: isCallback ? 55_000 : 5_000,
      },
      (forwardRes) => {
        let data = '';
        forwardRes.on('data', (chunk) => { data += chunk; });
        forwardRes.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid response from local Noma'));
          }
        });
      },
    );

    forwardReq.on('error', reject);
    forwardReq.on('timeout', () => {
      forwardReq.destroy();
      reject(new Error('Forward timeout'));
    });
    forwardReq.write(payload);
    forwardReq.end();
  });
}

function sendCallback(callbackUrl, responseBody) {
  try {
    const url = new URL(callbackUrl);
    const payload = JSON.stringify(responseBody);
    const mod = url.protocol === 'https:' ? https : http;

    const cbReq = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 10_000,
      },
      () => { /* response consumed */ },
    );

    cbReq.on('error', () => { /* silent */ });
    cbReq.write(payload);
    cbReq.end();
  } catch { /* silent */ }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    // Vercel already parses body in serverless mode
    if (req.body) { resolve(req.body); return; }
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
