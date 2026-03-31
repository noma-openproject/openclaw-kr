#!/usr/bin/env node
// plugins/kakao-entry/index.js
// 카카오 오픈빌더 스킬 서버 — 웹훅 핸들러
const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  relayWithTeam,
  relayWithTeamForCallback,
  sendCallback,
  checkGatewayHealth,
} = require('./relay');
const { ChannelReliability } = require('./dedup');
const { ChannelRegistry } = require(path.resolve(__dirname, '../../launcher/channel-registry'));

// --- Channel Reliability ---
const channelKit = new ChannelReliability({ dedupWindowMs: 2000, delayThresholdMs: 10000 });

// --- 페어링 ---
const NOMA_PAIRING_MODE = process.env.NOMA_PAIRING_MODE || 'personal';
const channelRegistry = new ChannelRegistry();

// --- 설정 ---
const PORT = parseInt(process.env.KAKAO_SKILL_PORT || '3001', 10);
const KNOWN_BOT_ID = '69c53d4c45b6624e9317cef8';

// Safe Mode config 로드
const safeModeConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'safe-mode-config.json'), 'utf8'),
);

// --- Rate Limiter (인메모리, 유저당 10req/분) ---
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map(); // userId -> { count, resetAt }

function checkRateLimit(userId) {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= RATE_LIMIT;
}

// 오래된 버킷 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
}, 300_000).unref();

// --- Safe Mode 프리필터 ---
const BLOCKED_PATTERNS = [
  /파일\s*(삭제|제거|지우|쓰기|생성|만들|저장)/,
  /파일.*수정|파일.*편집|파일.*변경/,
  /(코드|파일|문서).*(수정|편집|변경|삭제)/,
  /브라우저\s*(열|실행|켜)/,
  /(실행|설치|명령|커맨드|터미널|셸|shell|npm|pip)/,
  /rm\s|sudo\s|chmod\s|mv\s|cp\s/,
];

function checkSafeMode(utterance) {
  if (!utterance) return null;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(utterance)) {
      return safeModeConfig.messaging.errorMessages.blockedAction;
    }
  }
  return null; // 통과
}

// --- 요청 검증 ---
function validateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '잘못된 요청 형식입니다.' };
  }
  if (!body.bot?.id || body.bot.id !== KNOWN_BOT_ID) {
    return { valid: false, error: '인증되지 않은 봇입니다.', status: 403 };
  }
  if (!body.userRequest?.utterance?.trim()) {
    return { valid: false, error: '메시지가 비어있습니다.' };
  }
  if (!body.userRequest?.user?.id) {
    return { valid: false, error: '사용자 정보가 없습니다.' };
  }
  return { valid: true };
}

// --- 카카오 응답 포맷 ---
function formatResponse(text) {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
}

