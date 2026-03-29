// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * openclaw-kr Playwright 설정
 * 용도: Electron launcher 시각 검증 (섹션 19-9 라운드트립 패턴)
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev:ui',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    {
      name: 'electron',
      testMatch: ['**/launcher-smoke.spec.js'],
      // TODO(openclaw-kr): Electron 앱 직접 테스트 설정 (Phase 1)
      use: {
        browserName: 'chromium',
        baseURL: 'http://localhost:18789',
      },
    },
    {
      name: 'receipt-ui',
      testMatch: ['**/receipt-ui.spec.js'],
      use: {
        browserName: 'chromium',
        baseURL: 'http://localhost:5173',
        viewport: { width: 320, height: 800 },
      },
    },
  ],
});
