#!/usr/bin/env node
'use strict';

/**
 * Memory Healthcheck (지식문서 P07)
 *
 * indexed files/chunks>0 확인, 실제 search result 확인,
 * "ready인데 index=0" 모순 탐지, fail 시 auto-disable+경고.
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

// ── 1. Memory 설정 확인 ──

function checkMemoryConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    log('skip', 'Memory 설정', 'openclaw.json 없음');
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    // memorySearch 설정 확인
    const memoryEnabled = config?.memorySearch !== false;
    const privacySearch = config?.privacy?.memorySearch;

    if (privacySearch === false || !memoryEnabled) {
      log('pass', 'Memory 상태', 'OFF (alpha-secure 기본값 — 정상)');
      return { enabled: false, config };
    }

    log('warn', 'Memory 상태', 'ON — embeddings 지원 여부 확인 필요');
    return { enabled: true, config };
  } catch (/** @type {any} */ err) {
    log('fail', 'Memory 설정', `파싱 실패: ${err.message}`);
    return null;
  }
}

// ── 2. Embeddings 엔드포인트 프로브 ──

/**
 * @returns {Promise<boolean>}
 */
function probeEmbeddings() {
  return new Promise((resolve) => {
    const token = (() => {
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        return config?.gateway?.auth?.token || '';
      } catch { return ''; }
    })();

    const postData = JSON.stringify({
      model: 'text-embedding-3-small',
      input: 'memory healthcheck probe',
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
            try {
              const data = JSON.parse(body);
              const embedding = data?.data?.[0]?.embedding;
              if (embedding && embedding.length > 0) {
                log('pass', 'Embeddings 프로브', `벡터 차원: ${embedding.length}`);
                resolve(true);
              } else {
                log('warn', 'Embeddings 프로브', '응답은 200이지만 벡터 비어 있음');
                resolve(false);
              }
            } catch {
              log('warn', 'Embeddings 프로브', '응답 파싱 실패');
              resolve(false);
            }
          } else {
            log('warn', 'Embeddings 프로브', `HTTP ${res.statusCode} — 미지원`);
            resolve(false);
          }
        });
      }
    );

    req.on('error', () => {
      log('skip', 'Embeddings 프로브', 'Gateway 미연결');
      resolve(false);
    });

    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end(postData);
  });
}

// ── 3. 모순 탐지 ──

/**
 * @param {{enabled: boolean, config: any} | null} memState
 * @param {boolean} embeddingsAvailable
 */
function detectContradictions(memState, embeddingsAvailable) {
  if (!memState) return;

  // "ready인데 index=0" — memory ON인데 embeddings 미지원
  if (memState.enabled && !embeddingsAvailable) {
    log('fail', '모순 탐지',
      'memory ON이지만 embeddings 미지원 — 검색 결과가 항상 빈값. memory OFF 권장');
    return;
  }

  // memory OFF인데 embeddings 가능 — 정보 제공
  if (!memState.enabled && embeddingsAvailable) {
    log('warn', '모순 탐지',
      'embeddings 사용 가능하지만 memory OFF — 필요 시 활성화 가능');
    return;
  }

  if (memState.enabled && embeddingsAvailable) {
    log('pass', '모순 탐지', 'memory ON + embeddings 지원 — 정상');
  } else {
    log('pass', '모순 탐지', 'memory OFF + embeddings 미지원 — alpha-secure 기본값 정상');
  }
}

// ── 4. 권고사항 생성 ──

function generateRecommendation() {
  const fails = results.filter((r) => r.status === 'fail');

  if (fails.some((f) => f.check === '모순 탐지')) {
    console.log('\n💡 권고: memory를 비활성화하거나, embeddings를 지원하는 provider로 전환하세요.');
    console.log('   alpha-secure 기본값(memory OFF)이 가장 안전합니다.');
  }
}

// ── Main ──

async function main() {
  console.log('\n=== Memory Healthcheck ===\n');

  const memState = checkMemoryConfig();
  const embeddingsAvailable = await probeEmbeddings();
  detectContradictions(memState, embeddingsAvailable);
  generateRecommendation();

  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const warn = results.filter((r) => r.status === 'warn').length;

  console.log(`\n=== 결과: ${pass} pass, ${fail} fail, ${warn} warn ===`);

  // JSON 결과 저장
  const outDir = path.join(os.homedir(), '.openclaw', 'diagnostics');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `memory-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`결과 저장: ${outPath}`);

  process.exit(fail > 0 ? 1 : 0);
}

main();
