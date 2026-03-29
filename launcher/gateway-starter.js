// launcher/gateway-starter.js
// OpenClaw gateway 프로세스 자동시작 + lifecycle 관리
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const GATEWAY_PORT = 18789;
const HEALTH_CHECK_INTERVAL_MS = 1500;
const HEALTH_CHECK_TIMEOUT_MS = 60000;
const RESTART_DELAY_MS = 3000;
const MAX_RESTART_COUNT = 2;
const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 12;

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
 * 시스템에 설치된 Node.js 바이너리 탐지
 * Electron 33 내장 Node는 20.18 → openclaw은 22.12+ 필요 → 시스템 Node 사용
 * @returns {string|null} node 바이너리 경로 또는 null
 */
function resolveNodeBin() {
  const cmd = process.platform === 'win32' ? 'where node' : 'which node';
  try {
    const nodePath = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
    // Windows의 where는 여러 줄 반환할 수 있음 — 첫 번째만
    const firstPath = nodePath.split(/\r?\n/)[0].trim();
    if (!firstPath) return null;

    // 버전 확인
    const versionStr = execSync(`"${firstPath}" --version`, {
      encoding: 'utf8',
      timeout: 5000,
    }).trim(); // "v22.14.0"
    const match = versionStr.match(/^v(\d+)\.(\d+)/);
    if (!match) return null;

    const major = Number(match[1]);
    const minor = Number(match[2]);
    if (major > MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor >= MIN_NODE_MINOR)) {
      console.log(`[gateway-starter] 시스템 Node 발견: ${firstPath} (${versionStr})`);
      return firstPath;
    }

    console.warn(
      `[gateway-starter] 시스템 Node ${versionStr} < 요구 v${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}`,
    );
    return null;
  } catch {
    console.warn('[gateway-starter] 시스템 Node를 찾을 수 없습니다');
    return null;
  }
}

/**
 * ~/.openclaw/ 디렉토리 + 기본 설정 파일 자동 생성 (첫 실행용)
 */
function ensureConfig() {
  const configDir = path.join(os.homedir(), '.openclaw');
  const configPath = path.join(configDir, 'openclaw.json');

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
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    console.log('[gateway-starter] 기본 설정 파일 생성: ~/.openclaw/openclaw.json');
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

  // 시스템 Node 탐지 (Electron 33 내장 Node 20.18 < openclaw 요구 22.12+)
  const nodeBin = resolveNodeBin();

  if (!nodeBin) {
    startupStatus = 'failed';
    lastError =
      'Node.js 22.12 이상이 필요합니다. https://nodejs.org 에서 설치해주세요.';
    console.error(`[gateway-starter] ${lastError}`);
    return false;
  }

  console.log(`[gateway-starter] Gateway 시작: ${nodeBin} ${binPath}`);

  try {
    gatewayProcess = spawn(nodeBin, [binPath, 'gateway', '--port', String(GATEWAY_PORT)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env },
    });

    // stdout/stderr 로그 수집
    if (gatewayProcess.stdout) {
      gatewayProcess.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[gateway] ${msg}`);
      });
    }

    if (gatewayProcess.stderr) {
      gatewayProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) {
          console.error(`[gateway:err] ${msg}`);
          lastError = msg;
        }
      });
    }

    gatewayProcess.on('exit', (code) => {
      console.log(`[gateway-starter] Gateway 프로세스 종료 (code: ${code})`);
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
  resolveNodeBin,
  ensureConfig,
  checkHealth,
  waitForGateway,
  startGateway,
  stopGateway,
  getStartupStatus,
  GATEWAY_PORT,
};
