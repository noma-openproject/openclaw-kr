'use strict';

const { formatInfo, formatResults } = require('../../_shared/kr-skill-utils');

/**
 * @param {import('./api').TrackingResult} [result]
 * @returns {string}
 */
function formatTracking(result) {
  if (!result) return formatInfo('배송 데이터를 가져올 수 없습니다.');

  const carrierName = result.carrier === 'cj' ? 'CJ대한통운' : '우체국';
  const lines = [
    `${carrierName} 배송조회 — ${result.invoice}`,
    `현재 상태: ${result.status}`,
  ];
  if (result.timestamp) lines.push(`시각: ${result.timestamp}`);
  if (result.location) lines.push(`위치: ${result.location}`);

  if (result.recentEvents.length > 0) {
    lines.push('');
    lines.push(`최근 이벤트 (${result.eventCount}건 중 ${result.recentEvents.length}건):`);
    const events = formatResults(result.recentEvents, (e, i) =>
      `  ${i + 1}. [${e.timestamp}] ${e.location} — ${e.status}`
    );
    lines.push(events);
  }

  return lines.join('\n');
}

module.exports = { formatTracking };
