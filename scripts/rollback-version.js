#!/usr/bin/env node
// scripts/rollback-version.js
// OpenClaw known-good 버전으로 롤백
// Usage:
//   node scripts/rollback-version.js           # 기본 known-good (2026.3.23-2)
//   node scripts/rollback-version.js 2026.3.25 # 특정 버전
const { execSync } = require('child_process');
const readline = require('readline');

const KNOWN_GOOD_VERSION = '2026.3.23-2';

function getCurrentVersion() {
  try {
    const pkgPath = require.resolve('openclaw/package.json');
    const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'not-installed';
  }
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  const targetVersion = process.argv[2] || KNOWN_GOOD_VERSION;
  const currentVersion = getCurrentVersion();

  console.log('\n=== OpenClaw Version Rollback ===');
  console.log(`  현재 버전:  v${currentVersion}`);
  console.log(`  대상 버전:  v${targetVersion}`);

  if (currentVersion === targetVersion) {
    console.log('\n  이미 대상 버전입니다. 롤백이 필요하지 않습니다.');
    process.exit(0);
  }

  console.log('\n  이 작업은 다음을 수행합니다:');
  console.log(`  1. npm install -g openclaw@${targetVersion}`);
  console.log('  2. Gateway 재시작 안내');
  console.log('');

  const answer = await ask('  계속하시겠습니까? (y/n): ');
  if (answer !== 'y' && answer !== 'yes') {
    console.log('  롤백이 취소되었습니다.');
    process.exit(0);
  }

  console.log(`\n  [1/2] npm install -g openclaw@${targetVersion} ...`);
  try {
    execSync(`npm install -g openclaw@${targetVersion}`, { stdio: 'inherit' });
    console.log('  ✅ 설치 완료');
  } catch (err) {
    console.error('  ❌ 설치 실패');
    console.error(`  ${/** @type {any} */ (err).message}`);
    process.exit(1);
  }

  const newVersion = getCurrentVersion();
  console.log(`\n  [2/2] 설치된 버전: v${newVersion}`);

  if (newVersion === targetVersion) {
    console.log('  ✅ 롤백 성공');
  } else {
    console.warn(`  ⚠️  버전 불일치: 기대 v${targetVersion}, 실제 v${newVersion}`);
  }

  console.log('\n  다음 단계:');
  console.log('  1. OpenClaw gateway를 재시작하세요');
  console.log('  2. Noma launcher를 재시작하세요');
  console.log('  3. node scripts/capability-audit.js 로 capability 확인');
  console.log('');
}

main().catch((err) => {
  console.error(`[rollback] Error: ${err.message}`);
  process.exit(1);
});
