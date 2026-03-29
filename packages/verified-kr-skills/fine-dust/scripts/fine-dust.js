#!/usr/bin/env node
'use strict';

const { getDustReport } = require('../lib/api');
const { formatDustReport } = require('../lib/formatter');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node fine-dust.js <지역명>');
    console.log('       node fine-dust.js --station <측정소명>');
    console.log('\n예시:');
    console.log('  node fine-dust.js "서울 강남구"');
    console.log('  node fine-dust.js --station "강남대로"');
    process.exit(0);
  }

  let regionHint;
  let stationName;

  if (args[0] === '--station') {
    stationName = args[1];
  } else {
    regionHint = args.join(' ');
  }

  const result = await getDustReport(regionHint, stationName);

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(formatDustReport(result.report, result.candidates));
}

main().catch((/** @type {any} */ err) => {
  console.error(`[오류] ${err.message}`);
  process.exit(1);
});
