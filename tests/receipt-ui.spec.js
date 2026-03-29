// @ts-check
// tests/receipt-ui.spec.js
// Receipt UI Playwright 시각 검증 — 8개 상태 커버
// Vite dev server (localhost:5173)에서 window.openclawKR 모크 주입 후 스크린샷 캡처
const { test, expect } = require('@playwright/test');
const {
  CONNECTED_EMPTY,
  RUNNING,
  FINISHED,
  FAILED,
  HISTORY_LIST,
  COST_SUMMARY,
  TOKEN_METER,
} = require('./fixtures/receipt-mock-data');

const SCREENSHOT_DIR = 'tests/screenshots';

// --- Helper: addInitScript에서 직렬화 가능 데이터 → 함수 포함 API로 변환 ---
// addInitScript 파라미터는 JSON 직렬화되므로 함수를 포함할 수 없음
// 데이터만 전달하고, 브라우저 컨텍스트 내부에서 함수를 래핑
async function injectMockApi(page, fixtureData) {
  await page.addInitScript((data) => {
    window.openclawKR = {
      version: '0.1.0-alpha-mock',
      getStatus: async () => ({ online: true, port: 18789 }),
      receipts: {
        getHistory: async () => data.history,
        getSessionCost: async () => data.sessionCost,
        getCurrentState: async () => data.currentState,
        onUpdate: () => () => {},
      },
    };
  }, fixtureData);
}

// --- Console error 수집 ---
/** @type {string[]} */
let consoleErrors = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
});

test.afterEach(async () => {
  expect(consoleErrors, 'console errors should be empty').toEqual([]);
});

// --- 테스트 케이스 ---

test('1. disconnected — 🦞 로딩 화면', async ({ page }) => {
  // 모크 주입 없음 → window.openclawKR = undefined → connected=false
  await page.goto('/');
  await page.waitForSelector('text=연결 대기 중');
  await expect(page.locator('text=🦞')).toBeVisible();
  await expect(page.locator('text=OpenClaw gateway에 연결 대기 중')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/receipt-disconnected.png` });
});

test('2. connected-empty — 실행 기록 없음', async ({ page }) => {
  await injectMockApi(page, CONNECTED_EMPTY);
  await page.goto('/');
  await page.waitForSelector('text=실행 영수증');
  await expect(page.locator('text=아직 실행 기록이 없습니다')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/receipt-connected-empty.png` });
});

test('3. running — 파란 점 + 현재 실행', async ({ page }) => {
  await injectMockApi(page, RUNNING);
  await page.goto('/');
  await page.waitForSelector('text=실행 영수증');
  await expect(page.locator('text=running').first()).toBeVisible();
  await expect(page.locator('text=현재 실행')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/receipt-running.png` });
});

test('4. finished — 초록 점 + 비용 표시', async ({ page }) => {
  await injectMockApi(page, FINISHED);
  await page.goto('/');
  await page.waitForSelector('text=실행 영수증');
  await expect(page.locator('text=finished').first()).toBeVisible();
  await expect(page.locator('text=마지막 실행')).toBeVisible();
  // 비용이 표시되어야 함
  await expect(page.locator('text=$').first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/receipt-finished.png` });
});

test('5. failed — 빨간 점 + 에러 메시지', async ({ page }) => {
  await injectMockApi(page, FAILED);
  await page.goto('/');
  await page.waitForSelector('text=실행 영수증');
  await expect(page.locator('text=failed').first()).toBeVisible();
  await expect(page.locator('text=Connection reset by peer')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/receipt-failed.png` });
});

test('6. history-list — compact 카드 목록', async ({ page }) => {
  await injectMockApi(page, HISTORY_LIST);
  await page.goto('/');
  await page.waitForSelector('text=실행 영수증');
  await expect(page.locator('text=최근 실행')).toBeVisible();
  const historyItems = page.locator('text=gpt-5.4');
  await expect(historyItems.first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/receipt-history-list.png` });
});

test('7. cost-summary — 비용 테이블', async ({ page }) => {
  await injectMockApi(page, COST_SUMMARY);
  await page.goto('/');
  await page.waitForSelector('text=실행 영수증');
  await expect(page.locator('text=Input')).toBeVisible();
  await expect(page.locator('text=Output')).toBeVisible();
  await expect(page.locator('text=Total')).toBeVisible();
  await expect(page.locator('text=5 executions')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/receipt-cost-summary.png` });
});

test('8. token-meter — 3색 세그먼트 바', async ({ page }) => {
  await injectMockApi(page, TOKEN_METER);
  await page.goto('/');
  await page.waitForSelector('text=실행 영수증');
  await expect(page.locator('text=10,000')).toBeVisible();
  await expect(page.locator('text=in:')).toBeVisible();
  await expect(page.locator('text=out:')).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/receipt-token-meter.png` });
});
