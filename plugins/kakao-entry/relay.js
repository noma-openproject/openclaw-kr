// plugins/kakao-entry/relay.js
// OpenClaw gateway 중계 모듈 — /v1/chat/completions HTTP API 사용
const http = require('http');

// 공통 gateway 통신 모듈
const {
  readGatewayToken,
  validateToken,
  truncateResponse,
  checkGatewayHealth,
  healthCheckWithRetry,
  isRetryableError,
  callChatCompletions,
  GATEWAY_HOST,
  GATEWAY_PORT,
} = require('../../launcher/gateway-client');

// --- relay 전용 설정 ---
const RELAY_TIMEOUT_MS = parseInt(process.env.RELAY_TIMEOUT_MS || '4500', 10);
const CALLBACK_TIMEOUT_MS = parseInt(process.env.CALLBACK_TIMEOUT_MS || '55000', 10);
const RETRY_MAX = parseInt(process.env.RELAY_RETRY_MAX || '3', 10);
const RETRY_BACKOFF_MS = parseInt(process.env.RELAY_RETRY_BACKOFF_MS || '1000', 10);

// Safe Mode 시스템 프롬프트
const SAFE_MODE_SYSTEM_PROMPT = [
  '당신은 Noma 카카오 원격면 에이전트입니다. Safe Mode가 적용되어 있습니다.',
  '허용: 읽기(read), 검색(search)',
  '차단: 파일 쓰기(write), 파일 수정(edit), 브라우저(browser), 실행(execute)',
  '차단된 작업을 요청받으면, 데스크톱 앱에서 실행하라고 안내하세요.',
  '응답은 한국어로, 간결하게 작성하세요.',
].join('\n');

/**
 * 사용자 메시지를 OpenClaw gateway에 중계
 * @param {string} utterance - 카카오에서 온 사용자 입력
 * @param {string} kakaoUserId - 카카오 유저 ID (세션 분리용)
 * @returns {Promise<{ok: boolean, text: string}>}
 */
function relayToGateway(utterance, kakaoUserId) {
  const tokenCheck = validateToken();
  if (!tokenCheck.valid) {
    return Promise.resolve({
      ok: false,
      text: '인증 토큰이 없습니다. 데스크톱 앱을 재시작해 주세요.',
    });
  }

  return callChatCompletions({
    messages: [
      { role: 'system', content: SAFE_MODE_SYSTEM_PROMPT },
      { role: 'user', content: utterance },
    ],
    model: 'openclaw:main',
    user: `kakao:${kakaoUserId}`,
    timeoutMs: RELAY_TIMEOUT_MS,
    logPrefix: 'relay',
  }).then((result) => {
    // 타임아웃 시 카카오 사용자 친화적 메시지로 교체
    const text = result.ok
      ? truncateResponse(result.text)
      : result.text.includes('시간이 초과')
        ? '처리 중입니다. 잠시 후 다시 물어봐 주세요.'
        : result.text;
    return { ok: result.ok, text };
  });
}

/**
 * 단일 HTTP 요청을 gateway에 전송 (내부용 — 하위 호환)
 * @param {string} utterance
 * @param {string} kakaoUserId
 * @param {number} timeoutMs
 * @param {string} logPrefix
 * @returns {Promise<{ok: boolean, text: string, retryable: boolean}>}
 */
function _singleRelay(utterance, kakaoUserId, timeoutMs, logPrefix) {
  return callChatCompletions({
    messages: [
      { role: 'system', content: SAFE_MODE_SYSTEM_PROMPT },
      { role: 'user', content: utterance },
    ],
    model: 'openclaw:main',
    user: `kakao:${kakaoUserId}`,
    timeoutMs,
    logPrefix,
  }).then((result) => ({
    ok: result.ok,
    text: truncateResponse(result.text),
    retryable: result.retryable,
  }));
}

/**
 * 콜백 모드 전용 — 타임아웃을 CALLBACK_TIMEOUT_MS (55초)로 확장 + retry
 * @param {string} utterance
 * @param {string} kakaoUserId
 * @returns {Promise<{ok: boolean, text: string}>}
 */
