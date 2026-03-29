#!/usr/bin/env node
// scripts/verify-embeddings.js
// OpenClaw embeddings/memory 검증 프로브 스크립트
// 용도: alpha-secure.json의 memorySearch 설정 + /v1/embeddings 엔드포인트 존재 여부 확인
// 의존성: 없음 (Node.js 내장 모듈만 사용)

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const GATEWAY_HOST = process.env.OPENCLAW_GATEWAY_HOST || '127.0.0.1';
const GATEWAY_PORT = parseInt(process.env.OPENCLAW_GATEWAY_PORT || '18789', 10);

// --- 유틸리티 ---

function readGatewayToken() {
  const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config?.gateway?.auth?.token || '';
  } catch {
    return '';
  }
}

function httpRequest(method, reqPath, body) {
  return new Promise((resolve) => {
    const token = readGatewayToken();
    const data = body ? JSON.stringify(body) : undefined;

    const options = {
      hostname: GATEWAY_HOST,
      port: GATEWAY_PORT,
      path: reqPath,
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            }
          : {}),
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(buf);
        } catch {
          // not JSON
        }
        resolve({ status: res.statusCode, body: parsed, raw: buf });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout' });
    });

    if (data) req.write(data);
    req.end();
  });
}

// --- 검증 항목 ---

async function checkGatewayHealth() {
  const res = await httpRequest('GET', '/');
  return { online: res.status > 0 && res.status < 500, status: res.status, error: res.error };
}

async function checkModels() {
  const res = await httpRequest('GET', '/v1/models');
  if (res.status !== 200) {
    return { available: false, status: res.status, error: res.error };
  }
  const models = res.body?.data?.map((m) => m.id) || [];
  return { available: true, models, count: models.length };
}

async function checkEmbeddingsEndpoint() {
  const res = await httpRequest('POST', '/v1/embeddings', {
    model: 'text-embedding-3-small',
    input: 'test',
  });
  return {
    exists: res.status === 200,
    status: res.status,
    error: res.error,
    body: res.raw?.slice(0, 200),
  };
}

function checkAlphaSecureConfig() {
  const configPath = path.join(
    __dirname,
    '..',
    'packages',
    'permission-profiles',
    'alpha-secure.json',
  );
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
      found: true,
      memorySearch: config?.privacy?.memorySearch,
      telemetry: config?.privacy?.telemetry,
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

// --- 리포트 ---

async function run() {
  console.log('\n=== [embeddings/memory 검증 리포트] ===\n');

  // 1. 토큰
  const token = readGatewayToken();
  console.log(`토큰: ${token ? '있음' : '없음 ⚠️'}`);

  // 2. Gateway health
  const health = await checkGatewayHealth();
  if (!health.online) {
    console.log(`gateway 상태: 오프라인 (${health.error || `HTTP ${health.status}`})`);
    console.log('\n⚠️  gateway가 실행 중이지 않습니다. `npx openclaw` 실행 후 재시도하세요.\n');
    process.exit(1);
  }
  console.log(`gateway 상태: 온라인 (:${GATEWAY_PORT})`);

  // 3. /v1/models
  const models = await checkModels();
  if (models.available) {
    console.log(`/v1/models: ${models.count}개 모델 등록`);
  } else {
    console.log(`/v1/models: 사용 불가 (HTTP ${models.status})`);
  }

  // 4. /v1/embeddings
  const embeddings = await checkEmbeddingsEndpoint();
  if (embeddings.exists) {
    console.log('/v1/embeddings 엔드포인트: 존재 ✅ (3.24+ 기능)');
  } else {
    console.log(
      `/v1/embeddings 엔드포인트: 없음 (HTTP ${embeddings.status}) — 3.23-2 예상 동작`,
    );
  }

  // 5. alpha-secure.json
  const alphaSecure = checkAlphaSecureConfig();
  if (alphaSecure.found) {
    const msValue = alphaSecure.memorySearch;
    const msStatus = msValue === false ? '✅ (false — 비활성화)' : `⚠️ (${msValue})`;
    console.log(`alpha-secure.json > privacy.memorySearch: ${msStatus}`);
  } else {
    console.log(`alpha-secure.json: 파일 없음 ⚠️ (${alphaSecure.error})`);
  }

  // 6. 결론
  console.log('\n--- 결론 ---');
  if (!embeddings.exists && alphaSecure.memorySearch === false) {
    console.log('현재 버전(3.23-2)에서 /v1/embeddings 엔드포인트는 존재하지 않음.');
    console.log('memorySearch: false 설정은 3.24+ 에서 /v1/embeddings 호출을 차단하는 게이트.');
    console.log('3.24로 업그레이드 시 이 스크립트를 재실행하여 차단 동작 확인 필요.');
  } else if (embeddings.exists && alphaSecure.memorySearch === false) {
    console.log('/v1/embeddings 엔드포인트가 존재하지만 memorySearch: false로 설정됨.');
    console.log('실제 차단 동작은 OpenClaw 런타임에서 확인 필요.');
  } else {
    console.log('예상과 다른 상태입니다. 위 항목을 개별 확인하세요.');
  }

  console.log('\n다음 단계: 3.24 test lane 설정 후 verify-embeddings.js 재실행\n');
}

run().catch((err) => {
  console.error('검증 실패:', err);
  process.exit(1);
});
