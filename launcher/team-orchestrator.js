// launcher/team-orchestrator.js
// Cheap Team Mini — Planner→Executor 자동 체이닝 오케스트레이터
const fs = require('fs');
const path = require('path');
const os = require('os');
const { validateToken, callChatCompletions } = require('./gateway-client');
const { saveHandoff } = require('./handoff-writer');

// 기본 설정 로드
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'team-config.json');
const USER_CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'team-config.json');

/**
 * @typedef {Object} RoleConfig
 * @property {string} model
 * @property {string} systemPrompt
 * @property {number} [timeoutMs]
 */

/**
 * @typedef {Object} TeamConfigType
 * @property {boolean} enabled
 * @property {{ planner: RoleConfig; executor: RoleConfig }} roles
 */

/**
 * Team 설정 로드 (사용자 오버라이드 > 기본값)
 * @returns {TeamConfigType}
 */
function loadTeamConfig() {
  try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(USER_CONFIG_PATH, 'utf8'));
    }
  } catch (/** @type {any} */ e) {
    console.warn(`[team] user config read error: ${e.message}, falling back to default`);
  }
  try {
    return JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8'));
  } catch (/** @type {any} */ e) {
    console.error(`[team] default config read error: ${e.message}`);
    return { enabled: false, roles: /** @type {any} */ ({}) };
  }
}

/**
 * Team 설정 저장 (사용자 config)
 * @param {object} config
 */
function saveTeamConfig(config) {
  const dir = path.dirname(USER_CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(USER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Planner→Executor 자동 체이닝 실행
 * @param {string} utterance - 사용자 원본 요청
 * @param {string} [userId] - 사용자 ID (세션 분리용)
 * @param {TeamConfigType} [configOverride] - 설정 오버라이드
 * @param {string} [source='desktop'] - 요청 소스 (desktop/kakao)
 * @returns {Promise<{ok: boolean, text: string, handoff?: object}>}
 */
async function orchestrate(utterance, userId, configOverride, source = 'desktop') {
  const config = configOverride || loadTeamConfig();
  const { planner, executor } = config.roles || {};

  if (!planner || !executor) {
    return { ok: false, text: 'Team 설정이 올바르지 않습니다. 역할 설정을 확인해 주세요.' };
  }

  // 토큰 검증
  const tokenCheck = validateToken();
  if (!tokenCheck.valid) {
    return { ok: false, text: '인증 토큰이 없습니다. 데스크톱 앱을 재시작해 주세요.' };
  }

  const startTime = Date.now();
  /** @type {any} */
  const handoffData = {
    timestamp: new Date().toISOString(),
    request: utterance,
    source,
  };

  // --- Step 1: Planner ---
  console.log(`[team] Step 1: Planner (${planner.model})`);
  const plannerStart = Date.now();
  const plannerResult = await callChatCompletions({
    messages: [
      { role: 'system', content: planner.systemPrompt },
      { role: 'user', content: utterance },
    ],
    model: planner.model,
    user: userId ? `team-planner:${userId}` : undefined,
    timeoutMs: planner.timeoutMs || 15000,
    logPrefix: 'team:planner',
  });
  const plannerElapsed = Date.now() - plannerStart;

  handoffData.planner = {
    model: planner.model.split('/').pop(),
    provider: planner.model.split('/')[0],
    content: plannerResult.text,
    usage: plannerResult.usage || { input: 0, output: 0, totalTokens: 0 },
    cost: _estimateCost(plannerResult.usage, planner.model),
    elapsedMs: plannerElapsed,
  };

  if (!plannerResult.ok) {
    console.error(`[team] Planner failed: ${plannerResult.text}`);
    handoffData.executor = null;
    handoffData.totalCost = handoffData.planner.cost.total;
    handoffData.totalTokens = handoffData.planner.usage?.totalTokens || 0;
    handoffData.totalElapsedMs = plannerElapsed;

    // Handoff 저장 (실패 기록도 보존)
    const saved = await saveHandoff(handoffData);
    return {
      ok: false,
      text: `계획 수립 실패: ${plannerResult.text}`,
      handoff: saved,
    };
  }

  console.log(`[team] Planner done in ${plannerElapsed}ms`);

  // --- Step 2: Executor ---
  const executorPrompt = executor.systemPrompt
    .replace('{plan}', plannerResult.text)
    .replace('{request}', utterance);

  console.log(`[team] Step 2: Executor (${executor.model})`);
  const executorStart = Date.now();
  const executorResult = await callChatCompletions({
    messages: [
      { role: 'system', content: executorPrompt },
      { role: 'user', content: utterance },
    ],
    model: executor.model,
    user: userId ? `team-executor:${userId}` : undefined,
    timeoutMs: executor.timeoutMs || 55000,
    logPrefix: 'team:executor',
  });
  const executorElapsed = Date.now() - executorStart;

  handoffData.executor = {
    model: executor.model.split('/').pop(),
    provider: executor.model.split('/')[0],
    content: executorResult.text,
    usage: executorResult.usage || { input: 0, output: 0, totalTokens: 0 },
    cost: _estimateCost(executorResult.usage, executor.model),
    elapsedMs: executorElapsed,
  };

  const totalElapsed = Date.now() - startTime;
  handoffData.totalCost =
    (handoffData.planner.cost?.total || 0) + (handoffData.executor.cost?.total || 0);
  handoffData.totalTokens =
    (handoffData.planner.usage?.totalTokens || 0) +
    (handoffData.executor.usage?.totalTokens || 0);
  handoffData.totalElapsedMs = totalElapsed;

  console.log(
    `[team] Done in ${totalElapsed}ms (planner: ${plannerElapsed}ms, executor: ${executorElapsed}ms)`,
  );

  // --- Step 3: Handoff 저장 ---
  const saved = await saveHandoff(handoffData);

  return {
    ok: executorResult.ok,
    text: executorResult.text,
    handoff: saved,
  };
}

/**
 * 토큰 사용량에서 비용 추정 (근사치)
 * @param {any} usage
 * @param {string} model
 * @returns {{ total: number }}
 */
function _estimateCost(usage, model) {
  if (!usage) return { total: 0 };

  // 모델별 대략적인 가격 (USD per 1M tokens)
  /** @type {Record<string, {input: number, output: number}>} */
  const pricing = {
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-5.4': { input: 2.5, output: 10 },
    'gpt-4o': { input: 2.5, output: 10 },
  };

  const modelName = model.split('/').pop() || '';
  const price = pricing[modelName] || { input: 1, output: 3 };
  const inputCost = ((usage.input || 0) / 1_000_000) * price.input;
  const outputCost = ((usage.output || 0) / 1_000_000) * price.output;

  return { total: inputCost + outputCost };
}

module.exports = {
  loadTeamConfig,
  saveTeamConfig,
  orchestrate,
  // 테스트용
  _estimateCost,
};