async function relayToGatewayForCallback(utterance, kakaoUserId) {
  const tokenCheck = validateToken();
  if (!tokenCheck.valid) {
    return {
      ok: false,
      text: '인증 토큰이 없습니다. 데스크톱 앱을 재시작해 주세요.',
    };
  }

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    const result = await _singleRelay(utterance, kakaoUserId, CALLBACK_TIMEOUT_MS, 'relay:cb');
    if (result.ok || !result.retryable || attempt === RETRY_MAX) {
      return { ok: result.ok, text: result.text };
    }
    const delay = RETRY_BACKOFF_MS * Math.pow(2, attempt);
    console.log(`[relay:cb] retryable error, attempt ${attempt + 1}/${RETRY_MAX} in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
  }
  return { ok: false, text: '서비스 점검 중입니다. 잠시 후 다시 시도해주세요.' };
}

/**
 * 카카오 callbackUrl로 최종 응답 POST
 * @param {string} callbackUrl - 카카오가 발급한 1회용 콜백 URL
 * @param {object} responseBody - 카카오 스킬 응답 포맷 { version, template }
 * @returns {Promise<{ok: boolean, status?: number}>}
 */
function sendCallback(callbackUrl, responseBody) {
  return new Promise((resolve) => {
    const url = new URL(callbackUrl);
    const data = JSON.stringify(responseBody);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 10000,
    };

    const transport = url.protocol === 'https:' ? require('https') : http;
    const req = transport.request(options, (res) => {
      res.resume(); // drain
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[relay:cb] callback sent OK (HTTP ${res.statusCode})`);
        resolve({ ok: true, status: res.statusCode });
      } else {
        console.error(`[relay:cb] callback failed HTTP ${res.statusCode}`);
        resolve({ ok: false, status: res.statusCode });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('[relay:cb] callback timeout');
      resolve({ ok: false });
    });

    req.on('error', (err) => {
      console.error(`[relay:cb] callback error: ${err.message}`);
      resolve({ ok: false });
    });

    req.write(data);
    req.end();
  });
}

// --- Team 모드 통합 ---
const { loadTeamConfig, orchestrate } = require('../../launcher/team-orchestrator');

/**
 * Team 모드 감지 + 자동 분기 relay
 * team 설정이 enabled면 orchestrate(), 아니면 기존 relayToGateway()
 * @param {string} utterance
 * @param {string} kakaoUserId
 * @returns {Promise<{ok: boolean, text: string}>}
 */
function relayWithTeam(utterance, kakaoUserId) {
  try {
    const config = loadTeamConfig();
    if (config.enabled) {
      return orchestrate(utterance, kakaoUserId, config, 'kakao').then((result) => ({
        ok: result.ok,
        text: truncateResponse(result.text),
      }));
    }
  } catch {
    // team config 로드 실패 → 기존 동작으로 폴백
  }
  return relayToGateway(utterance, kakaoUserId);
}

/**
 * Team 모드 감지 + 콜백 모드 relay
 * @param {string} utterance
 * @param {string} kakaoUserId
 * @returns {Promise<{ok: boolean, text: string}>}
 */
function relayWithTeamForCallback(utterance, kakaoUserId) {
  try {
    const config = loadTeamConfig();
    if (config.enabled) {
      return orchestrate(utterance, kakaoUserId, config, 'kakao').then((result) => ({
        ok: result.ok,
        text: truncateResponse(result.text),
      }));
    }
  } catch {
    // team config 로드 실패 → 기존 동작으로 폴백
  }
  return relayToGatewayForCallback(utterance, kakaoUserId);
}

module.exports = {
  readGatewayToken,
  validateToken,
  truncateResponse,
  checkGatewayHealth,
  healthCheckWithRetry,
  isRetryableError,
  relayToGateway,
  relayToGatewayForCallback,
  relayWithTeam,
  relayWithTeamForCallback,
  sendCallback,
  // 테스트용 내부 노출
  _singleRelay,
  SAFE_MODE_SYSTEM_PROMPT,
  GATEWAY_HOST,
  GATEWAY_PORT,
  CALLBACK_TIMEOUT_MS,
  RETRY_MAX,
  RETRY_BACKOFF_MS,
};
