#!/usr/bin/env node
// scripts/capability-audit.js
// OpenClaw gateway capability 스냅샷 + 버전간 diff
// Usage:
//   node scripts/capability-audit.js           # 현재 상태 스냅샷 저장
//   node scripts/capability-audit.js --diff    # 최근 2개 스냅샷 비교
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const GATEWAY_HOST = process.env.OPENCLAW_GATEWAY_HOST || '127.0.0.1';
const GATEWAY_PORT = parseInt(process.env.OPENCLAW_GATEWAY_PORT || '18789', 10);
const AUDITS_DIR = path.join(os.homedir(), '.openclaw', 'audits');
const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'openclaw.json');

// --- HTTP 헬퍼 ---
function httpGet(urlPath, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: GATEWAY_HOST, port: GATEWAY_PORT, path: urlPath, timeout: timeoutMs },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ ok: (res.statusCode || 0) < 400, status: res.statusCode, data });
        });
      },
    );
    req.on('error', (err) => resolve({ ok: false, status: 0, data: '', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, data: '', error: 'timeout' }); });
  });
}

// --- Config 읽기 ---
function readLocalConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw);
    // 민감 정보(토큰) 제외
    const safe = { ...config };
    if (safe.gateway?.auth?.token) {
      safe.gateway.auth.token = `***${safe.gateway.auth.token.slice(-4)}`;
    }
    return safe;
  } catch {
    return null;
  }
}

