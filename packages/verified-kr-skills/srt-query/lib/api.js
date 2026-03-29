'use strict';

const {
  formatError,
  createRateLimiter,
} = require('../../_shared/kr-skill-utils');
const { getStationCode, getStationNames } = require('./stations');

const SCHEDULE_URL = 'https://etk.srail.kr/hpg/hra/01/selectScheduleList.do';

// 과도한 요청 방지 — 1분에 10건
const rateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
});

/**
 * @typedef {Object} TrainInfo
 * @property {string} trainNo — 열차번호
 * @property {string} depTime — 출발시간 (HHmm)
 * @property {string} arrTime — 도착시간 (HHmm)
 * @property {string} duration — 소요시간
 * @property {string} generalSeat — 일반실 잔여 (○/△/×)
 * @property {string} specialSeat — 특실 잔여 (○/△/×)
 */

/**
 * SRT 시간표를 조회한다.
 * @param {string} dep — 출발역명
 * @param {string} arr — 도착역명
 * @param {string} [date] — YYYYMMDD (기본: 오늘)
 * @param {string} [hour] — HH (기본: 현재)
 * @returns {Promise<{ok: boolean, trains?: TrainInfo[], dep?: string, arr?: string, date?: string, error?: string}>}
 */
async function searchTrains(dep, arr, date, hour) {
  if (!dep || !arr) {
    return { ok: false, error: formatError('출발역과 도착역을 입력하세요.') };
  }

  const depCode = getStationCode(dep);
  if (!depCode) {
    const names = getStationNames().join(', ');
    return {
      ok: false,
      error: formatError(`지원하지 않는 역입니다: ${dep}\n지원 역: ${names}`),
    };
  }

  const arrCode = getStationCode(arr);
  if (!arrCode) {
    const names = getStationNames().join(', ');
    return {
      ok: false,
      error: formatError(`지원하지 않는 역입니다: ${arr}\n지원 역: ${names}`),
    };
  }

  if (!rateLimiter.tryAcquire()) {
    return { ok: false, error: formatError('요청이 너무 빠릅니다. 잠시 후 다시 시도하세요.') };
  }

  const now = new Date();
  const queryDate = date || formatDate(now);
  const queryHour = hour || String(now.getHours()).padStart(2, '0');

  // eslint-disable-next-line no-undef
  const params = new URLSearchParams({
    dptRsStnCd: depCode,
    arvRsStnCd: arrCode,
    stlbTrnClsfCd: '05', // SRT
    psgNum: '1',
    seatAttCd: '015', // 일반석
    is498: 'Y',
    dptDt: queryDate,
    dptTm: `${queryHour}0000`,
    chtnDvCd: '1',
    arriveTime: 'N',
  });

  try {
    // eslint-disable-next-line no-undef
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    // eslint-disable-next-line no-undef
    const res = await fetch(SCHEDULE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/javascript, */*',
        'Referer': 'https://etk.srail.kr/hpg/hra/01/selectScheduleList.do',
      },
      body: params.toString(),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, error: formatError(`SRT 서버 응답 오류 (HTTP ${res.status})`) };
    }

    const text = await res.text();

    // HTML 응답에서 열차 정보 파싱
    const trains = parseScheduleHtml(text);

    return {
      ok: true,
      trains,
      dep: dep.trim().replace(/역$/, ''),
      arr: arr.trim().replace(/역$/, ''),
      date: queryDate,
    };
  } catch (/** @type {any} */ err) {
    if (err.name === 'AbortError') {
      return { ok: false, error: formatError('SRT 조회 시간이 초과되었습니다.') };
    }
    return { ok: false, error: formatError(`SRT 조회에 실패했습니다: ${err.message}`) };
  }
}

/**
 * HTML 응답에서 열차 시간표를 파싱한다.
 * SRT 웹페이지 구조 변경 시 업데이트 필요.
 * @param {string} html
 * @returns {TrainInfo[]}
 */
function parseScheduleHtml(html) {
  /** @type {TrainInfo[]} */
  const trains = [];

  // SRT 웹에서 trnNo, dptTm, arvTm, gnrlRsvPsbStr, sprmRsvPsbStr 패턴 탐색
  // JSON-like 데이터가 JavaScript 내에 포함되거나, HTML 테이블로 제공됨
  // 두 패턴 모두 지원

  // 패턴 1: JavaScript 객체 내 데이터
  const trainNoRegex = /trnNo\s*[=:]\s*["']?(\d+)["']?/g;
  const dptTmRegex = /dptTm\s*[=:]\s*["']?(\d{6})["']?/g;
  const arvTmRegex = /arvTm\s*[=:]\s*["']?(\d{6})["']?/g;
  const gnrlRegex = /gnrlRsvPsbStr\s*[=:]\s*["']?([^"'\s,}]+)["']?/g;
  const sprmRegex = /sprmRsvPsbStr\s*[=:]\s*["']?([^"'\s,}]+)["']?/g;

  const trainNos = [...html.matchAll(trainNoRegex)].map((m) => m[1]);
  const dptTms = [...html.matchAll(dptTmRegex)].map((m) => m[1]);
  const arvTms = [...html.matchAll(arvTmRegex)].map((m) => m[1]);
  const gnrls = [...html.matchAll(gnrlRegex)].map((m) => m[1]);
  const sprms = [...html.matchAll(sprmRegex)].map((m) => m[1]);

  const count = Math.min(trainNos.length, dptTms.length, arvTms.length);

  for (let i = 0; i < count; i++) {
    const depH = dptTms[i].substring(0, 2);
    const depM = dptTms[i].substring(2, 4);
    const arrH = arvTms[i].substring(0, 2);
    const arrM = arvTms[i].substring(2, 4);

    const depMin = parseInt(depH, 10) * 60 + parseInt(depM, 10);
    const arrMin = parseInt(arrH, 10) * 60 + parseInt(arrM, 10);
    const durMin = arrMin >= depMin ? arrMin - depMin : arrMin + 1440 - depMin;
    const durH = Math.floor(durMin / 60);
    const durM = durMin % 60;

    trains.push({
      trainNo: trainNos[i],
      depTime: `${depH}:${depM}`,
      arrTime: `${arrH}:${arrM}`,
      duration: `${durH}시간 ${durM}분`,
      generalSeat: mapSeatStatus(gnrls[i] || ''),
      specialSeat: mapSeatStatus(sprms[i] || ''),
    });
  }

  return trains;
}

/**
 * 잔여석 상태 매핑
 * @param {string} status
 * @returns {string}
 */
function mapSeatStatus(status) {
  if (status.includes('예약가능') || status === '○') return '○ (잔여 있음)';
  if (status.includes('매진') || status === '×') return '× (매진)';
  if (status.includes('신청') || status === '△') return '△ (잔여 적음)';
  if (status) return status;
  return '- (정보 없음)';
}

/**
 * Date → YYYYMMDD
 * @param {Date} d
 * @returns {string}
 */
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

module.exports = { searchTrains, parseScheduleHtml, mapSeatStatus, formatDate };
