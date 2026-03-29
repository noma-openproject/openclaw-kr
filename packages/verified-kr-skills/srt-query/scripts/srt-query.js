#!/usr/bin/env node
'use strict';

const { searchTrains } = require('../lib/api');
const { formatTrains } = require('../lib/formatter');
const { getStationNames } = require('../lib/stations');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node srt-query.js <출발역> <도착역> [날짜] [시간]');
    console.log('날짜: YYYYMMDD (기본: 오늘)');
    console.log('시간: HH (기본: 현재)');
    console.log(`\n지원 역: ${getStationNames().join(', ')}`);
    console.log('\n예시:');
    console.log('  node srt-query.js 수서 부산');
    console.log('  node srt-query.js 수서 부산 20260401 14');
    process.exit(0);
  }

  const dep = args[0];
  const arr = args[1];
  const date = args[2] || undefined;
  const hour = args[3] || undefined;

  const result = await searchTrains(dep, arr, date, hour);

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(formatTrains(result.trains, result.dep, result.arr, result.date));
}

main().catch((/** @type {any} */ err) => {
  console.error(`[오류] ${err.message}`);
  process.exit(1);
});
