'use strict';

const { formatInfo, formatResults } = require('../../_shared/kr-skill-utils');

/**
 * @param {import('./api').GameInfo[]} games
 * @param {string} date
 * @returns {string}
 */
function formatGames(games, date) {
  if (!games || games.length === 0) {
    return formatInfo(`${date}에 예정된 KBO 경기가 없습니다.`);
  }

  const header = `KBO 경기 결과 (${date})\n\n`;
  const body = formatResults(games, (g, i) => {
    const score = `${g.awayTeam} ${g.awayScore} : ${g.homeScore} ${g.homeTeam}`;
    const parts = [`[${i + 1}] ${score}`];
    if (g.status) parts.push(`    ${g.status}`);
    if (g.stadium) parts.push(`    ${g.stadium}`);
    return parts.join('\n');
  });

  return header + body;
}

module.exports = { formatGames };
