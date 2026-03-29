#!/usr/bin/env node
'use strict';

const { getLatestRound, getResult, checkNumbers } = require('../lib/api');
const { formatLottoResult, formatCheckResult } = require('../lib/formatter');

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node lotto-results.js [회차] [번호1 번호2 ... 번호6]');
    console.log('\n예시:');
    console.log('  node lotto-results.js                    # 최신 회차');
    console.log('  node lotto-results.js 1216               # 특정 회차');
    console.log('  node lotto-results.js 1216 3 10 14 15 23 24  # 번호 대조');
    process.exit(0);
  }

  // 회차 결정
  let round;
  if (args[0] && /^\d+$/.test(args[0])) {
    round = parseInt(args[0], 10);
  } else {
    const latest = await getLatestRound();
    if (!latest.ok) {
      console.error(latest.error);
      process.exit(1);
    }
    round = latest.round;
  }

  // 번호 대조 모드
  if (args.length >= 7) {
    const userNumbers = args.slice(1, 7);
    const check = await checkNumbers(round, userNumbers);
    if (!check.ok) {
      console.error(check.error);
      process.exit(1);
    }
    console.log(formatCheckResult(check.check));
    return;
  }

  // 결과 조회
  const res = await getResult(round);
  if (!res.ok) {
    console.error(res.error);
    process.exit(1);
  }
  console.log(formatLottoResult(res.result));
}

main().catch((/** @type {any} */ err) => {
  console.error(`[오류] ${err.message}`);
  process.exit(1);
});
