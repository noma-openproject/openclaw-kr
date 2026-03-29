#!/usr/bin/env node
// scripts/scan-skill.js
// 스킬 설치 전 보안 스캔 — DefenseClaw 래퍼 + supply-chain-checklist 폴백
// Usage:
//   node scripts/scan-skill.js <skill-path>    # 스킬 경로 스캔
//   node scripts/scan-skill.js --checklist      # 수동 체크리스트 모드
const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCANS_DIR = path.join(os.homedir(), '.openclaw', 'scans');

// --- supply-chain-checklist 5항목 (§7-3a) ---
const CHECKLIST = [
  { id: 'publisher', question: '검증된 퍼블리셔 또는 팀 allowlist에 등록되어 있나요?', critical: true },
  { id: 'permissions', question: '권한 매니페스트를 검토했나요? (파일/네트워크/명령 접근 범위)', critical: true },
  { id: 'version', question: '버전이 고정되어 있나요? (latest 태그가 아닌 특정 버전)', critical: false },
  { id: 'isolation', question: '격리 환경에서 테스트했나요? (Docker, 별도 브랜치)', critical: false },
  { id: 'source', question: '스킬 소스코드/SKILL.md를 직접 확인했나요?', critical: true },
];

// --- DefenseClaw 설치 확인 ---
function isDefenseClawInstalled() {
  try {
    execSync('which defenseclaw', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// --- DefenseClaw 스캔 ---
function runDefenseClawScan(skillPath) {
  console.log(`[scan] DefenseClaw skill-scanner 실행: ${skillPath}`);
  try {
    const output = execSync(`defenseclaw scan --skill "${skillPath}" --format json`, {
      encoding: 'utf8',
      timeout: 60000,
    });
    return JSON.parse(output);
  } catch (/** @type {any} */ err) {
    console.error(`[scan] DefenseClaw 실행 실패: ${err.message}`);
    return null;
  }
}

// --- 대화형 체크리스트 ---
function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function runManualChecklist(skillPath) {
  console.log('\n=== Supply-Chain Security Checklist ===');
  console.log(`대상: ${skillPath || '(미지정)'}\n`);

  const results = [];
  let passCount = 0;
  let criticalFail = false;

  for (const item of CHECKLIST) {
    const answer = await ask(`  ${item.question} (y/n): `);
    const passed = answer === 'y' || answer === 'yes';
    results.push({ ...item, passed });
    if (passed) {
      passCount++;
      console.log(`    ✅ ${item.id}`);
    } else {
      console.log(`    ❌ ${item.id}${item.critical ? ' (CRITICAL)' : ''}`);
      if (item.critical) criticalFail = true;
    }
  }

  return { results, passCount, total: CHECKLIST.length, criticalFail };
}

// --- 정적 분석 (기본) ---
function staticAnalysis(skillPath) {
  const analysis = {
    path: skillPath,
    exists: false,
    hasPackageJson: false,
    hasSkillMd: false,
    fileCount: 0,
    dependencies: [],
    networkPatterns: [],
    shellPatterns: [],
  };

  if (!fs.existsSync(skillPath)) return analysis;
  analysis.exists = true;

  // package.json 확인
  const pkgPath = path.join(skillPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    analysis.hasPackageJson = true;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      analysis.dependencies = Object.keys(pkg.dependencies || {});
    } catch {
      // parse fail
    }
  }

  // SKILL.md 확인
  analysis.hasSkillMd = fs.existsSync(path.join(skillPath, 'SKILL.md'));

  // 파일 수 + 패턴 검출
  const files = [];
  function walk(dir) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && /\.(js|ts|mjs|cjs)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // permission error
    }
  }
  walk(skillPath);
  analysis.fileCount = files.length;

  // 위험 패턴 검출
  const networkRe = /fetch\(|http\.request|https\.request|net\.connect|child_process/g;
  const shellRe = /exec\(|execSync|spawn\(|spawnSync/g;

  for (const file of files.slice(0, 50)) { // 최대 50파일
    try {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(skillPath, file);
      if (networkRe.test(content)) {
        analysis.networkPatterns.push(relPath);
      }
      if (shellRe.test(content)) {
        analysis.shellPatterns.push(relPath);
      }
    } catch {
      // read fail
    }
  }

  return analysis;
}

// --- 판정 ---
function judge(checklistResult, analysis) {
  // BLOCK: critical 항목 미충족
  if (checklistResult?.criticalFail) return 'BLOCK';

  // BLOCK: 쉘 실행 패턴 발견 + 권한 미검토
  if (analysis.shellPatterns.length > 0) {
    const permChecked = checklistResult?.results?.find((r) => r.id === 'permissions')?.passed;
    if (!permChecked) return 'BLOCK';
  }

  // REVIEW: 네트워크 패턴 발견 또는 체크리스트 2개 이상 미충족
  if (analysis.networkPatterns.length > 0) return 'REVIEW';
  if (checklistResult && checklistResult.passCount < checklistResult.total - 1) return 'REVIEW';

  return 'PASS';
}

// --- 결과 저장 ---
function saveScanResult(result) {
  if (!fs.existsSync(SCANS_DIR)) {
    fs.mkdirSync(SCANS_DIR, { recursive: true });
  }
  const filename = `scan-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
  const filePath = path.join(SCANS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[scan] 결과 저장: ${filePath}`);
  return filePath;
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const isChecklistOnly = args.includes('--checklist');
  const skillPath = args.find((a) => !a.startsWith('--')) || '.';

  const result = {
    timestamp: new Date().toISOString(),
    skillPath: path.resolve(skillPath),
    scanner: 'manual',
    analysis: /** @type {any} */ (null),
    checklist: /** @type {any} */ (null),
    defenseClaw: /** @type {any} */ (null),
    verdict: 'REVIEW',
  };

  // DefenseClaw 확인
  const hasDC = isDefenseClawInstalled();
  if (hasDC && !isChecklistOnly) {
    console.log('[scan] DefenseClaw 감지됨 — 자동 스캔 모드');
    result.scanner = 'defenseclaw';
    result.defenseClaw = runDefenseClawScan(skillPath);
  } else {
    if (!hasDC) {
      console.log('[scan] DefenseClaw 미설치 — 수동 체크리스트 + 정적 분석 모드');
      console.log('[scan] 설치: pip install defenseclaw (https://github.com/cisco-ai-defense/defenseclaw)');
    }
  }

  // 정적 분석
  console.log(`\n[scan] 정적 분석: ${skillPath}`);
  result.analysis = staticAnalysis(skillPath);

  if (result.analysis.exists) {
    console.log(`  파일: ${result.analysis.fileCount}개 JS/TS`);
    console.log(`  의존성: ${result.analysis.dependencies.length}개`);
    console.log(`  네트워크 패턴: ${result.analysis.networkPatterns.length}개 파일`);
    console.log(`  쉘 실행 패턴: ${result.analysis.shellPatterns.length}개 파일`);
    if (result.analysis.networkPatterns.length > 0) {
      console.log(`    ⚠️  네트워크: ${result.analysis.networkPatterns.join(', ')}`);
    }
    if (result.analysis.shellPatterns.length > 0) {
      console.log(`    ⚠️  쉘 실행: ${result.analysis.shellPatterns.join(', ')}`);
    }
  } else {
    console.log(`  ❌ 경로 없음: ${skillPath}`);
  }

  // 체크리스트 (DefenseClaw 없거나 --checklist)
  if (!hasDC || isChecklistOnly) {
    result.checklist = await runManualChecklist(skillPath);
  }

  // 판정
  result.verdict = judge(result.checklist, result.analysis);

  console.log(`\n=== 판정: ${result.verdict} ===`);
  switch (result.verdict) {
    case 'PASS':
      console.log('  ✅ 설치 진행 가능');
      break;
    case 'REVIEW':
      console.log('  ⚠️  추가 검토 필요 — 네트워크/권한 확인 후 진행');
      break;
    case 'BLOCK':
      console.log('  ❌ 설치 차단 — critical 보안 항목 미충족');
      break;
  }

  saveScanResult(result);
}

main().catch((err) => {
  console.error(`[scan] Error: ${err.message}`);
  process.exit(1);
});
