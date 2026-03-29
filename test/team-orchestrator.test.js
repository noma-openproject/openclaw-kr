#!/usr/bin/env node
// test/team-orchestrator.test.js
// Team Orchestrator + Handoff 통합 테스트 — mock gateway로 Planner→Executor 체이닝 검증
const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- 테스트 설정 ---
const MOCK_GW_PORT = 18792;
let mockServer;
let mockRequests = [];
let passed = 0;
let failed = 0;
const results = [];

// Handoff 테스트용 임시 디렉토리
const HANDOFF_TEST_DIR = path.join(os.tmpdir(), `handoff-test-${Date.now()}`);

// --- Mock Gateway 서버 ---
function startMockGateway() {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const parsed = JSON.parse(body);
        mockRequests.push(parsed);

        const model = parsed.model || '';
        const userContent = parsed.messages?.find((m) => m.role === 'user')?.content || '';
        const systemContent = parsed.messages?.find((m) => m.role === 'system')?.content || '';

        // 모델별 응답 분기
        if (model.includes('gpt-4o-mini') || systemContent.includes('계획 전문가')) {
          // Planner 응답
          if (userContent === 'fail-planner') {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'planner error' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            choices: [{
              message: {
                content: '1. 작업 분석: 테스트 요청 처리\n2. 단계: 응답 생성\n3. 예상 결과: 성공',
              },
            }],
            usage: { input: 500, output: 200, totalTokens: 700 },
          }));
        } else if (model.includes('gpt-5.4') || systemContent.includes('실행 전문가')) {
          // Executor 응답
          if (userContent === 'fail-executor') {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'executor error' }));
            return;
          }
          if (userContent === 'slow-executor') {
            // 타임아웃 시뮬레이션 — 응답하지 않음
            setTimeout(() => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                choices: [{ message: { content: 'too late' } }],
                usage: { input: 1000, output: 500, totalTokens: 1500 },
              }));
            }, 5000);
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            choices: [{
              message: { content: '실행 완료: 테스트 결과입니다.' },
            }],
            usage: { input: 1500, output: 800, totalTokens: 2300 },
          }));
        } else {
          // 단일 모델 (fallback)
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            choices: [{ message: { content: `에코: ${userContent}` } }],
            usage: { input: 100, output: 50, totalTokens: 150 },
          }));
        }
      });
    });
    mockServer.listen(MOCK_GW_PORT, () => {
      console.log(`Mock gateway started on :${MOCK_GW_PORT}`);
      resolve();
    });
  });
}

// --- 테스트 유틸 ---
async function test(name, fn) {
  mockRequests = [];
  try {
    await fn();
    passed++;
    results.push(`  ✅ ${passed + failed}. ${name}`);
    console.log(`  ✅ ${passed + failed}. ${name}`);
  } catch (err) {
    failed++;
    results.push(`  ❌ ${passed + failed}. ${name}\n     ${err.message}`);
    console.log(`  ❌ ${passed + failed}. ${name}`);
    console.log(`     ${err.message}`);
  }
}

