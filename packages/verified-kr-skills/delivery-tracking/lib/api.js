'use strict';

const {
  formatError,
  stripHtml,
  createRateLimiter,
} = require('../../_shared/kr-skill-utils');

const CJ_ENTRY = 'https://www.cjlogistics.com/ko/tool/parcel/tracking';
const CJ_DETAIL = 'https://www.cjlogistics.com/ko/tool/parcel/tracking-detail';
const EPOST_URL = 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm';

const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60 * 1000 });

/** @type {Record<string, string>} */
const CJ_STATUS_MAP = {
  '11': '상품인수', '21': '상품이동중', '41': '상품이동중',
  '42': '배송지도착', '44': '상품이동중', '82': '배송출발', '91': '배달완료',
};

/**
 * @typedef {Object} TrackingEvent
 * @property {string} timestamp
 * @property {string} location
 * @property {string} status
 */

/**
 * @typedef {Object} TrackingResult
 * @property {string} carrier
 * @property {string} invoice
 * @property {string} status
 * @property {string} [timestamp]
 * @property {string} [location]
 * @property {number} eventCount
 * @property {TrackingEvent[]} recentEvents
 */

/**
 * 송장번호 형식 검증
 * @param {string} carrier
 * @param {string} invoice
 * @returns {string|null} — 에러 메시지 또는 null
 */
function validateInvoice(carrier, invoice) {
  const digits = invoice.replace(/\D/g, '');
  if (carrier === 'cj' && (digits.length < 10 || digits.length > 12)) {
    return 'CJ대한통운 송장번호는 10~12자리 숫자입니다.';
  }
  if (carrier === 'epost' && digits.length !== 13) {
    return '우체국 송장번호는 13자리 숫자입니다.';
  }
  return null;
}

/**
 * CJ대한통운 배송조회
 * @param {string} invoice
 * @returns {Promise<{ok: boolean, result?: TrackingResult, error?: string}>}
 */
async function trackCJ(invoice) {
  try {
    // 1. CSRF 토큰 획득
    // eslint-disable-next-line no-undef
    const entryRes = await fetch(CJ_ENTRY, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const html = await entryRes.text();
    const csrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/);
    if (!csrfMatch) {
      return { ok: false, error: formatError('CJ 페이지에서 CSRF 토큰을 찾을 수 없습니다.') };
    }
    const csrf = csrfMatch[1];
    const cookies = (entryRes.headers.get('set-cookie') || '').split(',').map(c => c.split(';')[0]).join('; ');

    // 2. 상세 조회
    // eslint-disable-next-line no-undef
    const detailRes = await fetch(CJ_DETAIL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0',
        'Cookie': cookies,
      },
      body: `_csrf=${encodeURIComponent(csrf)}&paramInvcNo=${encodeURIComponent(invoice)}`,
    });
    const data = await detailRes.json();

    const events = data?.parcelDetailResultMap?.resultList;
    if (!events || events.length === 0) {
      return { ok: true, result: { carrier: 'cj', invoice, status: '조회결과 없음', eventCount: 0, recentEvents: [] } };
    }

    const latest = events[events.length - 1];
    /** @type {TrackingEvent[]} */
    const recentEvents = events.slice(-3).map((/** @type {any} */ e) => ({
      timestamp: e.dTime || '',
      location: e.regBranNm || '',
      status: CJ_STATUS_MAP[e.crgSt] || e.scanNm || '알수없음',
    }));

    return {
      ok: true,
      result: {
        carrier: 'cj',
        invoice,
        status: CJ_STATUS_MAP[latest.crgSt] || latest.scanNm || '알수없음',
        timestamp: latest.dTime || '',
        location: latest.regBranNm || '',
        eventCount: events.length,
        recentEvents,
      },
    };
  } catch (/** @type {any} */ err) {
    return { ok: false, error: formatError(`CJ 조회 실패: ${err.message}`) };
  }
}

/**
 * 우체국 배송조회
 * @param {string} invoice
 * @returns {Promise<{ok: boolean, result?: TrackingResult, error?: string}>}
 */
async function trackEpost(invoice) {
  try {
    // eslint-disable-next-line no-undef
    const res = await fetch(EPOST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      body: `sid1=${encodeURIComponent(invoice)}`,
    });
    const html = await res.text();

    // 이벤트 파싱
    const eventRegex = /<tr>\s*<td>(\d{4}\.\d{2}\.\d{2})<\/td>\s*<td>(\d{2}:\d{2})<\/td>\s*<td>(.*?)<\/td>\s*<td>\s*<span class="evtnm">(.*?)<\/span>/gs;
    /** @type {TrackingEvent[]} */
    const events = [];
    let match;
    while ((match = eventRegex.exec(html)) !== null) {
      const loc = stripHtml(match[3]).replace(/\s*TEL\s*:?\s*\d[\d.-]*/g, '').trim();
      events.push({
        timestamp: `${match[1]} ${match[2]}`,
        location: loc,
        status: stripHtml(match[4]),
      });
    }

    if (events.length === 0) {
      return { ok: true, result: { carrier: 'epost', invoice, status: '조회결과 없음', eventCount: 0, recentEvents: [] } };
    }

    const latest = events[events.length - 1];
    return {
      ok: true,
      result: {
        carrier: 'epost',
        invoice,
        status: latest.status,
        timestamp: latest.timestamp,
        location: latest.location,
        eventCount: events.length,
        recentEvents: events.slice(-3),
      },
    };
  } catch (/** @type {any} */ err) {
    return { ok: false, error: formatError(`우체국 조회 실패: ${err.message}`) };
  }
}

/**
 * 택배 배송조회 통합 진입점
 * @param {string} carrier — 'cj' | 'epost'
 * @param {string} invoice
 * @returns {Promise<{ok: boolean, result?: TrackingResult, error?: string}>}
 */
async function trackDelivery(carrier, invoice) {
  if (!carrier || !invoice) {
    return { ok: false, error: formatError('택배사(cj/epost)와 송장번호를 입력하세요.') };
  }

  const c = carrier.toLowerCase().trim();
  if (c !== 'cj' && c !== 'epost') {
    return { ok: false, error: formatError(`지원하지 않는 택배사: ${carrier}. cj 또는 epost만 지원합니다.`) };
  }

  const validErr = validateInvoice(c, invoice);
  if (validErr) {
    return { ok: false, error: formatError(validErr) };
  }

  if (!rateLimiter.tryAcquire()) {
    return { ok: false, error: formatError('요청이 너무 빠릅니다. 잠시 후 다시 시도하세요.') };
  }

  return c === 'cj' ? trackCJ(invoice.replace(/\D/g, '')) : trackEpost(invoice.replace(/\D/g, ''));
}

module.exports = { trackDelivery, validateInvoice };
