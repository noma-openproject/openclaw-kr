// openclaw-kr Electron thin launcher
// OpenClaw dashboard(localhost:18789)를 데스크톱 앱으로 감싸는 launcher
// Phase 1-B: BrowserView dual 구조 (dashboard + receipt panel)
const { app, BrowserWindow, BrowserView, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { SessionWatcher } = require('./session-watcher');
const { loadTeamConfig, saveTeamConfig } = require('./team-orchestrator');
const { listHandoffs, readHandoff } = require('./handoff-writer');
const { ChannelRegistry } = require('./channel-registry');
const {
  ensureConfig,
  startGateway,
  stopGateway,
  getStartupStatus,
} = require('./gateway-starter');

const DASHBOARD_PORT = 18789;
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;
const RECEIPT_PANEL_WIDTH = 320;

// --- Browser Guard: URL 필터링 ---
const BLOCKED_PROTOCOLS = ['chrome:', 'chrome-extension:', 'data:', 'javascript:'];
const ALLOWED_ORIGINS = new Set([
  `http://127.0.0.1:${DASHBOARD_PORT}`,
  `http://localhost:${DASHBOARD_PORT}`,
]);

/**
 * Browser Guard: 허용된 URL인지 확인
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedUrl(url) {
  // 로컬 파일 (fallback.html 등)
  if (url.startsWith('file://') && url.includes('/launcher/')) return true;
  // 차단 프로토콜
  for (const proto of BLOCKED_PROTOCOLS) {
    if (url.startsWith(proto)) return false;
  }
  // 허용 origin
  try {
    const parsed = new URL(url);
    const origin = `${parsed.protocol}//${parsed.host}`;
    return ALLOWED_ORIGINS.has(origin);
  } catch {
    return false;
  }
}

// --- Session Watcher ---
const watcher = new SessionWatcher();
const channelRegistry = new ChannelRegistry();

// --- Gateway 토큰 읽기 ---
function readGatewayToken() {
  const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config?.gateway?.auth?.token || '';
  } catch {
    return '';
  }
}

// --- IPC: gateway 상태 확인 ---
ipcMain.handle('openclaw:status', async () => {
  try {
    const response = await net.fetch(DASHBOARD_URL);
    return { online: response.ok, port: DASHBOARD_PORT };
  } catch {
    return { online: false, port: DASHBOARD_PORT };
  }
});

// --- IPC: 실행 영수증 ---
ipcMain.handle('openclaw:receipts:history', () => {
  return watcher.receipts;
});

ipcMain.handle('openclaw:receipts:session-cost', () => {
  return watcher.getSessionCostSummary();
});

ipcMain.handle('openclaw:receipts:current-state', () => {
  return {
    state: watcher.state,
    model: watcher.model,
    provider: watcher.provider,
  };
});

// --- IPC: Team 모드 ---
ipcMain.handle('openclaw:team:status', () => {
  /** @type {any} */
  const config = loadTeamConfig();
  return {
    enabled: config.enabled || false,
    config: {
      roles: {
        planner: { model: config.roles?.planner?.model || '' },
        executor: { model: config.roles?.executor?.model || '' },
      },
    },
  };
});

ipcMain.handle('openclaw:team:toggle', (_event, enabled) => {
  /** @type {any} */
  const config = loadTeamConfig();
  config.enabled = !!enabled;
  saveTeamConfig(config);
  console.log(`[launcher] team mode ${config.enabled ? 'ON' : 'OFF'}`);
  return config.enabled;
});

ipcMain.handle('openclaw:team:config', () => {
  return loadTeamConfig();
});

ipcMain.handle('openclaw:team:handoffs', (_event, limit = 10) => {
  return listHandoffs(limit);
});

ipcMain.handle('openclaw:team:handoff-detail', (_event, id) => {
  return readHandoff(id);
});

// --- IPC: 채널 바인딩 ---
ipcMain.handle('openclaw:channel:bind', (_event, platform, userId, sessionId, threadId) => {
  channelRegistry.bind(platform, userId, sessionId, threadId);
  return true;
});

