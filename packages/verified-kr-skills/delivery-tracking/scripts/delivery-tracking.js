#!/usr/bin/env node
'use strict';

const { trackDelivery } = require('../lib/api');
const { formatTracking } = require('../lib/formatter');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node delivery-tracking.js <택배사> <송장번호>');
    console.log('택배사: cj (CJ대한통운), epost (우체국)');
    console.log('\n예시:');
    console.log('  node delivery-tracking.js cj 1234567890');
    console.log('  node delivery-tracking.js epost 1234567890123');
    process.exit(0);
  }

  const result = await trackDelivery(args[0], args[1]);

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(formatTracking(result.result));
}

main().catch((/** @type {any} */ err) => {
  console.error(`[오류] ${err.message}`);
  process.exit(1);
});
