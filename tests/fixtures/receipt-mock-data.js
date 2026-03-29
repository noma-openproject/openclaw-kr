// tests/fixtures/receipt-mock-data.js
// Receipt UI Playwright 테스트용 모크 데이터 (직렬화 가능한 순수 데이터만)
// addInitScript로 전달되므로 함수를 포함하면 안 됨
// OpenClawKRApi 인터페이스 (launcher/ui/src/types/receipt.ts) 준수

/**
 * ExecutionReceipt 기본값 + 덮어쓰기
 * @param {object} overrides
 * @returns {object}
 */
function makeReceipt(overrides = {}) {
  return {
    id: 'r-001',
    sessionId: 'sess-abc',
    timestamp: '2026-03-28T12:00:00.000Z',
    state: 'finished',
    model: 'gpt-5.4',
    provider: 'openai-codex',
    usage: { input: 9477, output: 48, cacheRead: 0, cacheWrite: 0, totalTokens: 9525 },
    cost: { input: 0.009477, output: 0.00144, cacheRead: 0, cacheWrite: 0, total: 0.010917 },
    elapsedMs: 8200,
    ...overrides,
  };
}

/**
 * SessionCostSummary 기본값 + 덮어쓰기
 * @param {object} overrides
 * @returns {object}
 */
function makeCostSummary(overrides = {}) {
  return {
    sessionId: 'sess-abc',
    totalReceipts: 0,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    currentModel: 'gpt-5.4',
    currentProvider: 'openai-codex',
    ...overrides,
  };
}

// --- 8개 상태별 Fixture (순수 데이터) ---
// 각 fixture는 { history, sessionCost, currentState } 구조

const CONNECTED_EMPTY = {
  history: [],
  sessionCost: makeCostSummary(),
  currentState: { state: 'idle', model: 'gpt-5.4', provider: 'openai-codex' },
};

const RUNNING = {
  history: [makeReceipt({ id: 'r-run', state: 'running', elapsedMs: 1200, cost: { input: 0.002, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.002 } })],
  sessionCost: makeCostSummary({ totalReceipts: 1, usage: { input: 2000, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 2000 }, cost: { input: 0.002, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.002 } }),
  currentState: { state: 'running', model: 'gpt-5.4', provider: 'openai-codex' },
};

const FINISHED = {
  history: [makeReceipt({ id: 'r-fin', state: 'finished' })],
  sessionCost: makeCostSummary({ totalReceipts: 1, usage: { input: 9477, output: 48, cacheRead: 0, cacheWrite: 0, totalTokens: 9525 }, cost: { input: 0.009477, output: 0.00144, cacheRead: 0, cacheWrite: 0, total: 0.010917 } }),
  currentState: { state: 'finished', model: 'gpt-5.4', provider: 'openai-codex' },
};

const FAILED = {
  history: [makeReceipt({ id: 'r-fail', state: 'failed', errorMessage: 'Connection reset by peer' })],
  sessionCost: makeCostSummary({ totalReceipts: 1, usage: { input: 5000, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 5000 }, cost: { input: 0.005, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.005 } }),
  currentState: { state: 'failed', model: 'gpt-5.4', provider: 'openai-codex' },
};

const HISTORY_LIST = {
  history: [
    makeReceipt({ id: 'r-h1', state: 'finished', elapsedMs: 8200 }),
    makeReceipt({ id: 'r-h2', state: 'finished', elapsedMs: 3100, model: 'gpt-5.4-mini' }),
    makeReceipt({ id: 'r-h3', state: 'failed', elapsedMs: 12000, errorMessage: 'Timeout' }),
    makeReceipt({ id: 'r-h4', state: 'finished', elapsedMs: 950, cost: { input: 0.0005, output: 0.0001, cacheRead: 0, cacheWrite: 0, total: 0.0006 } }),
  ],
  sessionCost: makeCostSummary({ totalReceipts: 4, usage: { input: 25000, output: 200, cacheRead: 1500, cacheWrite: 500, totalTokens: 27200 }, cost: { input: 0.025, output: 0.006, cacheRead: 0.00075, cacheWrite: 0, total: 0.03175 } }),
  currentState: { state: 'idle', model: 'gpt-5.4', provider: 'openai-codex' },
};

const COST_SUMMARY = {
  history: [makeReceipt({ id: 'r-cs1', state: 'finished' })],
  sessionCost: makeCostSummary({
    totalReceipts: 5,
    usage: { input: 47000, output: 1200, cacheRead: 8000, cacheWrite: 2000, totalTokens: 58200 },
    cost: { input: 0.047, output: 0.036, cacheRead: 0.004, cacheWrite: 0, total: 0.087 },
  }),
  currentState: { state: 'idle', model: 'gpt-5.4', provider: 'openai-codex' },
};

const TOKEN_METER = {
  history: [makeReceipt({
    id: 'r-tm',
    state: 'finished',
    usage: { input: 5000, output: 2000, cacheRead: 3000, cacheWrite: 0, totalTokens: 10000 },
    cost: { input: 0.005, output: 0.006, cacheRead: 0.0015, cacheWrite: 0, total: 0.0125 },
  })],
  sessionCost: makeCostSummary({ totalReceipts: 1 }),
  currentState: { state: 'finished', model: 'gpt-5.4', provider: 'openai-codex' },
};

module.exports = {
  makeReceipt,
  makeCostSummary,
  CONNECTED_EMPTY,
  RUNNING,
  FINISHED,
  FAILED,
  HISTORY_LIST,
  COST_SUMMARY,
  TOKEN_METER,
};