// --- JSON body 파싱 ---
function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const MAX_BODY = 1024 * 64; // 64KB

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (_e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// --- 메인 핸들러 ---
async function handleSkillRequest(body) {
  // 1. 검증
  const validation = validateRequest(body);
  if (!validation.valid) {
    return { status: validation.status || 400, body: formatResponse(validation.error) };
  }

  const utterance = body.userRequest.utterance.trim();
  const userId = body.userRequest.user.id;

  // 2. Rate limit
  if (!checkRateLimit(userId)) {
    return {
      status: 200,
      body: formatResponse('요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.'),
    };
  }

  // 3. Duplicate suppression
  if (channelKit.isDuplicate(userId, utterance)) {
    console.log(`[kakao] duplicate suppressed: user=${userId.slice(0, 8)}...`);
    return { status: 200, body: formatResponse('이전 요청을 처리 중입니다. 잠시만 기다려주세요.') };
  }

  // 4. Safe Mode 프리필터
  const blocked = checkSafeMode(utterance);
  if (blocked) {
    return { status: 200, body: formatResponse(blocked) };
  }

  // 4. 콜백 URL 확인 (카카오 오픈빌더 콜백 모드)
  const callbackUrl = body.userRequest?.callbackUrl;

  const channelId = `kakao:${userId}`;
  const requestId = `${userId}:${Date.now()}`;
  channelKit.recordRequest(channelId, requestId);

  console.log(
    `[kakao] user=${userId.slice(0, 8)}... msg="${utterance.slice(0, 30)}" callback=${!!callbackUrl}`,
  );

  if (callbackUrl) {
    // 콜백 모드: 즉시 응답 후 백그라운드에서 LLM 처리 (Team 모드 자동 감지)
    relayWithTeamForCallback(utterance, userId).then(async (result) => {
      channelKit.recordResponse(channelId, requestId, result.ok);
      const responseBody = formatResponse(
        result.ok ? result.text : '처리 중 오류가 발생했습니다. 다시 시도해주세요.',
      );
      const cbResult = await sendCallback(callbackUrl, responseBody);
      if (!cbResult.ok) {
        console.error(`[kakao] callback delivery failed for user=${userId.slice(0, 8)}`);
      }
    });

    // 즉시 useCallback 응답 반환
    return { status: 200, body: { version: '2.0', useCallback: true } };
  }

  // 5. 동기 모드 (콜백 미지원 블록 — fallback, Team 모드 자동 감지)
  const result = await relayWithTeam(utterance, userId);
  channelKit.recordResponse(channelId, requestId, result.ok);

  if (!result.ok) {
    console.warn(`[kakao] relay failed: ${result.text.slice(0, 60)}`);
  }

  return { status: 200, body: formatResponse(result.text) };
}

// --- HTTP 서버 ---
const server = http.createServer(async (req, res) => {
  // CORS 헤더 (카카오 서버에서 호출)
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 헬스체크
  if (req.method === 'GET' && req.url === '/health') {
    const gw = await checkGatewayHealth();
    const status = gw.online ? 200 : 503;
    res.writeHead(status);
    res.end(JSON.stringify({ status: gw.online ? 'ok' : 'gateway_offline', gateway: gw }));
    return;
  }

  // POST만 허용
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify(formatResponse('POST 요청만 지원합니다.')));
    return;
  }

  // Content-Type 확인
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    res.writeHead(400);
    res.end(JSON.stringify(formatResponse('Content-Type: application/json이 필요합니다.')));
    return;
  }

  try {
    const body = await parseBody(req);

    // --- 페어링 게이트 (Relay forward 검증) ---
    const nomaUserId = req.headers['x-noma-userid'];
    if (NOMA_PAIRING_MODE === 'personal' && nomaUserId) {
      // X-Noma-UserId가 있으면 Relay를 통해 온 요청
      const existing = channelRegistry.lookup('kakao', nomaUserId);
      if (!existing) {
        // 첫 요청: 자동 local bind (Relay가 이미 인증했으므로 신뢰)
        channelRegistry.bind('kakao', nomaUserId, 'paired');
        console.log(`[pairing] bound kakao:${nomaUserId.slice(0, 8)}...`);
      }
    } else if (NOMA_PAIRING_MODE === 'personal' && !nomaUserId) {
      // Relay 없이 직접 접근 (로컬 테스트 제외) — userId 기반으로 바인딩 확인
      const userId = body?.userRequest?.user?.id;
      if (userId) {
        const existing = channelRegistry.lookup('kakao', userId);
        if (!existing) {
          res.writeHead(200);
          res.end(JSON.stringify(formatResponse(
            '이 노마 인스턴스에 연결되지 않은 계정입니다.\n' +
            '데스크톱 앱에서 페어링 코드를 생성한 후 \'/pair 코드6자리\'를 입력해주세요.',
          )));
          return;
        }
      }
    }
    // demo 모드: 게이트 스킵

    const result = await handleSkillRequest(body);
    res.writeHead(result.status);
    res.end(JSON.stringify(result.body));
  } catch (err) {
    console.error(`[kakao] error: ${err.message}`);
    res.writeHead(400);
    res.end(JSON.stringify(formatResponse('요청을 처리할 수 없습니다.')));
  }
});

// --- 서버 시작 ---
server.listen(PORT, async () => {
  console.log(`[kakao] Noma 카카오 스킬 서버 시작 — port ${PORT}`);
  console.log(`[kakao] Safe Mode: write=${safeModeConfig.permissions.write}, read=${safeModeConfig.permissions.read}`);

  const gw = await checkGatewayHealth();
  if (gw.online) {
    console.log(`[kakao] OpenClaw gateway 연결 확인 (HTTP ${gw.status})`);
  } else {
    console.warn(`[kakao] ⚠ gateway 연결 실패 — 데스크톱 앱에서 gateway를 실행해주세요.`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[kakao] 서버 종료...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

// 테스트용 export
module.exports = {
  handleSkillRequest,
  validateRequest,
  checkSafeMode,
  formatResponse,
  checkRateLimit,
  server,
  channelRegistry,
};
