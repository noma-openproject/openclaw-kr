'use strict';

const { formatInfo } = require('../../_shared/kr-skill-utils');

/**
 * @param {import('./api').LottoResult} result
 * @returns {string}
 */
function formatLottoResult(result) {
  const nums = result.numbers.join(', ');
  const lines = [
    `제 ${result.round}회 로또 당첨번호`,
    `추첨일: ${result.date}`,
    `당첨번호: ${nums} + 보너스 ${result.bonus}`,
  ];
  if (result.firstPrize) {
    lines.push(`1등 당첨금: ${result.firstPrize}`);
  }
  if (result.firstWinners) {
    lines.push(`1등 당첨자: ${result.firstWinners}명`);
  }
  return lines.join('\n');
}

/**
 * @param {import('./api').CheckResult} check
 * @returns {string}
 */
function formatCheckResult(check) {
  if (check.matchCount === 0) {
    return formatInfo('일치하는 번호가 없습니다. (낙첨)');
  }
  const lines = [
    `제 ${check.round}회 번호 대조 결과`,
    `일치 번호: ${check.matched.join(', ')} (${check.matchCount}개)`,
    `보너스 일치: ${check.bonusMatched ? '예' : '아니오'}`,
    `결과: ${check.rank}`,
  ];
  return lines.join('\n');
}

module.exports = { formatLottoResult, formatCheckResult };
