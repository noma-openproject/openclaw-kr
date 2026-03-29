#!/usr/bin/env node
'use strict';

const { requireEnv } = require('../../_shared/kr-skill-utils');
const { getArrivalInfo } = require('../lib/api');
const { formatArrivals } = require('../lib/formatter');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node seoul-metro.js <역명> [표시개수]');
    console.log('\n예시:');
    console.log('  node seoul-metro.js 강남');
    console.log('  node seoul-metro.js 홍대입구 3');
    process.exit(0);
  }

  requireEnv(['SEOUL_DATA_API_KEY']);

  const station = args[0];
  const count = Math.min(Math.max(parseInt(args[1], 10) || 5, 1), 10);

  const result = await getArrivalInfo(station, count);

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(formatArrivals(result.arrivals, result.station));
}

main().catch((/** @type {any} */ err) => {
  console.error(`[오류] ${err.message}`);
  process.exit(1);
});
