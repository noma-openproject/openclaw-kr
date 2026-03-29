#!/usr/bin/env node
'use strict';

const { requireEnv } = require('../../_shared/kr-skill-utils');
const { searchAddress } = require('../lib/api');
const { formatAddresses } = require('../lib/formatter');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node postal-code.js <검색어> [개수]');
    console.log('\n예시:');
    console.log('  node postal-code.js "세종대로 209"');
    console.log('  node postal-code.js "서울시청" 3');
    process.exit(0);
  }

  requireEnv(['JUSO_API_KEY']);

  const keyword = args[0];
  const count = Math.min(Math.max(parseInt(args[1], 10) || 5, 1), 20);

  const result = await searchAddress(keyword, count);

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(formatAddresses(result.results, result.keyword, result.totalCount));
}

main().catch((/** @type {any} */ err) => {
  console.error(`[오류] ${err.message}`);
  process.exit(1);
});