// --- npm 패키지 버전 ---
function getInstalledVersion() {
  try {
    const pkgPath = require.resolve('openclaw/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'not-installed';
  }
}

// --- 스냅샷 생성 ---
async function takeSnapshot() {
  console.log('[audit] Taking capability snapshot...');
  console.log(`[audit] Gateway: ${GATEWAY_HOST}:${GATEWAY_PORT}`);

  const snapshot = {
    timestamp: new Date().toISOString(),
    openclaw_version: getInstalledVersion(),
    node_version: process.version,
    platform: `${process.platform}-${process.arch}`,
    gateway: { online: false, status: 0, version: '' },
    endpoints: {},
    config: readLocalConfig(),
    known_limits: [],
  };

  // Gateway health
  const health = await httpGet('/');
  snapshot.gateway.online = health.ok;
  snapshot.gateway.status = health.status;
  if (health.ok) {
    try {
      const parsed = JSON.parse(health.data);
      snapshot.gateway.version = parsed.version || parsed.name || '';
    } catch {
      snapshot.gateway.version = '';
    }
  }

  // /v1/models (3.24+)
  const models = await httpGet('/v1/models');
  snapshot.endpoints['/v1/models'] = {
    available: models.ok,
    status: models.status,
  };
  if (models.ok) {
    try {
      const parsed = JSON.parse(models.data);
      snapshot.endpoints['/v1/models'].models =
        (parsed.data || []).map((m) => m.id || m).slice(0, 20);
    } catch {
      // parse fail
    }
  }

  // /v1/embeddings (3.24+)
  const embeddings = await httpGet('/v1/embeddings');
  snapshot.endpoints['/v1/embeddings'] = {
    available: embeddings.ok && embeddings.status !== 404,
    status: embeddings.status,
  };

  // Known limits detection
  if (!snapshot.endpoints['/v1/embeddings']?.available) {
    snapshot.known_limits.push('embeddings endpoint missing (memorySearch should be false)');
  }
  if (!snapshot.gateway.online) {
    snapshot.known_limits.push('gateway offline — all endpoint checks skipped');
  }

  return snapshot;
}

// --- 스냅샷 저장 ---
function saveSnapshot(snapshot) {
  if (!fs.existsSync(AUDITS_DIR)) {
    fs.mkdirSync(AUDITS_DIR, { recursive: true });
  }
  const filename = `audit-${snapshot.timestamp.replace(/[:.]/g, '-').slice(0, 19)}.json`;
  const filePath = path.join(AUDITS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`[audit] Saved: ${filePath}`);
  return filePath;
}

// --- Diff ---
function diffSnapshots() {
  if (!fs.existsSync(AUDITS_DIR)) {
    console.error('[audit] No audits directory found. Run a snapshot first.');
    process.exit(1);
  }

  const files = fs.readdirSync(AUDITS_DIR)
    .filter((f) => f.startsWith('audit-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length < 2) {
    console.error(`[audit] Need at least 2 snapshots to diff. Found: ${files.length}`);
    process.exit(1);
  }

  const newer = JSON.parse(fs.readFileSync(path.join(AUDITS_DIR, files[0]), 'utf8'));
  const older = JSON.parse(fs.readFileSync(path.join(AUDITS_DIR, files[1]), 'utf8'));

  console.log('\n=== Capability Diff ===');
  console.log(`Before: ${older.timestamp} (v${older.openclaw_version})`);
  console.log(`After:  ${newer.timestamp} (v${newer.openclaw_version})\n`);

  // Version change
  if (older.openclaw_version !== newer.openclaw_version) {
    console.log(`  VERSION: ${older.openclaw_version} → ${newer.openclaw_version}`);
  } else {
    console.log(`  VERSION: ${newer.openclaw_version} (unchanged)`);
  }

  // Gateway status
  if (older.gateway.online !== newer.gateway.online) {
    const symbol = newer.gateway.online ? '✅' : '❌';
    console.log(`  ${symbol} GATEWAY: ${older.gateway.online ? 'online' : 'offline'} → ${newer.gateway.online ? 'online' : 'offline'}`);
  }

  // Endpoint changes
  const allEndpoints = new Set([
    ...Object.keys(older.endpoints || {}),
    ...Object.keys(newer.endpoints || {}),
  ]);

  for (const ep of allEndpoints) {
    const oldAvail = older.endpoints?.[ep]?.available;
    const newAvail = newer.endpoints?.[ep]?.available;

    if (oldAvail === newAvail) continue;

    if (!oldAvail && newAvail) {
      console.log(`  ✅ NEW: ${ep} (now available)`);
    } else if (oldAvail && !newAvail) {
      console.log(`  ❌ LOST: ${ep} (no longer available)`);
    }
  }

  // Known limits
  const oldLimits = new Set(older.known_limits || []);
  const newLimits = new Set(newer.known_limits || []);

  for (const l of newLimits) {
    if (!oldLimits.has(l)) {
      console.log(`  ⚠️  NEW LIMIT: ${l}`);
    }
  }
  for (const l of oldLimits) {
    if (!newLimits.has(l)) {
      console.log(`  ✅ RESOLVED: ${l}`);
    }
  }

  console.log('');
}

// --- 결과 요약 출력 ---
function printSummary(snapshot) {
  console.log('\n=== Capability Snapshot ===');
  console.log(`  OpenClaw:   v${snapshot.openclaw_version}`);
  console.log(`  Node:       ${snapshot.node_version}`);
  console.log(`  Platform:   ${snapshot.platform}`);
  console.log(`  Gateway:    ${snapshot.gateway.online ? '✅ online' : '❌ offline'} (port ${GATEWAY_PORT})`);
  console.log('  Endpoints:');
  for (const [ep, info] of Object.entries(snapshot.endpoints)) {
    const avail = /** @type {any} */ (info).available;
    console.log(`    ${avail ? '✅' : '❌'} ${ep}`);
  }
  if (snapshot.known_limits.length > 0) {
    console.log('  Known Limits:');
    for (const l of snapshot.known_limits) {
      console.log(`    ⚠️  ${l}`);
    }
  }
  console.log('');
}

// --- Main ---
async function main() {
  const isDiff = process.argv.includes('--diff');

  if (isDiff) {
    diffSnapshots();
  } else {
    const snapshot = await takeSnapshot();
    saveSnapshot(snapshot);
    printSummary(snapshot);
  }
}

main().catch((err) => {
  console.error(`[audit] Error: ${err.message}`);
  process.exit(1);
});
