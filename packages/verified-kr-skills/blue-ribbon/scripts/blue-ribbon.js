#!/usr/bin/env node
'use strict';

const { searchNearbyByLocationQuery } = require('../lib/index');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node blue-ribbon.js <위치> [거리m] [개수]');
    console.log('\n예시:');
    console.log('  node blue-ribbon.js 광화문');
    console.log('  node blue-ribbon.js "서울 강남구" 2000 10');
    console.log('  node blue-ribbon.js "37.573713, 126.978338"');
    process.exit(0);
  }

  const location = args[0];
  const distanceMeters = parseInt(args[1], 10) || 1000;
  const limit = parseInt(args[2], 10) || 5;

  try {
    const result = await searchNearbyByLocationQuery(location, {
      distanceMeters,
      limit,
    });

    if (!result.items || result.items.length === 0) {
      console.log(`[정보] '${location}' 근처에 블루리본 맛집이 없습니다.`);
      return;
    }

    const anchor = result.anchor;
    if (anchor && anchor.zone2) {
      console.log(`검색 기준: ${anchor.zone1} ${anchor.zone2}\n`);
    }

    result.items.forEach((/** @type {any} */ item, /** @type {number} */ i) => {
      const ribbon = '🎀'.repeat(item.ribbonCount || 1);
      const parts = [`[${i + 1}] ${ribbon} ${item.name}`];
      if (item.category) parts.push(`    ${item.category}`);
      if (item.address) parts.push(`    ${item.address}`);
      if (item.distanceMeters != null) parts.push(`    ${item.distanceMeters}m`);
      console.log(parts.join('\n'));
      if (i < result.items.length - 1) console.log('');
    });
  } catch (/** @type {any} */ err) {
    console.error(`[오류] ${err.message}`);
    process.exit(1);
  }
}

main();
