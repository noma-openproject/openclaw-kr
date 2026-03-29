'use strict';

/**
 * SRT 역 코드 매핑.
 * etk.srail.kr의 selectScheduleList 파라미터 기반.
 * @type {Record<string, string>}
 */
const STATION_CODES = {
  '수서': '0551',
  '동탄': '0552',
  '평택지제': '0553',
  '천안아산': '0502',
  '오송': '0297',
  '대전': '0010',
  '김천구미': '0507',
  '동대구': '0015',
  '신경주': '0508',
  '울산(통도사)': '0509',
  '울산': '0509',
  '부산': '0020',
  '공주': '0514',
  '익산': '0030',
  '정읍': '0033',
  '광주송정': '0036',
  '나주': '0037',
  '목포': '0041',
};

/**
 * 역명으로 코드를 찾는다.
 * @param {string} name
 * @returns {string | null}
 */
function getStationCode(name) {
  const trimmed = name.trim().replace(/역$/, '');
  return STATION_CODES[trimmed] || null;
}

/**
 * @returns {string[]}
 */
function getStationNames() {
  return Object.keys(STATION_CODES).filter((n) => n !== '울산(통도사)');
}

module.exports = { STATION_CODES, getStationCode, getStationNames };
