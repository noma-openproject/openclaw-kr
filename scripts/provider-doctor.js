#!/usr/bin/env node
'use strict';

/**
 * Provider Doctor 2.0
 * 지식문서 P01: provider 이름, env key, model ref, Docker env 주입,
 * memory embeddings 기대치까지 한 번에 검사.
 *
 * "연결 성공 / memory는 안 됨 / model ref 틀림 / 키 이름 틀림" 구분.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

const GATEWAY_HOST = process.env.OPENCLAW_GATEWAY_HOST || '127.0.0.1';
const GATEWAY_PORT = parseInt(process.env.OPENCLAW_GATEWAY_PORT || '18789', 10);
const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'openclaw.json');

/** @type {Array<{check: string, status: 'pass'|'fail'|'warn'|'skip', detail: string}>} */
const results = [];

function log(status, check, detail) {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️', skip: '⊘' };
  results.push({ check, status, detail });
  console.log(`  ${icons[status]} ${check}: ${detail}`);
}

// ── 1. OpenClaw 설치 확인 ──

function checkInstall() {
  try {
    const pkgPath = require.resolve('openclaw/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    log('pass', 'OpenClaw 설치', `v${pkg.version}`);

    if (pkg.version !== '2026.3.23-2') {
      log('warn', '버전 고정', `현재 ${pkg.version} — 권장 2026.3.23-2`);
    } else {
      log('pass', '버전 고정', '2026.3.23-2 ✓');
    }
  } catch {
    log('fail', 'OpenClaw 설치', '미설치. npm install -g openclaw@2026.3.23-2');
  }
}

// ── 2. Gateway 토큰 + Config 확인 ──

function checkConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    log('fail', 'Gateway 설정', `${CONFIG_PATH} 없음`);
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const token = config?.gateway?.auth?.token;

    if (!token) {
      log('fail', 'Gateway 토큰', '토큰 비어 있음. openclaw 최초 실행 필요');
      return config;
    }

    log('pass', 'Gateway 토큰', `${token.substring(0, 8)}...`);

    // Provider 이름 확인
    const provider = config?.gateway?.provider || config?.provider;
    if (provider) {
      log('pass', 'Provider', provider);
    } else {
      log('warn', 'Provider', '명시되지 않음 — 기본 provider 사용');
    }

    return config;
  } catch (/** @type {any} */ err) {
    log('fail', 'Gateway 설정', `파싱 실패: ${err.message}`);
    return null;
  }
}

// ── 3. 환경변수 확인 (Docker env 주입 포함) ──

function checkEnvVars() {
  const envChecks = [
    { key: 'OPENAI_API_KEY', desc: 'OpenAI API key (API key 경로)' },
    { key: 'ANTHROPIC_API_KEY', desc: 'Anthropic API key' },
    { key: 'GEMINI_API_KEY', desc: 'Gemini API key' },
    { key: 'OPENCLAW_GATEWAY_HOST', desc: 'Gateway host override' },
    { key: 'OPENCLAW_GATEWAY_PORT', desc: 'Gateway port override' },
  ];

  let anyFound = false;
  for (const { key, desc } of envChecks) {
    if (process.env[key]) {
      log('pass', `env ${key}`, `설정됨 (${desc})`);
      anyFound = true;
    }
  }

  if (!anyFound) {
    log('warn', 'API 환경변수', 'API key env 없음 — OAuth 또는 config 경로 사용 중일 수 있음');
  }

  // Docker 환경 감지
  if (fs.existsSync('/.dockerenv') || process.env.DOCKER_HOST) {
    log('warn', 'Docker 감지', 'Docker 환경. env 주입 확인 필요');
  }
}

// ── 4. Gateway Health Check ──

/**
 * @returns {Promise<boolean>}
 */
function checkGatewayHealth() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: '/health',
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            log('pass', 'Gateway 연결', `HTTP ${res.statusCode} — ${GATEWAY_HOST}:${GATEWAY_PORT}`);
            resolve(true);
          } else {
            log('fail', 'Gateway 연결', `HTTP ${res.statusCode}: ${body.substring(0, 100)}`);
            resolve(false);
          }
        });
      }
    );

    req.on('error', (/** @type {any} */ err) => {
      log('fail', 'Gateway 연결', `${err.code || err.message} — OpenClaw가 실행 중인지 확인`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      log('fail', 'Gateway 연결', '타임아웃 (5초)');
      resolve(false);
    });

    req.end();
  });
}

