'use strict';

const { formatInfo, formatResults } = require('../../_shared/kr-skill-utils');

/**
 * @param {import('./api').AddressResult[]} results
 * @param {string} keyword
 * @param {number} [totalCount]
 * @returns {string}
 */
function formatAddresses(results, keyword, totalCount) {
  if (!results || results.length === 0) {
    return formatInfo(`'${keyword}'에 대한 검색 결과가 없습니다.`);
  }

  const header =
    totalCount && totalCount > results.length
      ? `총 ${totalCount}건 중 ${results.length}건 표시\n\n`
      : '';

  const body = formatResults(results, (item, i) => {
    const parts = [`[${i + 1}] ${item.zipNo}`];
    parts.push(`    ${item.roadAddr}`);
    if (item.jibunAddr) {
      parts.push(`    지번: ${item.jibunAddr}`);
    }
    return parts.join('\n');
  });

  return header + body;
}

module.exports = { formatAddresses };
