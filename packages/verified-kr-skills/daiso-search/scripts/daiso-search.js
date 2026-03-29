#!/usr/bin/env node
'use strict';

const { lookupStoreProductAvailability, searchStores, searchProducts } = require('../lib/index');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
    console.log('사용법: node daiso-search.js <매장명> <상품검색어>');
    console.log('\n예시:');
    console.log('  node daiso-search.js 강남역2호점 리들샷');
    console.log('  node daiso-search.js "명동점" "마스크팩"');
    process.exit(0);
  }

  const storeName = args[0];
  const productKeyword = args.slice(1).join(' ');

  try {
    const result = await lookupStoreProductAvailability(storeName, productKeyword);

    if (!result.items || result.items.length === 0) {
      console.log(`[정보] '${storeName}'에서 '${productKeyword}' 검색 결과가 없습니다.`);
      return;
    }

    if (result.store) {
      console.log(`매장: ${result.store.name || storeName}\n`);
    }

    result.items.forEach((/** @type {any} */ item, /** @type {number} */ i) => {
      const parts = [`[${i + 1}] ${item.name || item.goodsNm || ''}`];
      if (item.price != null) parts.push(`    가격: ${item.price}원`);
      if (item.stock != null) parts.push(`    재고: ${item.stock}`);
      if (item.available != null) parts.push(`    매장픽업: ${item.available ? '가능' : '불가'}`);
      console.log(parts.join('\n'));
      if (i < result.items.length - 1) console.log('');
    });
  } catch (/** @type {any} */ err) {
    console.error(`[오류] ${err.message}`);
    process.exit(1);
  }
}

main();
