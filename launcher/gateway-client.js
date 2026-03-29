// launcher/gateway-client.js
// OpenClaw gateway HTTP 통신 공통 모듈
// relay.js와 team-orchestrator.js가 공유하는 gateway 통신 로직
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- 설정 ---
const GATEWAY_HOST = process.env.OPENCLAW_GATEWAY_HOST || '127.0.0.1';
const GATEWAY_PORT = parseInt(process.env.OPENCLAW_GATEWAY_PORT || '18789', 10);
const MAX_RESPONSE_LENGTH = 1000;

/**
 * ~/.openclaw/openclaw.json에서 gateway 토큰 읽기
 * @returns {string}
 */
function readGatewayToken() {
  const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config?.gateway?.auth?.token || '';
  } catch {
    return '';
  }
}

/**
 * gateway 토큰 유효성 검사 — 빠른 실패
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateToken() {
  const token = readGatewayToken();
  if (!token) {
    console.warn('[gateway-client] gateway token missing — request will be rejected');
    return { valid: false, reason: 'no-token' };
  }
  return { valid: true };
}

/**
 * 응답 텍스트를 maxLen 이하로 자름
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncateResponse(text, maxLen = MAX_RESPONSE_LENGTH) {
  if (!text || text.length <= maxLen) return text || '';
  const suffix = '\n\n... (결과가 길어 일부만 표시합니다)';
  return text.slice(0, maxLen - suffix.length) + suffix;
}

/**
 * gateway 헬스체크 — GET http://gateway/
 * @returns {Promise<{online: boolean, status?: number}>}
 */
function checkGatewayHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: GATEWAY_HOST, port: GATEWAY_PORT, path: '/', timeout: 3000 },
      (res) => {
        res.resume(); // drain
        const code = res.statusCode || 0;
        resolve({ online: code < 500, status: code });
      },
    );
    req.on('error', () => resolve({ online: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ online: false });
    });
  });
}

/**
 * 재시도 가능한 에러인지 확인
 * @param {Error & { code?: string }} err
 * @returns {boolean}
 */
function isRetryableError(err) {
  return ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE'].includes(err.code || '');
}

/**
 * @typedef {Object} ChatCompletionsOptions
 * @property {Array<{role: string, content: string}>} messages
 * @property {string} [model]
 * @property {string} [user]
 * @property {number} [timeoutMs]
 * @property {string} [logPrefix]
 */

/**
 * @typedef {Object} ChatCompletionsResult
 * @property {boolean} ok
 * @property {string} text
 * @property {boolean} retryable
 * @property {Object|null} [usage]
 */

/**
 * /v1/chat/completions 단일 호출
 * @param {ChatCompletionsOptions} options
 * @returns {Promise<ChatCompletionsResult>}
 */
function callChatCompletions({
  messages,
  model = 'openclaw:main',
  user,
  timeoutMs = 30000,
  logPrefix = 'gateway-client',
}) {
  return new Promise((resolve) => {
    const token = readGatewayToken();
    /** @type {Record<string, unknown>} */
    const bodyObj = { model, messages };
    if (user) bodyObj.user = user;
    const body = JSON.stringify(bodyObj);

    const options = {
      hostname: GATEWAY_HOST,
      port: GATEWAY_PORT,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-openclaw-agent-id': 'main',
      },
      timeout: timeoutMs,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const statusCode = res.statusCode || 0;
        if (statusCode !== 200) {
          console.error(`[${logPrefix}] gateway HTTP ${statusCode}: ${data.slice(0, 200)}`);
          resolve({
            ok: false,
            text: '에이전트 응답에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
            retryable: statusCode >= 500,
          });
          return;
        }
        try {
          const json = JSON.parse(data);
          const content = json?.choices?.[0]?.message?.content || '';
          const usage = json?.usage || null;
          resolve({ ok: true, text: content, retryable: false, usage });
        } catch (/** @type {any} */ e) {
          console.error(`[${logPrefix}] JSON parse error: ${e.message}`);
          resolve({
            ok: false,
            text: '응답을 처리하는 중 오류가 발생했습니다.',
            retryable: false,
          });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ok: false,
        text: '응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        retryable: false,
      });
    });

    req.on('error', (/** @type {Error & { code?: string }} */ err) => {
      const retryable = isRetryableError(err);
      if (err.code === 'ECONNREFUSED') {
        resolve({
          ok: false,
          text: '현재 에이전트에 연결할 수 없습니다. 데스크톱 앱이 실행 중인지 확인해주세요.',
          retryable,
        });
      } else {
        console.error(`[${logPrefix}] request error: ${err.message}`);
        resolve({
          ok: false,
          text: '연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          retryable,
        });
      }
    });

    req.write(body);
    req.end();
  });
}

/**
 * 지수 백오프로 gateway 헬스체크 재시도
 * @param {number} maxRetries
 * @param {number} backoffMs
 * @returns {Promise<{online: boolean, retries: number}>}
 */
async function healthCheckWithRetry(maxRetries = 3, backoffMs = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await checkGatewayHealth();
    if (result.online) {
      return { online: true, retries: attempt };
    }
    if (attempt < maxRetries) {
      const delay = backoffMs * Math.pow(2, attempt);
      console.log(`[gateway-client] gateway offline, retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error(`[gateway-client] gateway offline after ${maxRetries} retries`);
  return { online: false, retries: maxRetries };
}

module.exports = {
  readGatewayToken,
  validateToken,
  truncateResponse,
  checkGatewayHealth,
  healthCheckWithRetry,
  isRetryableError,
  callChatCompletions,
  GATEWAY_HOST,
  GATEWAY_PORT,
  MAX_RESPONSE_LENGTH,
};
