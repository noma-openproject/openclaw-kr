'use strict';

const assert = require('node:assert');
const {
  searchTrains,
  parseScheduleHtml,
  mapSeatStatus,
  formatDate,
} = require('../lib/api');
const { getStationCode, getStationNames } = require('../lib/stations');
const { formatTrains } = require('../lib/formatter');

let passed = 0;
let failed = 0;

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (/** @type {any} */ err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function run() {
  console.log('srt-query 테스트\n');

  // ── stations ──

  await test('getStationCode: 수서 → 0551', () => {
    assert.strictEqual(getStationCode('수서'), '0551');
  });

  await test('getStationCode: 부산역 → 0020 (역 접미사 제거)', () => {
    assert.strictEqual(getStationCode('부산역'), '0020');
  });

  await test('getStationCode: 울산 → 0509', () => {
    assert.strictEqual(getStationCode('울산'), '0509');
  });

  await test('getStationCode: 알 수 없는 역 → null', () => {
    assert.strictEqual(getStationCode('서울'), null);
  });

  await test('getStationNames: 수서 포함', () => {
    const names = getStationNames();
    assert.ok(names.includes('수서'));
    assert.ok(names.includes('부산'));
    assert.ok(names.length >= 16);
  });

  // ── searchTrains 입력 검증 ──

  await test('출발역/도착역 없으면 에러', async () => {
    const res = await searchTrains('', '');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('출발역과 도착역'));
  });

  await test('잘못된 출발역 에러', async () => {
    const res = await searchTrains('서울', '부산');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('지원하지 않는 역'));
    assert.ok(res.error.includes('서울'));
  });

  await test('잘못된 도착역 에러', async () => {
    const res = await searchTrains('수서', '인천');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('지원하지 않는 역'));
    assert.ok(res.error.includes('인천'));
  });

  // ── parseScheduleHtml ──

  await test('parseScheduleHtml: 빈 HTML → 빈 배열', () => {
    const trains = parseScheduleHtml('');
    assert.deepStrictEqual(trains, []);
  });

  await test('parseScheduleHtml: 매칭 데이터 파싱', () => {
    const html = `
      trnNo = "301"
      dptTm = "060000"
      arvTm = "083200"
      gnrlRsvPsbStr = "예약가능"
      sprmRsvPsbStr = "매진"
    `;
    const trains = parseScheduleHtml(html);
    assert.strictEqual(trains.length, 1);
    assert.strictEqual(trains[0].trainNo, '301');
    assert.strictEqual(trains[0].depTime, '06:00');
    assert.strictEqual(trains[0].arrTime, '08:32');
    assert.ok(trains[0].duration.includes('2시간'));
    assert.ok(trains[0].generalSeat.includes('잔여 있음'));
    assert.ok(trains[0].specialSeat.includes('매진'));
  });

  // ── mapSeatStatus ──

  await test('mapSeatStatus: 예약가능 → ○', () => {
    assert.ok(mapSeatStatus('예약가능').includes('○'));
  });

  await test('mapSeatStatus: 매진 → ×', () => {
    assert.ok(mapSeatStatus('매진').includes('×'));
  });

  await test('mapSeatStatus: 빈 문자열 → 정보 없음', () => {
    assert.ok(mapSeatStatus('').includes('정보 없음'));
  });

  // ── formatDate ──

  await test('formatDate: 올바른 YYYYMMDD', () => {
    const d = new Date(2026, 2, 28); // March 28, 2026
    assert.strictEqual(formatDate(d), '20260328');
  });

  // ── formatTrains ──

  await test('formatTrains: 빈 배열 → [정보] 메시지', () => {
    const out = formatTrains([], '수서', '부산');
    assert.ok(out.includes('[정보]'));
    assert.ok(out.includes('운행하는 열차가 없습니다'));
  });

  await test('formatTrains: 열차 포맷팅', () => {
    const trains = [
      {
        trainNo: '301',
        depTime: '06:00',
        arrTime: '08:32',
        duration: '2시간 32분',
        generalSeat: '○ (잔여 있음)',
        specialSeat: '× (매진)',
      },
    ];
    const out = formatTrains(trains, '수서', '부산', '20260401');
    assert.ok(out.includes('수서 → 부산'));
    assert.ok(out.includes('SRT 301'));
    assert.ok(out.includes('06:00 → 08:32'));
    assert.ok(out.includes('일반실'));
    assert.ok(out.includes('특실'));
  });

  // ── 결과 ──
  console.log(`\n결과: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
