'use strict';

const { formatError } = require('../../_shared/kr-skill-utils');

/**
 * @typedef {Object} LottoResult
 * @property {number} round — 회차
 * @property {string} date — 추첨일
 * @property {number[]} numbers — 당첨번호 6개
 * @property {number} bonus — 보너스 번호
 * @property {string} [firstPrize] — 1등 당첨금
 * @property {number} [firstWinners] — 1등 당첨자 수
 */

/**
 * @typedef {Object} CheckResult
 * @property {number} round
 * @property {number[]} matched — 일치하는 번호들
 * @property {boolean} bonusMatched
 * @property {number} matchCount
 * @property {string} rank — 등수 (1등~5등 또는 낙첨)
 */

/**
 * 최신 회차 번호를 가져온다.
 * @returns {Promise<{ok: boolean, round?: number, error?: string}>}
 */
async function getLatestRound() {
  try {
    const lotto = require('k-lotto');
    const round = await lotto.getLatestRound();
    return { ok: true, round };
  } catch (/** @type {any} */ err) {
    return { ok: false, error: formatError(`최신 회차 조회 실패: ${err.message}`) };
  }
}

/**
 * 특정 회차 상세 결과를 가져온다.
 * @param {number} round
 * @returns {Promise<{ok: boolean, result?: LottoResult, error?: string}>}
 */
async function getResult(round) {
  try {
    const lotto = require('k-lotto');
    const data = await lotto.getDetailResult(round);
    return {
      ok: true,
      result: {
        round: data.round || round,
        date: data.date || '',
        numbers: data.numbers || [],
        bonus: data.bonus || 0,
        firstPrize: data.firstPrize || '',
        firstWinners: data.firstWinners || 0,
      },
    };
  } catch (/** @type {any} */ err) {
    return { ok: false, error: formatError(`${round}회 결과 조회 실패: ${err.message}`) };
  }
}

/**
 * 사용자 번호를 대조한다.
 * @param {number} round
 * @param {string[]} userNumbers — 6개 번호 (문자열 배열)
 * @returns {Promise<{ok: boolean, check?: CheckResult, error?: string}>}
 */
async function checkNumbers(round, userNumbers) {
  try {
    const lotto = require('k-lotto');
    const data = await lotto.checkNumber(round, userNumbers);
    return {
      ok: true,
      check: {
        round,
        matched: data.matched || [],
        bonusMatched: data.bonusMatched || false,
        matchCount: data.matchCount || 0,
        rank: data.rank || '낙첨',
      },
    };
  } catch (/** @type {any} */ err) {
    return { ok: false, error: formatError(`번호 대조 실패: ${err.message}`) };
  }
}

module.exports = { getLatestRound, getResult, checkNumbers };
