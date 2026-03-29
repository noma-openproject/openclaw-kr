'use strict';

// ── 한국어 메시지 포맷터 ──

/**
 * @param {string} msg
 * @returns {string}
 */
function formatError(msg) {
  return `[오류] ${msg}`;
}

/**
 * @param {string} msg
 * @returns {string}
 */
function formatInfo(msg) {
  return `[정보] ${msg}`;
}

/**
 * @param {string} msg
 * @returns {string}
 */
function formatWarn(msg) {
  return `[주의] ${msg}`;
}

// ── HTML 태그 제거 ──

/**
 * @param {string} text
 * @returns {string}
 */
function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 환경변수 검증 ──

/**
 * 필수 환경변수가 설정되어 있는지 확인한다.
 * 미설정 시 에러 메시지 출력 후 process.exit(1).
 * @param {string[]} names
 */
function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length > 0) {
    console.error(
      formatError(
        `필수 환경변수가 설정되지 않았습니다: ${missing.join(', ')}`
      )
    );
    process.exit(1);
  }
}

/**
 * @param {string} name
 * @param {string} defaultValue
 * @returns {string}
 */
function optionalEnv(name, defaultValue) {
  return process.env[name] || defaultValue;
}

// ── Rate Limiter ──

/**
 * @typedef {Object} RateLimiterOptions
 * @property {number} maxRequests
 * @property {number} windowMs
 */

/**
 * @typedef {Object} RateLimiter
 * @property {() => boolean} tryAcquire
 * @property {() => number} remaining
 */

/**
 * 인메모리 슬라이딩 윈도우 rate limiter.
 * @param {RateLimiterOptions} options
 * @returns {RateLimiter}
 */
function createRateLimiter({ maxRequests, windowMs }) {
  /** @type {number[]} */
  const timestamps = [];

  return {
    tryAcquire() {
      const now = Date.now();
      // 윈도우 밖 타임스탬프 제거
      while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
        timestamps.shift();
      }
      if (timestamps.length >= maxRequests) {
        return false;
      }
      timestamps.push(now);
      return true;
    },
    remaining() {
      const now = Date.now();
      while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
        timestamps.shift();
      }
      return Math.max(0, maxRequests - timestamps.length);
    },
  };
}

// ── HTTP 래퍼 ──

/**
 * @typedef {Object} FetchJsonOptions
 * @property {string} [method]
 * @property {Record<string, string>} [headers]
 * @property {number} [timeoutMs]
 */

/**
 * JSON 응답을 반환하는 HTTP 요청.
 * @param {string} url
 * @param {FetchJsonOptions} [options]
 * @returns {Promise<{ok: boolean, data?: any, status?: number, error?: string}>}
 */
async function fetchJson(url, options = {}) {
  const { method = 'GET', headers = {}, timeoutMs = 10000 } = options;
  // eslint-disable-next-line no-undef
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // eslint-disable-next-line no-undef
    const res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      if (res.status === 429) {
        return { ok: false, status: 429, error: 'API 호출 한도를 초과했습니다.' };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: res.status, error: '인증에 실패했습니다. API 키를 확인하세요.' };
      }
      return { ok: false, status: res.status, error: `HTTP ${res.status} 오류가 발생했습니다.` };
    }

    const data = await res.json();
    return { ok: true, data, status: res.status };
  } catch (/** @type {any} */ err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { ok: false, error: `요청 시간이 초과되었습니다 (${timeoutMs}ms).` };
    }
    return { ok: false, error: `네트워크 오류: ${err.message}` };
  }
}

// ── 결과 포맷터 ──

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => string} formatter
 * @returns {string}
 */
function formatResults(items, formatter) {
  if (!items || items.length === 0) {
    return formatInfo('결과가 없습니다.');
  }
  return items.map((item, i) => formatter(item, i)).join('\n\n');
}

module.exports = {
  formatError,
  formatInfo,
  formatWarn,
  stripHtml,
  requireEnv,
  optionalEnv,
  createRateLimiter,
  fetchJson,
  formatResults,
};
