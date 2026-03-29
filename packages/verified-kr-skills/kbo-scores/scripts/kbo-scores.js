#!/usr/bin/env node
'use strict';

const { getGames } = require('../lib/api');
const { formatGames } = require('../lib/formatter');

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node kbo-scores.js [날짜] [팀명]');
    console.log('날짜: YYYY-MM-DD (기본: 오늘)');
    console.log('\n예시:');
    console.log('  node kbo-scores.js');
    console.log('  node kbo-scores.js 2026-03-28');
    console.log('  node kbo-scores.js 2026-03-28 삼성');
    process.exit(0);
  }

  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dateStr = args[0] || defaultDate;
  const teamFilter = args[1] || undefined;

  const result = await getGames(dateStr, teamFilter);

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(formatGames(result.games, result.date));
}

main().catch((/** @type {any} */ err) => {
  console.error(`[오류] ${err.message}`);
  process.exit(1);
});
