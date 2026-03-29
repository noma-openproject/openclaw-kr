'use strict';

const { formatError } = require('../../_shared/kr-skill-utils');

/**
 * @typedef {Object} GameInfo
 * @property {string} homeTeam
 * @property {string} awayTeam
 * @property {number|string} homeScore
 * @property {number|string} awayScore
 * @property {string} status — 경기 상태
 * @property {string} [time] — 경기 시간
 * @property {string} [stadium] — 경기장
 */

/**
 * KBO 경기 결과를 조회한다.
 * @param {string} dateStr — YYYY-MM-DD
 * @param {string} [teamFilter] — 팀명 필터
 * @returns {Promise<{ok: boolean, games?: GameInfo[], date?: string, error?: string}>}
 */
async function getGames(dateStr, teamFilter) {
  if (!dateStr) {
    return { ok: false, error: formatError('날짜를 입력하세요. (YYYY-MM-DD)') };
  }

  try {
    // kbo-game은 ESM — dynamic import 사용
    // getGame은 Date 객체를 받음 (문자열 아님!)
    /** @type {any} */
    const kboModule = await import('kbo-game');
    const getGame = kboModule.getGame || kboModule.default?.getGame;

    if (!getGame) {
      return { ok: false, error: formatError('kbo-game 패키지의 getGame을 찾을 수 없습니다.') };
    }

    const date = new Date(`${dateStr}T00:00:00+09:00`);
    const rawGames = await getGame(date);

    if (!rawGames || (Array.isArray(rawGames) && rawGames.length === 0)) {
      return { ok: true, games: [], date: dateStr };
    }

    /** @type {GameInfo[]} */
    let games = (Array.isArray(rawGames) ? rawGames : [rawGames]).map(
      (/** @type {any} */ g) => ({
        homeTeam: g.homeTeam || g.home || '',
        awayTeam: g.awayTeam || g.away || '',
        homeScore: g.homeScore ?? g.hScore ?? '-',
        awayScore: g.awayScore ?? g.aScore ?? '-',
        status: g.status || g.gameStatus || '',
        time: g.time || g.gameTime || '',
        stadium: g.stadium || g.place || '',
      })
    );

    // 팀 필터
    if (teamFilter) {
      const t = teamFilter.trim();
      games = games.filter(
        (g) => g.homeTeam.includes(t) || g.awayTeam.includes(t)
      );
    }

    return { ok: true, games, date: dateStr };
  } catch (/** @type {any} */ err) {
    return { ok: false, error: formatError(`KBO 조회 실패: ${err.message}`) };
  }
}

module.exports = { getGames };
