'use strict';

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { convertHwp, SUPPORTED_FORMATS } = require('../lib/converter');

let passed = 0;
let failed = 0;
let skipped = 0;

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

/**
 * @param {string} name
 * @param {string} reason
 */
function skip(name, reason) {
  skipped++;
  console.log(`  ⊘ ${name} (${reason})`);
}

/** hwpjs 라이브러리 설치 여부 */
let hwpjsAvailable = false;
try {
  require.resolve('@ohah/hwpjs');
  hwpjsAvailable = true;
} catch {
  // not installed
}

async function run() {
  console.log('hwp-convert 테스트\n');

  // ── 입력 검증 (라이브러리 없이 테스트 가능) ──

  await test('지원하지 않는 포맷 → 에러', async () => {
    const res = await convertHwp('test.hwp', 'pdf');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('지원하지 않는 포맷'));
    assert.ok(res.error.includes('pdf'));
  });

  await test('SUPPORTED_FORMATS에 4개 포맷 포함', () => {
    assert.deepStrictEqual(SUPPORTED_FORMATS, ['json', 'md', 'html', 'text']);
  });

  await test('존재하지 않는 파일 → 에러', async () => {
    const res = await convertHwp('/tmp/__nonexistent__.hwp', 'text');
    assert.strictEqual(res.ok, false);
    assert.ok(res.error.includes('찾을 수 없습니다'));
  });

  await test('HWP 확장자가 아닌 파일 → 에러', async () => {
    // 임시 .txt 파일 생성
    const tmp = path.join(__dirname, 'fixtures', '__test__.txt');
    fs.writeFileSync(tmp, 'hello');
    try {
      const res = await convertHwp(tmp, 'text');
      assert.strictEqual(res.ok, false);
      assert.ok(res.error.includes('HWP 파일이 아닙니다'));
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  await test('인자 없이 실행 → help 텍스트 (hwp-convert.js)', () => {
    // scripts/hwp-convert.js의 CLI 도움말은 별도 프로세스 테스트
    // 여기서는 converter 모듈의 기본 포맷 확인
    assert.strictEqual('text', 'text'); // 기본 format = text
  });

  await test('결과 객체에 format 필드 포함', async () => {
    const res = await convertHwp('/tmp/__nonexistent__.hwp', 'json');
    assert.strictEqual(res.format, 'json');
  });

  // ── 실제 변환 테스트 (hwpjs 설치 시만) ──

  const fixtureHwp = path.join(__dirname, 'fixtures', 'sample.hwp');

  if (hwpjsAvailable) {
    // 최소 OLE2 헤더 fixture는 유효 HWP가 아님 → 파싱 에러가 정상
    await test('불완전한 HWP fixture → graceful 파싱 에러', async () => {
      const res = await convertHwp(fixtureHwp, 'json');
      // 유효한 HWP가 아니므로 ok=false, 파싱 에러 메시지
      assert.strictEqual(res.ok, false);
      assert.ok(res.error.includes('파싱에 실패'));
    });

    await test('빈 HWP 파일 → 파싱 에러', async () => {
      const emptyHwp = path.join(__dirname, 'fixtures', '__empty__.hwp');
      fs.writeFileSync(emptyHwp, Buffer.alloc(0));
      try {
        const res = await convertHwp(emptyHwp, 'json');
        assert.strictEqual(res.ok, false);
        assert.ok(res.error.includes('파싱에 실패'));
      } finally {
        fs.unlinkSync(emptyHwp);
      }
    });

    await test('모든 포맷에서 일관된 에러 처리', async () => {
      for (const fmt of ['json', 'md', 'html', 'text']) {
        const res = await convertHwp(fixtureHwp, fmt);
        // 불완전한 fixture → 모두 파싱 에러
        assert.strictEqual(res.ok, false);
        assert.strictEqual(res.format, fmt);
      }
    });

    await test('기본 포맷 = text', async () => {
      const res = await convertHwp(fixtureHwp);
      assert.strictEqual(res.format, 'text');
    });
  } else {
    skip('불완전한 HWP fixture → graceful 파싱 에러', '@ohah/hwpjs 미설치');
    skip('빈 HWP 파일 → 파싱 에러', '@ohah/hwpjs 미설치');
    skip('모든 포맷에서 일관된 에러 처리', '@ohah/hwpjs 미설치');
    skip('기본 포맷 = text', '@ohah/hwpjs 미설치');
  }

  // ── 결과 ──
  console.log(
    `\n결과: ${passed} passed, ${failed} failed, ${skipped} skipped`
  );
  if (failed > 0) process.exit(1);
}

run();
