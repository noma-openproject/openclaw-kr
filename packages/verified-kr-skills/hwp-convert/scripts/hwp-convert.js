#!/usr/bin/env node
'use strict';

const { convertHwp, SUPPORTED_FORMATS } = require('../lib/converter');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node hwp-convert.js <파일경로> [포맷]');
    console.log(`포맷: ${SUPPORTED_FORMATS.join(', ')} (기본: text)`);
    console.log('\n예시:');
    console.log('  node hwp-convert.js 보고서.hwp');
    console.log('  node hwp-convert.js 보고서.hwp md');
    console.log('  node hwp-convert.js 보고서.hwp json');
    process.exit(0);
  }

  const filePath = args[0];
  const format = args[1] || 'text';

  const result = await convertHwp(filePath, format);

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(result.output);
}

main().catch((/** @type {any} */ err) => {
  console.error(`[오류] ${err.message}`);
  process.exit(1);
});
