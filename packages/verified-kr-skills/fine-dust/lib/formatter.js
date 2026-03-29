'use strict';

const { formatInfo } = require('../../_shared/kr-skill-utils');

/**
 * @param {import('./api').DustReport} [report]
 * @param {string[]} [candidates]
 * @returns {string}
 */
function formatDustReport(report, candidates) {
  if (candidates && candidates.length > 0) {
    return [
      formatInfo('지역이 여러 측정소에 해당합니다. 아래에서 선택하세요:'),
      ...candidates.map((c, i) => `  ${i + 1}. ${c}`),
    ].join('\n');
  }

  if (!report) {
    return formatInfo('미세먼지 데이터를 가져올 수 없습니다.');
  }

  const lines = [
    `측정소: ${report.station}`,
    `조회 시각: ${report.time}`,
    `PM10 (미세먼지): ${report.pm10} ㎍/㎥ (${report.pm10Grade})`,
    `PM2.5 (초미세먼지): ${report.pm25} ㎍/㎥ (${report.pm25Grade})`,
    `통합대기등급: ${report.overallGrade}`,
  ];
  if (report.fallback) {
    lines.push(`조회 방식: ${report.fallback}`);
  }
  return lines.join('\n');
}

module.exports = { formatDustReport };
