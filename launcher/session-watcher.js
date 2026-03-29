// launcher/session-watcher.js
// OpenClaw JSONL 세션 파일을 tail-follow하여 실행 영수증 데이터를 추출한다.
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSIONS_DIR = path.join(
  os.homedir(),
  '.openclaw',
  'agents',
  'main',
  'sessions',
);

const SESSIONS_INDEX = path.join(SESSIONS_DIR, 'sessions.json');

class SessionWatcher extends EventEmitter {
  constructor() {
    super();
    /** @type {string} */ this._activeSessionId = '';
    /** @type {string} */ this._activeFile = '';
    /** @type {number} */ this._offset = 0;
    /** @type {fs.FSWatcher|null} */ this._fileWatcher = null;
    /** @type {fs.FSWatcher|null} */ this._indexWatcher = null;
    /** @type {NodeJS.Timeout|null} */ this._pollTimer = null;

    // 상태 머신
    /** @type {'idle'|'running'|'finished'|'failed'} */
    this.state = 'idle';
    this.model = '';
    this.provider = '';

    // 영수증 히스토리 (최근 10개)
    /** @type {Array<object>} */
    this.receipts = [];

    // 세션 비용 누적
    this.sessionUsage = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
    };
    this.sessionCost = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    };

    // running 시작 시각 (경과시간 계산용)
    /** @type {number|null} */ this._runStartTime = null;
  }

  /** watcher 시작 */
  start() {
    this._findActiveSession();
    this._watchIndex();
  }

  /** watcher 정지 */
  stop() {
    if (this._fileWatcher) {
      this._fileWatcher.close();
      this._fileWatcher = null;
    }
    if (this._indexWatcher) {
      this._indexWatcher.close();
      this._indexWatcher = null;
    }
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  /** sessions.json에서 가장 최근 세션 ID 찾기 */
  _findActiveSession() {
    try {
      const indexData = JSON.parse(fs.readFileSync(SESSIONS_INDEX, 'utf8'));
      let latest = { id: '', updatedAt: 0 };
      for (const [, session] of Object.entries(indexData)) {
        const s = /** @type {{ sessionId: string; updatedAt: number }} */ (
          session
        );
        if (s.updatedAt > latest.updatedAt) {
          latest = { id: s.sessionId, updatedAt: s.updatedAt };
        }
      }
      if (latest.id && latest.id !== this._activeSessionId) {
        this._switchSession(latest.id);
      }
    } catch {
      // sessions.json 없거나 파싱 실패 → 무시
    }
  }

  /** 세션 전환 @param {string} sessionId */
  _switchSession(sessionId) {
    this._activeSessionId = sessionId;
    this._activeFile = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
    this._offset = 0;

    // 누적 리셋
    this._resetSession();

    // 기존 JSONL 전체 읽기 (히스토리 복원)
    this._readNewLines();

    // 파일 감시 시작
    this._watchFile();
  }

  /** 세션 비용 리셋 */
  _resetSession() {
    this.receipts = [];
    this.sessionUsage = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
    };
    this.sessionCost = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    };
    this.state = 'idle';
    this.model = '';
    this.provider = '';
    this._runStartTime = null;
  }

  /** sessions.json 감시 (세션 전환 감지) */
  _watchIndex() {
    try {
      this._indexWatcher = fs.watch(SESSIONS_INDEX, () => {
        this._findActiveSession();
      });
    } catch {
      // 디렉토리 없으면 폴링으로 폴백
      this._pollTimer = setInterval(() => this._findActiveSession(), 5000);
    }
  }

  /** JSONL 파일 감시 */
  _watchFile() {
    if (this._fileWatcher) {
      this._fileWatcher.close();
    }
    try {
      this._fileWatcher = fs.watch(this._activeFile, () => {
        this._readNewLines();
      });
    } catch {
      // watch 실패 시 폴링 폴백
      if (!this._pollTimer) {
        this._pollTimer = setInterval(() => this._readNewLines(), 1000);
      }
    }
  }

  /** 새 라인 읽기 (tail-follow) */
  _readNewLines() {
    if (!this._activeFile) return;

    try {
      const stat = fs.statSync(this._activeFile);
      if (stat.size <= this._offset) return;

      const fd = fs.openSync(this._activeFile, 'r');
      const buf = Buffer.alloc(stat.size - this._offset);
      fs.readSync(fd, buf, 0, buf.length, this._offset);
      fs.closeSync(fd);

      this._offset = stat.size;

      const text = buf.toString('utf8');
      const lines = text.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          this._processEntry(entry);
        } catch {
          // 잘린 JSON 라인 무시
        }
      }
    } catch {
      // 파일 읽기 실패 무시
    }
  }

  /** JSONL 엔트리 처리 @param {any} entry */
  _processEntry(entry) {
    switch (entry.type) {
      case 'session':
        // 세션 시작 — 이미 _switchSession에서 리셋함
        break;

      case 'model_change':
        this.model = entry.modelId || '';
        this.provider = entry.provider || '';
        this.emit('model-change', {
          model: this.model,
          provider: this.provider,
        });
        break;

      case 'message':
        this._processMessage(entry);
        break;
    }
  }

  /** 메시지 엔트리 처리 (핵심) @param {any} entry */
  _processMessage(entry) {
    const msg = entry.message;
    if (!msg) return;

    if (msg.role === 'user') {
      // 사용자 메시지 → running 상태로 전환
      this.state = 'running';
      this._runStartTime = Date.now();
      this.emit('state-change', { state: this.state });
      return;
    }

    if (msg.role === 'assistant') {
      const usage = msg.usage;
      const cost = usage?.cost;
      const elapsed = this._runStartTime
        ? Date.now() - this._runStartTime
        : undefined;

      // 상태 결정
      if (msg.stopReason === 'error' || msg.errorMessage) {
        this.state = 'failed';
      } else {
        this.state = 'finished';
      }

      // 모델 업데이트
      if (msg.model) this.model = msg.model;
      if (msg.provider) this.provider = msg.provider;

      // 영수증 생성
      const receipt = {
        id: entry.id || `r-${Date.now()}`,
        sessionId: this._activeSessionId,
        timestamp: entry.timestamp || new Date().toISOString(),
        state: this.state,
        model: this.model,
        provider: this.provider,
        usage: usage
          ? {
              input: usage.input || 0,
              output: usage.output || 0,
              cacheRead: usage.cacheRead || 0,
              cacheWrite: usage.cacheWrite || 0,
              totalTokens: usage.totalTokens || 0,
            }
          : {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
            },
        cost: cost
          ? {
              input: cost.input || 0,
              output: cost.output || 0,
              cacheRead: cost.cacheRead || 0,
              cacheWrite: cost.cacheWrite || 0,
              total: cost.total || 0,
            }
          : { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        elapsedMs: elapsed,
        stopReason: msg.stopReason,
        errorMessage: msg.errorMessage,
      };

      // 히스토리에 추가 (최근 10개)
      this.receipts.unshift(receipt);
      if (this.receipts.length > 10) this.receipts.pop();

      // 세션 비용 누적
      if (usage) {
        this.sessionUsage.input += usage.input || 0;
        this.sessionUsage.output += usage.output || 0;
        this.sessionUsage.cacheRead += usage.cacheRead || 0;
        this.sessionUsage.cacheWrite += usage.cacheWrite || 0;
        this.sessionUsage.totalTokens += usage.totalTokens || 0;
      }
      if (cost) {
        this.sessionCost.input += cost.input || 0;
        this.sessionCost.output += cost.output || 0;
        this.sessionCost.cacheRead += cost.cacheRead || 0;
        this.sessionCost.cacheWrite += cost.cacheWrite || 0;
        this.sessionCost.total += cost.total || 0;
      }

      this.emit('receipt', receipt);
      this.emit('state-change', { state: this.state });

      // 10초 후 idle로 복귀
      this._runStartTime = null;
      setTimeout(() => {
        if (this.state === 'finished' || this.state === 'failed') {
          this.state = 'idle';
          this.emit('state-change', { state: this.state });
        }
      }, 10_000);
    }
  }

  /**
   * 외부에서 영수증을 추가 (Team Orchestrator 등에서 사용)
   * @param {Record<string, any>} receipt - ExecutionReceipt 형식
   */
  addExternalReceipt(receipt) {
    // 히스토리에 추가
    this.receipts.unshift(receipt);
    if (this.receipts.length > 10) this.receipts.pop();

    // 세션 비용 누적
    const usage = receipt.usage;
    const cost = receipt.cost;
    if (usage) {
      this.sessionUsage.input += usage.input || 0;
      this.sessionUsage.output += usage.output || 0;
      this.sessionUsage.cacheRead += usage.cacheRead || 0;
      this.sessionUsage.cacheWrite += usage.cacheWrite || 0;
      this.sessionUsage.totalTokens += usage.totalTokens || 0;
    }
    if (cost) {
      this.sessionCost.input += cost.input || 0;
      this.sessionCost.output += cost.output || 0;
      this.sessionCost.cacheRead += cost.cacheRead || 0;
      this.sessionCost.cacheWrite += cost.cacheWrite || 0;
      this.sessionCost.total += cost.total || 0;
    }

    this.emit('receipt', receipt);
  }

  /** 현재 세션 비용 요약 반환 */
  getSessionCostSummary() {
    // 모델별 사용 분포 집계
    /** @type {Map<string, {count: number, totalTokens: number, totalCost: number}>} */
    const modelMap = new Map();
    for (const r of /** @type {Array<Record<string, any>>} */ (this.receipts)) {
      const key = r.model || 'unknown';
      const entry = modelMap.get(key) || { count: 0, totalTokens: 0, totalCost: 0 };
      entry.count++;
      entry.totalTokens += r.usage?.totalTokens || 0;
      entry.totalCost += r.cost?.total || 0;
      modelMap.set(key, entry);
    }
    const modelBreakdown = Array.from(modelMap.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.totalCost - a.totalCost);

    return {
      sessionId: this._activeSessionId,
      totalReceipts: this.receipts.length,
      usage: { ...this.sessionUsage },
      cost: { ...this.sessionCost },
      currentModel: this.model,
      currentProvider: this.provider,
      modelBreakdown,
    };
  }
}

module.exports = { SessionWatcher };
