// test/onboarding.test.js
// 온보딩 상태 관리 테스트
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push(`  ✅ ${passed + failed}. ${name}`);
  } catch (/** @type {any} */ err) {
    failed++;
    results.push(`  ❌ ${passed + failed}. ${name}`);
    results.push(`     ${err.message}`);
  }
}

// 온보딩 로직을 main.js에서 분리하지 않았으므로, 파일 기반 로직을 직접 테스트
const tmpHome = path.join(os.tmpdir(), `noma-onboarding-test-${Date.now()}`);
fs.mkdirSync(tmpHome, { recursive: true });

const ONBOARDING_FLAG = path.join(tmpHome, '.openclaw', 'onboarding-done');

function isOnboardingDone() {
  return fs.existsSync(ONBOARDING_FLAG);
}

function completeOnboarding() {
  const dir = path.dirname(ONBOARDING_FLAG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ONBOARDING_FLAG, new Date().toISOString(), 'utf8');
}

// --- 테스트 ---

test('온보딩 파일 미존재 → isDone = false', () => {
  assert.strictEqual(isOnboardingDone(), false);
});

test('completeOnboarding → 디렉토리와 파일 생성', () => {
  completeOnboarding();
  assert.ok(fs.existsSync(path.join(tmpHome, '.openclaw')), '.openclaw 디렉토리 존재');
  assert.ok(fs.existsSync(ONBOARDING_FLAG), 'onboarding-done 파일 존재');
});

test('온보딩 파일 존재 → isDone = true', () => {
  assert.strictEqual(isOnboardingDone(), true);
});

test('온보딩 파일 내용 = ISO 날짜 문자열', () => {
  const content = fs.readFileSync(ONBOARDING_FLAG, 'utf8');
  const date = new Date(content);
  assert.ok(!isNaN(date.getTime()), `유효한 날짜: ${content}`);
});

test('중복 complete 호출 → 에러 없음', () => {
  completeOnboarding();
  assert.strictEqual(isOnboardingDone(), true);
});

test('onboarding.html 파일 존재', () => {
  const htmlPath = path.join(__dirname, '..', 'launcher', 'onboarding.html');
  assert.ok(fs.existsSync(htmlPath), 'onboarding.html 존재');
});

test('onboarding.html에 샘플 3개 포함', () => {
  const htmlPath = path.join(__dirname, '..', 'launcher', 'onboarding.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.includes('로또'), '로또 샘플 포함');
  assert.ok(html.includes('KBO'), 'KBO 샘플 포함');
  assert.ok(html.includes('미세먼지'), '미세먼지 샘플 포함');
});

test('onboarding.html에 시작하기 버튼 포함', () => {
  const htmlPath = path.join(__dirname, '..', 'launcher', 'onboarding.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.includes('시작하기'), '시작하기 버튼 포함');
});

// cleanup
fs.rmSync(tmpHome, { recursive: true, force: true });

// 결과
console.log('\n온보딩 테스트');
results.forEach((r) => console.log(r));
console.log(`\n결과: ${passed} passed, ${failed} failed (총 ${passed + failed})`);
if (failed > 0) process.exit(1);
