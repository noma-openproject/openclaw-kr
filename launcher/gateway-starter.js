// launcher/gateway-starter.js
// OpenClaw gateway 프로세스 자동시작 + lifecycle 관리
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const GATEWAY_PORT = 18789;
const HEALTH_CHECK_INTERVAL_MS = 1500;
const HEALTH_CHECK_TIMEOUT_MS = 60000;
const RESTART_DELAY_MS = 3000;
const MAX_RESTART_COUNT = 2;

// Gateway 로그 파일 경로 (~/.openclaw/gateway.log)
const LOG_PATH = path.join(os.homedir(), '.openclaw', 'gateway.log');
const MAX_LOG_BYTES = 512 * 1024; // 512KB 초과 시 초기화

/**
 * Gateway 로그를 파일에 기록
 * @param {string} line
 */
function writeLog(line) {
  try {
    const logDir = path.dirname(LOG_PATH);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    // 파일 크기 초과 시 초기화
    try {
      if (fs.statSync(LOG_PATH).size > MAX_LOG_BYTES) {
        fs.writeFileSync(LOG_PATH, '', 'utf8');
      }
    } catch { /* 파일 없으면 무시 */ }
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${line}\n`, 'utf8');
  } catch { /* 로그 실패는 무시 */ }
}

/** @type {import('child_process').ChildProcess | null} */
let gatewayProcess = null;
let restartCount = 0;
/** @type {'idle' | 'starting' | 'running' | 'failed'} */
let startupStatus = 'idle';
/** @type {string} */
let lastError = '';

/**
 * openclaw.mjs 바이너리 경로 해결
 * - dev 모드: node_modules/openclaw/openclaw.mjs
 * - packaged 모드: app.asar.unpacked/node_modules/openclaw/openclaw.mjs
 * @returns {string}
 */
function resolveGatewayBin() {
  // electron app.isPackaged 체크 — Electron 없이 테스트할 때도 동작
  let isPackaged = false;
  try {
    // eslint-disable-next-line no-undef
    const { app } = require('electron');
    isPackaged = app.isPackaged;
  } catch {
    // Electron 없는 환경 (테스트)
  }

  if (isPackaged) {
    return path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      'openclaw',
      'openclaw.mjs',
    );
  }
  return path.join(__dirname, '..', 'node_modules', 'openclaw', 'openclaw.mjs');
}

/**
 * ~/.openclaw/ 디렉토리 + 기본 설정 파일 자동 생성 (첫 실행용)
 */
/**
 * 번들된 kakao-talkchannel 플러그인 경로 해결
 * @returns {string}
 */
function resolvePluginPath() {
  let isPackaged = false;
  try {
    const { app } = require('electron');
    isPackaged = app.isPackaged;
  } catch { /* Electron 없는 환경 */ }

  if (isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'plugins', 'kakao-talkchannel');
  }
  return path.join(__dirname, '..', 'plugins', 'kakao-talkchannel');
}

function ensureConfig() {
  const configDir = path.join(os.homedir(), '.openclaw');
  const configPath = path.join(configDir, 'openclaw.json');
  const pluginPath = resolvePluginPath();

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log('[gateway-starter] ~/.openclaw/ 디렉토리 생성');
  }

  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      gateway: {
        mode: 'local',
        port: GATEWAY_PORT,
      },
      channels: {
        'kakao-talkchannel': {
          accounts: {
            default: {
              enabled: true,
              dmPolicy: 'pairing',
              relayUrl: 'https://kakao-talkchannel-relay-660864689462.asia-northeast3.run.app',
            },
          },
        },
      },
      plugins: {
        allow: ['kakao-talkchannel'],
        load: { paths: [pluginPath] },
        entries: { 'kakao-talkchannel': { enabled: true } },
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    console.log('[gateway-starter] 기본 설정 파일 생성: ~/.openclaw/openclaw.json');
  } else {
    // 기존 config 마이그레이션: 카카오 채널 + 플러그인 경로
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      let changed = false;

      // 카카오 채널 설정 없으면 추가
      if (!config.channels?.['kakao-talkchannel']) {
        config.channels = config.channels || {};
        config.channels['kakao-talkchannel'] = {
          accounts: {
            default: {
              enabled: true,
              dmPolicy: 'pairing',
              relayUrl: 'https://kakao-talkchannel-relay-660864689462.asia-northeast3.run.app',
            },
          },
        };
        changed = true;
      }

      // plugins.allow에 kakao-talkchannel 추가
      if (!config.plugins?.allow?.includes?.('kakao-talkchannel')) {
        config.plugins = config.plugins || {};
        config.plugins.allow = config.plugins.allow || [];
        if (!config.plugins.allow.includes('kakao-talkchannel')) {
          config.plugins.allow.push('kakao-talkchannel');
          changed = true;
        }
      }

      // /tmp/ 경로 → 번들 경로로 마이그레이션
      const paths = config.plugins?.load?.paths || [];
      const tmpIdx = paths.findIndex((/** @type {string} */ p) => p.includes('/tmp/openclaw-kakao-talkchannel'));
      if (tmpIdx !== -1) {
        paths[tmpIdx] = pluginPath;
        changed = true;
        console.log(`[gateway-starter] 플러그인 경로 마이그레이션: /tmp/... → ${pluginPath}`);
      } else if (!paths.some((/** @type {string} */ p) => p.includes('kakao-talkchannel'))) {
        // 카카오 플러그인 경로가 아예 없으면 추가
        config.plugins = config.plugins || {};
        config.plugins.load = config.plugins.load || {};
        config.plugins.load.paths = config.plugins.load.paths || [];
        config.plugins.load.paths.push(pluginPath);
        changed = true;
      }

      // plugins.entries 확인
      if (!config.plugins?.entries?.['kakao-talkchannel']) {
        config.plugins = config.plugins || {};
        config.plugins.entries = config.plugins.entries || {};
        config.plugins.entries['kakao-talkchannel'] = { enabled: true };
        changed = true;
      }

      // stale installs 정리 (/tmp 경로 제거)
      if (config.plugins?.installs?.['kakao-talkchannel']?.installPath?.includes('/tmp/')) {
        delete config.plugins.installs['kakao-talkchannel'];
        if (Object.keys(config.plugins.installs).length === 0) {
          delete config.plugins.installs;
        }
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
        console.log('[gateway-starter] config 마이그레이션 완료');
      }
    } catch { /* config 파싱 실패 시 무시 */ }
  }
}

/**
 * localhost:GATEWAY_PORT 헬스체크 1회
 * @returns {Promise<boolean>}
 */
function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      `http://localhost:${GATEWAY_PORT}/health`,
      { timeout: 3000 },
      (res) => {
        resolve((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 400);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Gateway가 응답할 때까지 폴링
 * @param {number} [timeoutMs] - 최대 대기 시간
 * @returns {Promise<boolean>}
 */
function waitForGateway(timeoutMs = HEALTH_CHECK_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now();

    const poll = async () => {
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }
      const ok = await checkHealth();
      if (ok) {
        resolve(true);
        return;
      }
      setTimeout(poll, HEALTH_CHECK_INTERVAL_MS);
    };
    poll();
  });
}

/**
 * Gateway 프로세스 시작
 * Electron 35+ 내장 Node.js 22.15 사용 (ELECTRON_RUN_AS_NODE=1)
 * @returns {Promise<boolean>} - gateway 시작 성공 여부
 */
async function startGateway() {
  // 이미 실행 중이면 헬스체크만
  const alreadyRunning = await checkHealth();
  if (alreadyRunning) {
    startupStatus = 'running';
    console.log('[gateway-starter] Gateway 이미 실행 중');
    return true;
  }

  startupStatus = 'starting';
  const binPath = resolveGatewayBin();

  if (!fs.existsSync(binPath)) {
    startupStatus = 'failed';
    lastError = `openclaw 바이너리를 찾을 수 없습니다: ${binPath}`;
    console.error(`[gateway-starter] ${lastError}`);
    return false;
  }

  writeLog(`Gateway 시작: ${binPath}`);
  writeLog(`Node: ${process.version}, execPath: ${process.execPath}`);
  console.log(`[gateway-starter] Gateway 시작: ${binPath}`);

  try {
    gatewayProcess = spawn(process.execPath, [binPath, 'gateway', '--port', String(GATEWAY_PORT)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });

    // stdout/stderr 로그 수집
    if (gatewayProcess.stdout) {
      gatewayProcess.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) {
          console.log(`[gateway] ${msg}`);
          writeLog(`[stdout] ${msg}`);
        }
      });
    }

    if (gatewayProcess.stderr) {
      gatewayProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) {
          console.error(`[gateway:err] ${msg}`);
          writeLog(`[stderr] ${msg}`);
          lastError = msg;
        }
      });
    }

    gatewayProcess.on('exit', (code) => {
      const msg = `Gateway 프로세스 종료 (code: ${code})`;
      console.log(`[gateway-starter] ${msg}`);
      writeLog(msg);
      gatewayProcess = null;

      if (startupStatus === 'running' && restartCount < MAX_RESTART_COUNT) {
        restartCount++;
        console.log(`[gateway-starter] 자동 재시작 시도 (${restartCount}/${MAX_RESTART_COUNT})`);
        setTimeout(() => startGateway(), RESTART_DELAY_MS);
      } else if (startupStatus !== 'idle') {
        startupStatus = 'failed';
      }
    });

    // Gateway 준비 대기
    const ready = await waitForGateway();
    if (ready) {
      startupStatus = 'running';
      restartCount = 0;
      console.log('[gateway-starter] Gateway 시작 완료');
      return true;
    }

    startupStatus = 'failed';
    lastError = lastError || 'Gateway가 제한 시간 내에 응답하지 않았습니다';
    console.error(`[gateway-starter] ${lastError}`);
    writeLog(`[FAIL] ${lastError}`);
    return false;
  } catch (/** @type {any} */ err) {
    startupStatus = 'failed';
    lastError = err.message;
    console.error(`[gateway-starter] Gateway 시작 실패: ${err.message}`);
    return false;
  }
}

/**
 * Gateway 프로세스 정리
 */
function stopGateway() {
  startupStatus = 'idle';
  if (gatewayProcess) {
    try {
      gatewayProcess.kill('SIGTERM');
      console.log('[gateway-starter] Gateway 프로세스 종료 요청');
    } catch {
      // 이미 종료됨
    }
    gatewayProcess = null;
  }
}

/**
 * 현재 시작 상태 조회
 * @returns {{ status: string, error: string }}
 */
function getStartupStatus() {
  return { status: startupStatus, error: lastError };
}

module.exports = {
  resolveGatewayBin,
  ensureConfig,
  checkHealth,
  waitForGateway,
  startGateway,
  stopGateway,
  getStartupStatus,
  GATEWAY_PORT,
  LOG_PATH,
};
