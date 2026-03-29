// launcher/handoff-writer.js
// Handoff 파일 시스템 — Team 오케스트레이션 결과를 로컬 JSON으로 기록
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const HANDOFFS_DIR = path.join(os.homedir(), '.openclaw', 'handoffs');

/**
 * Handoff 데이터를 JSON 파일로 저장
 * @param {Record<string, unknown>} data - Handoff 데이터 (planner, executor, 비용 등)
 * @returns {Promise<{id: string, path: string}>}
 */
async function saveHandoff(data) {
  // 디렉토리 자동 생성
  if (!fs.existsSync(HANDOFFS_DIR)) {
    fs.mkdirSync(HANDOFFS_DIR, { recursive: true });
  }

  const now = new Date(/** @type {string|number} */ (data.timestamp) || Date.now());
  const shortId = crypto.randomBytes(2).toString('hex');
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHmmss
  const id = `handoff-${dateStr.replace(/-/g, '')}-${timeStr}-${shortId}`;
  const filename = `${dateStr}_${timeStr}_${shortId}.json`;
  const filePath = path.join(HANDOFFS_DIR, filename);

  const handoff = {
    id,
    ...data,
  };

  fs.writeFileSync(filePath, JSON.stringify(handoff, null, 2), 'utf8');
  console.log(`[handoff] saved: ${filename}`);

  return { id, path: filePath };
}

/**
 * 최근 N개 핸드오프 목록 (요약)
 * @param {number} [limit=10]
 * @returns {Promise<Array<any>>}
 */
async function listHandoffs(limit = 10) {
  if (!fs.existsSync(HANDOFFS_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(HANDOFFS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit);

  return files.map((f) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(HANDOFFS_DIR, f), 'utf8'));
      return {
        id: data.id,
        timestamp: data.timestamp,
        requestPreview: (data.request || '').slice(0, 50),
        totalCost: data.totalCost || 0,
        totalTokens: data.totalTokens || 0,
        source: data.source || 'unknown',
      };
    } catch {
      return null;
    }
  }).filter(/** @param {any} item @returns {boolean} */ (item) => item !== null);
}

/**
 * 특정 핸드오프 상세 읽기
 * @param {string} id - Handoff ID
 * @returns {Promise<object|null>}
 */
async function readHandoff(id) {
  if (!fs.existsSync(HANDOFFS_DIR)) {
    return null;
  }

  const files = fs.readdirSync(HANDOFFS_DIR).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(HANDOFFS_DIR, f), 'utf8'));
      if (data.id === id) return data;
    } catch {
      // skip corrupt files
    }
  }
  return null;
}

module.exports = {
  saveHandoff,
  listHandoffs,
  readHandoff,
  HANDOFFS_DIR,
};
