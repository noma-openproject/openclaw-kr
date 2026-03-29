'use strict';

const {
  formatError,
  fetchJson,
  createRateLimiter,
} = require('../../_shared/kr-skill-utils');

const BASE_URL = 'http://swopenAPI.seoul.go.kr/api/subway';

// 일일 1000건 제한 → 950으로 버퍼
const rateLimiter = createRateLimiter({
  maxRequests: 950,
  windowMs: 24 * 60 * 60 * 1000,
});

/**
 * 역명 정규화: "강남역" → "강남", 앞뒤 공백 제거
 * @param {string} station
 * @returns {string}
 */
function normalizeStation(station) {
  return station.trim().replace(/역$/, '');
}

/**
 * @typedef {Object} ArrivalInfo
 * @property {string} line — 호선명 (예: "2호선")
 * @property {string} direction — 방면 (예: "내선순환")
 * @property {string} destination — 행선지 (예: "성수행")
 * @property {string} message — 도착 메시지 (예: "3분 후")
 * @property {string} currentStation — 현재 위치 역명
 * @property {number} ordinal — 도착 순서 (1 또는 2)
 */

/**
 * 서울 지하철 실시간 도착정보를 조회한다.
 * @param {string} station — 역명
 * @param {number} [count=5] — 표시 개수
 * @param {string} [apiKey] — API 키 (기본: process.env.SEOUL_DATA_API_KEY)
 * @returns {Promise<{ok: boolean, arrivals?: ArrivalInfo[], station?: string, error?: string}>}
 */
async function getArrivalInfo(station, count = 5, apiKey) {
  const key = apiKey || process.env.SEOUL_DATA_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: formatError('필수 환경변수가 설정되지 않았습니다: SEOUL_DATA_API_KEY'),
    };
  }

  if (!station || station.trim() === '') {
    return { ok: false, error: formatError('역명을 입력하세요.') };
  }

  if (!rateLimiter.tryAcquire()) {
    return {
      ok: false,
      error: formatError('API 호출 한도를 초과했습니다. 일일 1,000건 제한.'),
    };
  }

  const normalized = normalizeStation(station);
  const url = `${BASE_URL}/${encodeURIComponent(key)}/json/realtimeStationArrival/0/${count}/${encodeURIComponent(normalized)}`;

  const res = await fetchJson(url, { timeoutMs: 10000 });

  if (!res.ok) {
    return { ok: false, error: formatError(`API 호출에 실패했습니다. ${res.error}`) };
  }

  const data = res.data;

  // API 에러 응답 처리
  if (data.status && data.status !== 200) {
    return {
      ok: false,
      error: formatError(`API 에러: ${data.message || data.status}`),
    };
  }

  // 결과 없음
  const list = data.realtimeArrivalList;
  if (!list || list.length === 0) {
    return {
      ok: true,
      arrivals: [],
      station: normalized,
    };
  }

  /** @type {ArrivalInfo[]} */
  const arrivals = list.map((/** @type {any} */ item) => ({
    line: item.subwayId ? getLineName(item.subwayId) : (item.trainLineNm || ''),
    direction: item.updnLine || '',
    destination: item.trainLineNm || item.bstatnNm || '',
    message: item.arvlMsg2 || item.arvlMsg3 || '',
    currentStation: item.arvlMsg3 || '',
    ordinal: Number(item.ordkey?.charAt(0)) || 1,
  }));

  return { ok: true, arrivals, station: normalized };
}

/**
 * 지하철 ID → 호선명 매핑
 * @param {string} subwayId
 * @returns {string}
 */
function getLineName(subwayId) {
  /** @type {Record<string, string>} */
  const lines = {
    '1001': '1호선', '1002': '2호선', '1003': '3호선', '1004': '4호선',
    '1005': '5호선', '1006': '6호선', '1007': '7호선', '1008': '8호선',
    '1009': '9호선', '1061': '중앙선', '1063': '경의중앙선',
    '1065': '공항철도', '1067': '경춘선', '1075': '수인분당선',
    '1077': '신분당선', '1091': '자기부상',
    '1092': '우이신설선', '1093': '서해선', '1081': 'GTX-A',
  };
  return lines[subwayId] || `노선${subwayId}`;
}

module.exports = { getArrivalInfo, normalizeStation, getLineName };