ipcMain.handle('openclaw:channel:lookup', (_event, platform, userId) => {
  return channelRegistry.lookup(platform, userId);
});

ipcMain.handle('openclaw:channel:list', () => {
  return channelRegistry.listBindings();
});

ipcMain.handle('openclaw:channel:unbind', (_event, platform, userId) => {
  return channelRegistry.unbind(platform, userId);
});

// --- 영수증 패널 BrowserView ---
/** @type {Electron.BrowserView|null} */
let receiptView = null;
let receiptPanelOpen = false;

/** @param {Electron.BrowserWindow} _win */
function createReceiptPanel(_win) {
  const preloadPath = path.join(__dirname, 'preload.js');
  const receiptHtml = path.join(__dirname, 'ui', 'dist', 'index.html');

  // dist/index.html 존재 확인
  if (!fs.existsSync(receiptHtml)) {
    console.warn('Receipt panel UI not built. Run: cd launcher/ui && npm run build');
    return null;
  }

  const view = new BrowserView({
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  view.webContents.loadFile(receiptHtml);

  // watcher 이벤트 → receipt panel로 전달
  watcher.on('receipt', (receipt) => {
    view.webContents.send('openclaw:receipts:update', {
      type: 'receipt',
      receipt,
    });
  });
  watcher.on('state-change', (data) => {
    view.webContents.send('openclaw:receipts:update', {
      type: 'state-change',
      state: data.state,
    });
  });
  watcher.on('model-change', (data) => {
    view.webContents.send('openclaw:receipts:update', {
      type: 'model-change',
      model: data.model,
      provider: data.provider,
    });
  });

  return view;
}

/** @param {Electron.BrowserWindow} win */
function layoutViews(win) {
  const [width, height] = win.getContentSize();

  if (receiptPanelOpen && receiptView) {
    // dashboard: 왼쪽 (전체 - 패널)
    const dashWidth = width - RECEIPT_PANEL_WIDTH;
    // BrowserView를 사용하지 않고, 메인 윈도우의 bounds를 조정
    // receipt panel: 오른쪽
    receiptView.setBounds({
      x: dashWidth,
      y: 0,
      width: RECEIPT_PANEL_WIDTH,
      height,
    });
  } else if (receiptView) {
    // 패널 숨김 — 화면 밖으로
    receiptView.setBounds({ x: width, y: 0, width: 0, height: 0 });
  }
}

// --- IPC: 패널 토글 ---
ipcMain.handle('openclaw:receipts:toggle-panel', () => {
  receiptPanelOpen = !receiptPanelOpen;
  const win = BrowserWindow.getAllWindows()[0];
  if (win) layoutViews(win);
  return receiptPanelOpen;
});

// --- Auth Preflight ---
/**
 * 시작 시 gateway 토큰 + 도달 가능성 사전 점검
 * 실패해도 window 생성은 진행 (gateway가 launcher보다 늦게 시작할 수 있음)
 * @returns {Promise<{ok: boolean, reason?: string, status?: number}>}
 */
async function checkAuthPreflight() {
  const token = readGatewayToken();
  if (!token) {
    return { ok: false, reason: 'no-token' };
  }
  try {
    const res = await net.fetch(`${DASHBOARD_URL}/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return { ok: false, reason: 'gateway-error', status: res.status };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'gateway-offline' };
  }
}

// --- 메인 윈도우 ---
async function createWindow() {
  // OpenClaw 버전 로그 (Upgrade Guard)
  try {
    const clawPkgPath = require.resolve('openclaw/package.json');
    const clawPkg = JSON.parse(fs.readFileSync(clawPkgPath, 'utf8'));
    console.log(`[launcher] OpenClaw v${clawPkg.version}`);
  } catch {
    console.warn('[launcher] OpenClaw package not found');
  }

  // Auth preflight — 결과만 로그, 실패해도 진행
  const preflight = await checkAuthPreflight();
  if (!preflight.ok) {
    console.warn(`[launcher] auth preflight failed: ${preflight.reason}`);
  } else {
    console.log('[launcher] auth preflight OK');
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Noma — 한국형 AI 실행 셸',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // gateway 토큰을 URL 파라미터로 전달
  const token = readGatewayToken();
  const dashboardUrl = token
    ? `${DASHBOARD_URL}?token=${token}`
    : DASHBOARD_URL;
  win.loadURL(dashboardUrl);

  // Browser Guard: URL 내비게이션 필터링
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      console.warn(`[browser-guard] blocked navigation: ${url}`);
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedUrl(url)) {
      console.warn(`[browser-guard] blocked window open: ${url}`);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // gateway 미실행 시 fallback 안내 화면 표시
  win.webContents.on('did-fail-load', (_event, _code, description) => {
    console.error(`Dashboard 로드 실패: ${description}`);
    win.loadFile(path.join(__dirname, 'fallback.html'));
  });

  // Receipt panel BrowserView 생성
  receiptView = createReceiptPanel(win);
  if (receiptView) {
    win.addBrowserView(receiptView);
    layoutViews(win);
  }

  // 윈도우 리사이즈 시 레이아웃 재조정
  win.on('resize', () => layoutViews(win));

  // Session watcher 시작
  watcher.start();
}

// --- Browser Guard: app-level 보안 ---
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      console.warn(`[browser-guard] blocked navigation (app-level): ${url}`);
      event.preventDefault();
    }
  });
});

// --- 앱 라이프사이클 ---
app.whenReady().then(async () => {
  // 1. 초기 설정 자동 생성 (첫 실행 시)
  ensureConfig();

  // 2. Gateway 자동시작
  const gatewayOk = await startGateway();
  if (!gatewayOk) {
    console.warn('[launcher] Gateway 자동시작 실패 — fallback으로 진행');
  }

  // 3. 메인 윈도우 생성
  createWindow();
});

// macOS: dock 유지 (창 닫아도 앱 종료하지 않음)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// macOS: dock 클릭 시 창 재생성
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- Browser Cleanup Guard (Phase 1-G) ---
/**
 * 브라우저 리소스 정리 — receiptView + BrowserWindow webContents + macOS Chrome Helper
 * 종료 경로에서 throw 방지를 위해 모든 단계에 try-catch 적용
 */
function cleanupBrowserResources() {
  // 1. receiptView 정리 — watcher 리스너 해제 + webContents 종료
  if (receiptView) {
    try {
      watcher.removeAllListeners('receipt');
      watcher.removeAllListeners('state-change');
      watcher.removeAllListeners('model-change');
    } catch (/** @type {any} */ e) {
      console.warn(`[cleanup] watcher listener removal failed: ${e.message}`);
    }
    try {
      if (!receiptView.webContents.isDestroyed()) {
        receiptView.webContents.close();
      }
    } catch (/** @type {any} */ e) {
      console.warn(`[cleanup] receiptView close failed: ${e.message}`);
    }
    receiptView = null;
  }

  // 2. 모든 BrowserWindow의 webContents 종료
  try {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        // BrowserView 제거
        for (const view of win.getBrowserViews()) {
          try {
            win.removeBrowserView(view);
            if (!view.webContents.isDestroyed()) {
              view.webContents.close();
            }
          } catch {
            // 개별 view 정리 실패 무시
          }
        }
        win.destroy();
      }
    }
  } catch (/** @type {any} */ e) {
    console.warn(`[cleanup] window cleanup failed: ${e.message}`);
  }

  // 3. macOS Chrome Helper 잔여 프로세스 정리 (non-blocking, best-effort)
  if (process.platform === 'darwin') {
    try {
      const { exec } = require('child_process');
      // Noma 앱의 Chrome Helper만 정리 (다른 Electron 앱에 영향 없도록)
      exec(
        'pgrep -f "Noma.*Helper" | xargs kill 2>/dev/null',
        { timeout: 3000 },
        () => {}, // 결과 무시 — best effort
      );
    } catch {
      // macOS 전용, 실패해도 무시
    }
  }

  console.log('[cleanup] browser resources cleaned up');
}

// 종료 시 정리
app.on('before-quit', () => {
  watcher.stop();
  stopGateway();
  cleanupBrowserResources();
});

// --- Gateway 상태 IPC ---
ipcMain.handle('gateway:getStartupStatus', () => getStartupStatus());
