'use strict';

const { formatInfo, formatResults } = require('../../_shared/kr-skill-utils');

/**
 * @param {import('./api').TrainInfo[]} trains
 * @param {string} dep
 * @param {string} arr
 * @param {string} [date]
 * @returns {string}
 */
function formatTrains(trains, dep, arr, date) {
  if (!trains || trains.length === 0) {
    return formatInfo('해당 시간대에 운행하는 열차가 없습니다.');
  }

  const header = date
    ? `${dep} → ${arr} (${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)})\n\n`
    : `${dep} → ${arr}\n\n`;

  const body = formatResults(trains, (t, i) => {
    const line1 = `[${i + 1}] SRT ${t.trainNo} | ${t.depTime} → ${t.arrTime} (${t.duration})`;
    const line2 = `    일반실: ${t.generalSeat} | 특실: ${t.specialSeat}`;
    return `${line1}\n${line2}`;
  });

  return header + body;
}

module.exports = { formatTrains };
