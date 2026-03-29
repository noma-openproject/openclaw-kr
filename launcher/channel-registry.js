'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const BINDINGS_PATH = path.join(os.homedir(), '.openclaw', 'channel-bindings.json');

/**
 * @typedef {Object} ChannelBinding
 * @property {string} platform — 'kakao' | 'telegram' | 'desktop'
 * @property {string} userId
 * @property {string} sessionId
 * @property {string} boundAt — ISO timestamp
 * @property {string} [threadId]
 */

/**
 * 채널 → 세션 매핑 레지스트리.
 * 인메모리 + 선택적 파일 persistence.
 */
class ChannelRegistry {
  constructor() {
    /** @type {Map<string, ChannelBinding>} key = "platform:userId" */
    this._bindings = new Map();
    this._load();
  }

  /**
   * @param {string} platform
   * @param {string} userId
   * @returns {string}
   */
  _key(platform, userId) {
    return `${platform}:${userId}`;
  }

  /**
   * 파일에서 바인딩 로드
   */
  _load() {
    try {
      if (fs.existsSync(BINDINGS_PATH)) {
        const data = JSON.parse(fs.readFileSync(BINDINGS_PATH, 'utf8'));
        if (Array.isArray(data)) {
          for (const b of data) {
            this._bindings.set(this._key(b.platform, b.userId), b);
          }
        }
      }
    } catch {
      // 파일 없거나 파싱 실패 — 빈 상태로 시작
    }
  }

  /**
   * 파일에 바인딩 저장
   */
  _save() {
    try {
      const dir = path.dirname(BINDINGS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = Array.from(this._bindings.values());
      fs.writeFileSync(BINDINGS_PATH, JSON.stringify(data, null, 2));
    } catch {
      // 저장 실패 — 인메모리는 유지
    }
  }

  /**
   * 채널을 세션에 바인딩
   * @param {string} platform
   * @param {string} userId
   * @param {string} sessionId
   * @param {string} [threadId]
   */
  bind(platform, userId, sessionId, threadId) {
    /** @type {ChannelBinding} */
    const binding = {
      platform,
      userId,
      sessionId,
      boundAt: new Date().toISOString(),
    };
    if (threadId) binding.threadId = threadId;
    this._bindings.set(this._key(platform, userId), binding);
    this._save();
  }

  /**
   * 채널의 세션 ID 조회
   * @param {string} platform
   * @param {string} userId
   * @returns {string|null}
   */
  lookup(platform, userId) {
    const b = this._bindings.get(this._key(platform, userId));
    return b ? b.sessionId : null;
  }

  /**
   * 바인딩 해제
   * @param {string} platform
   * @param {string} userId
   * @returns {boolean}
   */
  unbind(platform, userId) {
    const deleted = this._bindings.delete(this._key(platform, userId));
    if (deleted) this._save();
    return deleted;
  }

  /**
   * 전체 바인딩 목록
   * @returns {ChannelBinding[]}
   */
  listBindings() {
    return Array.from(this._bindings.values());
  }

  /**
   * 전체 초기화 (테스트용)
   */
  clear() {
    this._bindings.clear();
    this._save();
  }
}

module.exports = { ChannelRegistry, BINDINGS_PATH };
