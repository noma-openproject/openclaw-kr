'use strict';

const { formatInfo, formatResults } = require('../../_shared/kr-skill-utils');

/**
 * @param {import('./api').ArrivalInfo[]} arrivals
 * @param {string} station
 * @returns {string}
 */
function formatArrivals(arrivals, station) {
  if (!arrivals || arrivals.length === 0) {
    return formatInfo(`'${station}'에 대한 도착정보가 없습니다.`);
  }

  return formatResults(arrivals, (item, i) => {
    const parts = [`[${i + 1}] ${item.line} ${item.direction}`];
    if (item.destination) {
      parts[0] += ` (${item.destination})`;
    }
    if (item.message) {
      parts.push(`    ${item.message}`);
    }
    if (item.currentStation && item.currentStation !== item.message) {
      parts.push(`    현재 위치: ${item.currentStation}`);
    }
    return parts.join('\n');
  });
}

module.exports = { formatArrivals };