// ── 5. Model Ref 확인 ──

/**
 * @returns {Promise<void>}
 */
function checkModels() {
  return new Promise((resolve) => {
    const token = (() => {
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        return config?.gateway?.auth?.token || '';
      } catch { return ''; }
    })();

    const req = http.request(
      {
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: '/v1/models',
        method: 'GET',
        timeout: 5000,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body);
              const models = data?.data || [];
              if (models.length > 0) {
                const names = models.map((/** @type {any} */ m) => m.id).slice(0, 5).join(', ');
                log('pass', '사용 가능 모델', `${models.length}개 — ${names}`);
              } else {
                log('warn', '사용 가능 모델', '0개 — provider 연결 확인 필요');
              }
            } catch {
              log('warn', '모델 목록', '응답 파싱 실패');
            }
          } else {
            log('warn', '모델 목록', `HTTP ${res.statusCode} — /v1/models 미지원 가능`);
          }
          resolve();
        });
      }
    );

    req.on('error', () => {
      log('skip', '모델 목록', 'Gateway 미연결');
      resolve();
    });

    req.on('timeout', () => { req.destroy(); resolve(); });
    req.end();
  });
}

// ── 6. Embeddings / Memory 확인 ──

/**
 * @returns {Promise<void>}
 */
function checkEmbeddings() {
  return new Promise((resolve) => {
    const token = (() => {
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        return config?.gateway?.auth?.token || '';
      } catch { return ''; }
    })();

    const postData = JSON.stringify({
      model: 'text-embedding-3-small',
      input: 'test',
    });

    const req = http.request(
      {
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: '/v1/embeddings',
        method: 'POST',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            log('pass', 'Embeddings', '지원됨 — memory search 활성화 가능');
          } else {
            log('warn', 'Embeddings', `미지원 (HTTP ${res.statusCode}) — memory search 기본 OFF 유지`);
          }
          resolve();
        });
      }
    );

    req.on('error', () => {
      log('skip', 'Embeddings', 'Gateway 미연결');
      resolve();
    });

    req.on('timeout', () => { req.destroy(); resolve(); });
    req.end(postData);
  });
}

// ── 7. alpha-secure 프로필 확인 ──

function checkSecurityProfile() {
  const profilePath = path.join(
    __dirname, '..', 'packages', 'permission-profiles', 'alpha-secure.json'
  );

  if (!fs.existsSync(profilePath)) {
    log('warn', 'alpha-secure 프로필', '미설치');
    return;
  }

  try {
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    const deniedTools = profile?.tools?.deny || [];
    const expectedDeny = ['install', 'image', 'agents.create', 'agents.update'];
    const missing = expectedDeny.filter((t) => !deniedTools.includes(t));

    if (missing.length === 0) {
      log('pass', 'alpha-secure', `deny 규칙 ${deniedTools.length}개 정상`);
    } else {
      log('warn', 'alpha-secure', `누락된 deny: ${missing.join(', ')}`);
    }
  } catch (/** @type {any} */ err) {
    log('warn', 'alpha-secure 프로필', `파싱 실패: ${err.message}`);
  }
}

// ── Main ──

async function main() {
  console.log('\n=== Provider Doctor 2.0 ===\n');

  checkInstall();
  const config = checkConfig();
  checkEnvVars();
  checkSecurityProfile();

  const gwOnline = await checkGatewayHealth();
  if (gwOnline) {
    await checkModels();
    await checkEmbeddings();
  }

  // 결과 요약
  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const warn = results.filter((r) => r.status === 'warn').length;

  console.log(`\n=== 결과: ${pass} pass, ${fail} fail, ${warn} warn ===`);

  if (fail > 0) {
    console.log('\n❌ 실패 항목:');
    results.filter((r) => r.status === 'fail').forEach((r) => {
      console.log(`  - ${r.check}: ${r.detail}`);
    });
  }

  if (warn > 0) {
    console.log('\n⚠️ 경고 항목:');
    results.filter((r) => r.status === 'warn').forEach((r) => {
      console.log(`  - ${r.check}: ${r.detail}`);
    });
  }

  // JSON 결과 저장
  const outDir = path.join(os.homedir(), '.openclaw', 'diagnostics');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `doctor-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`\n결과 저장: ${outPath}`);

  process.exit(fail > 0 ? 1 : 0);
}

main();
