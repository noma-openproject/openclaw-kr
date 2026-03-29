'use strict';

const {
  formatError,
  fetchJson,
  createRateLimiter,
} = require('../../_shared/kr-skill-utils');

const BASE_URL = 'https://business.juso.go.kr/addrlink/addrLinkApi.do';

// 일일 제한 버퍼 (기본 승인키 기준)
const rateLimiter = createRateLimiter({
  maxRequests: 950,
  windowMs: 24 * 60 * 60 * 1000,
});

/**
 * @typedef {Object} AddressResult
 * @property {string} zipNo — 우편번호
 * @property {string} roadAddr — 전체 도로명주소
 * @property {string} roadAddrPart1 — 도로명주소 (참고항목 제외)
 * @property {string} roadAddrPart2 — 참고항목
 * @property {string} jibunAddr — 지번주소
 * @property {string} engAddr — 영문 도로명주소
 * @property {string} bdNm — 건물명
 * @property {string} siNm — 시도명
 * @property {string} sggNm — 시군구명
 * @property {string} emdNm — 읍면동명
 * @property {string} rn — 도로명
 */

/**
 * 도로명주소 API로 주소를 검색한다.
 * @param {string} keyword — 검색어
 * @param {number} [count=5] — 결과 수
 * @param {string} [apiKey] — API 키
 * @returns {Promise<{ok: boolean, results?: AddressResult[], keyword?: string, totalCount?: number, error?: string}>}
 */
async function searchAddress(keyword, count = 5, apiKey) {
  const key = apiKey || process.env.JUSO_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: formatError('필수 환경변수가 설정되지 않았습니다: JUSO_API_KEY'),
    };
  }

  if (!keyword || keyword.trim() === '') {
    return { ok: false, error: formatError('검색어를 입력하세요.') };
  }

  if (!rateLimiter.tryAcquire()) {
    return {
      ok: false,
      error: formatError('API 호출 한도를 초과했습니다.'),
    };
  }

  // eslint-disable-next-line no-undef
  const params = new URLSearchParams({
    confmKey: key,
    currentPage: '1',
    countPerPage: String(Math.min(Math.max(count, 1), 20)),
    keyword: keyword.trim(),
    resultType: 'json',
  });

  const url = `${BASE_URL}?${params.toString()}`;
  const res = await fetchJson(url, { timeoutMs: 10000 });

  if (!res.ok) {
    return { ok: false, error: formatError(`API 호출에 실패했습니다. ${res.error}`) };
  }

  const data = res.data;
  const common = data?.results?.common;

  // API 레벨 에러
  if (common && common.errorCode !== '0') {
    return {
      ok: false,
      error: formatError(`API 에러: ${common.errorMessage || common.errorCode}`),
    };
  }

  const juso = data?.results?.juso;
  if (!juso || juso.length === 0) {
    return {
      ok: true,
      results: [],
      keyword: keyword.trim(),
      totalCount: 0,
    };
  }

  /** @type {AddressResult[]} */
  const results = juso.map((/** @type {any} */ item) => ({
    zipNo: item.zipNo || '',
    roadAddr: item.roadAddr || '',
    roadAddrPart1: item.roadAddrPart1 || '',
    roadAddrPart2: item.roadAddrPart2 || '',
    jibunAddr: item.jibunAddr || '',
    engAddr: item.engAddr || '',
    bdNm: item.bdNm || '',
    siNm: item.siNm || '',
    sggNm: item.sggNm || '',
    emdNm: item.emdNm || '',
    rn: item.rn || '',
  }));

  return {
    ok: true,
    results,
    keyword: keyword.trim(),
    totalCount: parseInt(common?.totalCount, 10) || results.length,
  };
}

module.exports = { searchAddress };