// --- 테스트 실행 ---
async function runTests() {
  // 환경 설정
  process.env.OPENCLAW_GATEWAY_PORT = String(MOCK_GW_PORT);

  // gateway-client 모듈 캐시 무효화 후 재로드
  delete require.cache[require.resolve('../launcher/gateway-client')];
  delete require.cache[require.resolve('../launcher/team-orchestrator')];
  delete require.cache[require.resolve('../launcher/handoff-writer')];

  const { orchestrate, loadTeamConfig, _estimateCost } = require('../launcher/team-orchestrator');
  const { saveHandoff, listHandoffs, readHandoff, HANDOFFS_DIR } = require('../launcher/handoff-writer');

  // Handoff 디렉토리를 임시 위치로 오버라이드
  // (handoff-writer의 HANDOFFS_DIR은 상수이므로 직접 오버라이드 불가 —
  //  orchestrate에서 저장하는 것만 테스트)

  const teamConfig = {
    enabled: true,
    roles: {
      planner: {
        model: 'openai-codex/gpt-4o-mini',
        systemPrompt: '당신은 작업 계획 전문가입니다. 계획만 수립하세요.',
        timeoutMs: 3000,
      },
      executor: {
        model: 'openai-codex/gpt-5.4',
        systemPrompt: '당신은 작업 실행 전문가입니다.\n\n[계획]\n{plan}\n\n[원본 요청]\n{request}\n\n실행하세요.',
        timeoutMs: 3000,
      },
    },
  };

  await startMockGateway();
  console.log('\n=== Team Orchestrator 테스트 ===\n');

  // 1. 정상 체이닝
  await test('정상 Planner→Executor 체이닝', async () => {
    const result = await orchestrate('테스트 요청', 'testuser', teamConfig, 'desktop');
    assert.ok(result.ok, 'result.ok should be true');
    assert.ok(result.text.includes('실행 완료'), `Expected "실행 완료" in: ${result.text}`);
    assert.ok(result.handoff, 'handoff should exist');
    assert.ok(result.handoff.id, 'handoff.id should exist');

    // 2번의 gateway 호출이 발생해야 함
    assert.strictEqual(mockRequests.length, 2, 'Should make 2 gateway calls');

    // 첫 번째: Planner
    assert.ok(
      mockRequests[0].model.includes('gpt-4o-mini'),
      `First call should use planner model, got: ${mockRequests[0].model}`,
    );

    // 두 번째: Executor
    assert.ok(
      mockRequests[1].model.includes('gpt-5.4'),
      `Second call should use executor model, got: ${mockRequests[1].model}`,
    );
  });

  // 2. Executor 프롬프트에 계획 포함 확인
  await test('Executor 프롬프트에 Planner 계획 포함', async () => {
    await orchestrate('프롬프트 테스트', 'testuser', teamConfig, 'desktop');

    const executorSystem = mockRequests[1].messages.find((m) => m.role === 'system')?.content || '';
    assert.ok(
      executorSystem.includes('작업 분석'),
      'Executor system prompt should contain planner output',
    );
    assert.ok(
      executorSystem.includes('프롬프트 테스트'),
      'Executor system prompt should contain original request',
    );
  });

  // 3. Handoff JSON 저장 확인
  await test('Handoff JSON 저장 검증', async () => {
    const result = await orchestrate('핸드오프 테스트', 'testuser', teamConfig, 'desktop');
    assert.ok(result.handoff, 'handoff should exist');
    assert.ok(result.handoff.id.startsWith('handoff-'), 'handoff.id should start with handoff-');

    // 파일 존재 확인
    assert.ok(fs.existsSync(result.handoff.path), 'handoff file should exist');

    // 파일 내용 검증
    const saved = JSON.parse(fs.readFileSync(result.handoff.path, 'utf8'));
    assert.strictEqual(saved.request, '핸드오프 테스트');
    assert.ok(saved.planner, 'planner data should exist');
    assert.ok(saved.executor, 'executor data should exist');
    assert.ok(saved.totalCost >= 0, 'totalCost should be >= 0');
    assert.ok(saved.totalTokens > 0, 'totalTokens should be > 0');
    assert.strictEqual(saved.source, 'desktop');

    // cleanup
    fs.unlinkSync(result.handoff.path);
  });

  // 4. Planner 실패 시 에러 처리
  await test('Planner 실패 시 에러 메시지 반환', async () => {
    const result = await orchestrate('fail-planner', 'testuser', teamConfig, 'desktop');
    assert.strictEqual(result.ok, false, 'result.ok should be false');
    assert.ok(result.text.includes('계획 수립 실패'), `Expected "계획 수립 실패" in: ${result.text}`);

    // Planner만 호출 (Executor 호출 안 함)
    assert.strictEqual(mockRequests.length, 1, 'Should only call planner on planner failure');

    // 실패 핸드오프도 저장
    assert.ok(result.handoff, 'failed handoff should still be saved');
    if (result.handoff?.path && fs.existsSync(result.handoff.path)) {
      fs.unlinkSync(result.handoff.path);
    }
  });

  // 5. Executor 실패 시 에러 처리
  await test('Executor 실패 시 에러 메시지 반환', async () => {
    const result = await orchestrate('fail-executor', 'testuser', teamConfig, 'desktop');
    assert.strictEqual(result.ok, false, 'result.ok should be false on executor failure');

    // 2번 호출 (Planner 성공 + Executor 실패)
    assert.strictEqual(mockRequests.length, 2, 'Should call both planner and executor');

    if (result.handoff?.path && fs.existsSync(result.handoff.path)) {
      fs.unlinkSync(result.handoff.path);
    }
  });

  // 6. 비용 합산 정확성
  await test('역할별 비용 합산 정확성', async () => {
    const result = await orchestrate('비용 테스트', 'testuser', teamConfig, 'desktop');
    assert.ok(result.handoff, 'handoff should exist');

    const saved = JSON.parse(fs.readFileSync(result.handoff.path, 'utf8'));
    const plannerCost = saved.planner.cost.total;
    const executorCost = saved.executor.cost.total;
    const totalCost = saved.totalCost;

    assert.ok(plannerCost >= 0, 'planner cost should be >= 0');
    assert.ok(executorCost >= 0, 'executor cost should be >= 0');

    const sum = plannerCost + executorCost;
    assert.ok(
      Math.abs(totalCost - sum) < 0.000001,
      `totalCost (${totalCost}) should equal sum of roles (${sum})`,
    );

    // Planner (gpt-4o-mini) 비용이 Executor (gpt-5.4)보다 낮아야 함
    assert.ok(
      plannerCost < executorCost,
      `Planner cost (${plannerCost}) should be less than Executor cost (${executorCost})`,
    );

    fs.unlinkSync(result.handoff.path);
  });

  // 7. 비용 추정 함수 단위 테스트
  await test('_estimateCost 함수 정확성', () => {
    const usage = { input: 1000, output: 500, totalTokens: 1500 };

    const miniCost = _estimateCost(usage, 'openai-codex/gpt-4o-mini');
    assert.ok(miniCost.total > 0, 'gpt-4o-mini cost should be > 0');

    const fullCost = _estimateCost(usage, 'openai-codex/gpt-5.4');
    assert.ok(fullCost.total > 0, 'gpt-5.4 cost should be > 0');

    assert.ok(
      miniCost.total < fullCost.total,
      `Mini cost (${miniCost.total}) should be less than full cost (${fullCost.total})`,
    );

    const nullCost = _estimateCost(null, 'unknown/model');
    assert.strictEqual(nullCost.total, 0, 'null usage should return 0 cost');
  });

  // 8. userId 전달 확인
  await test('userId가 gateway 호출에 전달됨', async () => {
    await orchestrate('유저 테스트', 'kakao-user-123', teamConfig, 'kakao');

    // Planner 호출의 user 필드
    assert.strictEqual(
      mockRequests[0].user,
      'team-planner:kakao-user-123',
      'Planner should include userId',
    );

    // Executor 호출의 user 필드
    assert.strictEqual(
      mockRequests[1].user,
      'team-executor:kakao-user-123',
      'Executor should include userId',
    );

    // handoff cleanup
    const handoffDir = path.join(os.homedir(), '.openclaw', 'handoffs');
    if (fs.existsSync(handoffDir)) {
      const files = fs.readdirSync(handoffDir).filter((f) => f.endsWith('.json'));
      const latest = files.sort().pop();
      if (latest) fs.unlinkSync(path.join(handoffDir, latest));
    }
  });

  // 9. Handoff listHandoffs 함수
  await test('listHandoffs — 최근 핸드오프 목록', async () => {
    // 테스트용 핸드오프 생성
    const r1 = await orchestrate('목록 테스트 1', 'testuser', teamConfig, 'desktop');
    const r2 = await orchestrate('목록 테스트 2', 'testuser', teamConfig, 'desktop');

    const list = await listHandoffs(20);
    assert.ok(list.length >= 2, `Should have at least 2 handoffs, got ${list.length}`);

    // 목록에 테스트 항목이 포함되어야 함
    const hasTestItem = list.some((h) => h.requestPreview.includes('목록 테스트'));
    assert.ok(hasTestItem, 'Should contain test request preview');
    assert.ok(list[0].totalCost >= 0, 'Should have totalCost');
    assert.ok(list[0].totalTokens > 0, 'Should have totalTokens');

    // cleanup
    if (r1.handoff?.path && fs.existsSync(r1.handoff.path)) fs.unlinkSync(r1.handoff.path);
    if (r2.handoff?.path && fs.existsSync(r2.handoff.path)) fs.unlinkSync(r2.handoff.path);
  });

  // 10. 잘못된 config 처리
  await test('잘못된 config — roles 없으면 에러', async () => {
    const badConfig = { enabled: true, roles: {} };
    const result = await orchestrate('에러 테스트', 'testuser', badConfig, 'desktop');
    assert.strictEqual(result.ok, false);
    assert.ok(result.text.includes('설정이 올바르지 않습니다'));
  });

  // 결과 출력
  console.log(`\n결과: ${passed} passed, ${failed} failed (총 ${passed + failed})`);

  // cleanup
  mockServer.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  if (mockServer) mockServer.close();
  process.exit(1);
});
