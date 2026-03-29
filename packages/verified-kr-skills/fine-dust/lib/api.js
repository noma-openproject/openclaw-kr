'use strict';

const {
  formatError,
  fetchJson,
  createRateLimiter,
} = require('../../_shared/kr-skill-utils');

const PROXY_URL = 'https://k-skill-proxy.nomadamas.org/v1/fine-dust/report';

const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60 * 1000 });

/**
 * @typedef {Object} DustReport
 * @property {string} station — 측정소
 * @property {string} time — 조회 시각
 * @property {number|string} pm10 — PM10 값
 * @property {string} pm10Grade — PM10 등급
 * @property {number|string} pm25 — PM2.5 값
 * @property {string} pm25Grade — PM2.5 등급
 * @property {string} overallGrade — 통합대기등급
 * @property {string} [fallback] — 조회 방식
 */

/**
 * 미세먼지 정보를 조회한다.
 * @param {string} regionHint — 지역명 (예: "서울 강남구")
 * @param {string} [stationName] — 정확한 측정소명 (재조회 시)
 * @returns {Promise<{ok: boolean, report?: DustReport, candidates?: string[], error?: string}>}
 */
async function getDustReport(regionHint, stationName) {
  if (!regionHint && !stationName) {
    return { ok: false, error: formatError('지역명을 입력하세요.') };
  }

  if (!rateLimiter.tryAcquire()) {
    return { ok: false, error: formatError('요청이 너무 빠릅니다. 잠시 후 다시 시도하세요.') };
  }

  // eslint-disable-next-line no-undef
  const params = new URLSearchParams();
  if (stationName) {
    params.set('stationName', stationName);
  } else {
    params.set('regionHint', regionHint);
  }

  const url = `${PROXY_URL}?${params.toString()}`;
  const res = await fetchJson(url, { timeoutMs: 10000 });

  if (!res.ok) {
    return { ok: false, error: formatError(`미세먼지 조회 실패. ${res.error}`) };
  }

  const data = res.data;

  // 지역 모호 → 후보 목록 반환
  if (data.ambiguous_location || data.candidate_stations) {
    return {
      ok: true,
      candidates: data.candidate_stations || [],
    };
  }

  return {
    ok: true,
    report: {
      station: data.station || data.stationName || '',
      time: data.time || data.dataTime || '',
      pm10: data.pm10 ?? data.pm10Value ?? '-',
      pm10Grade: data.pm10Grade || gradeLabel(data.pm10Grade1h),
      pm25: data.pm25 ?? data.pm25Value ?? '-',
      pm25Grade: data.pm25Grade || gradeLabel(data.pm25Grade1h),
      overallGrade: data.overallGrade || gradeLabel(data.khaiGrade),
      fallback: data.fallback || '',
    },
  };
}

/**
 * @param {number|string|undefined} grade
 * @returns {string}
 */
function gradeLabel(grade) {
  const map = { '1': '좋음', '2': '보통', '3': '나쁨', '4': '매우나쁨' };
  return map[String(grade)] || String(grade || '-');
}

module.exports = { getDustReport, gradeLabel };
