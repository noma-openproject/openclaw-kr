'use strict';

const crypto = require('node:crypto');

/**
 * @typedef {'connected'|'processing'|'delayed'|'error'} ChannelStatus
 */

/**
 * 인메모리 중복 감지 + 채널 상태 추적
 */
class ChannelReliability {
  /**
   * @param {Object} [options]
   * @param {number} [options.dedupWindowMs=2000] — 중복 판정 윈도우
   * @param {number} [options.cleanupIntervalMs=60000] — 정리 주기
   * @param {number} [options.delayThresholdMs=10000] — 지연 판정 기준
   */
  constructor(options = {}) {
    this.dedupWindowMs = options.dedupWindowMs || 2000;
    this.delayThresholdMs = options.delayThresholdMs || 10000;

    /** @type {Map<string, number>} hash → timestamp */
    this._recentRequests = new Map();

    /** @type {Map<string, {status: ChannelStatus, lastActivity: number, pendingCount: number}>} */
    this._channels = new Map();

    const cleanupMs = options.cleanupIntervalMs || 60000;
    this._cleanupTimer = setInterval(() => this.cleanup(), cleanupMs);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  /**
   * 요청 해시 생성
   * @param {string} userId
   * @param {string} utterance
   * @returns {string}
   */
  _hash(userId, utterance) {
    return crypto
      .createHash('md5')
      .update(`${userId}:${utterance}`)
      .digest('hex');
  }

  /**
   * 중복 요청 판정
   * @param {string} userId
   * @param {string} utterance
   * @returns {boolean}
   */
  isDuplicate(userId, utterance) {
    const hash = this._hash(userId, utterance);
    const now = Date.now();
    const prev = this._recentRequests.get(hash);

    if (prev && now - prev < this.dedupWindowMs) {
      return true;
    }

    this._recentRequests.set(hash, now);
    return false;
  }

  /**
   * 요청 기록 (채널 상태 → processing)
   * @param {string} channelId
   * @param {string} _requestId
   */
  recordRequest(channelId, _requestId) {
    const ch = this._channels.get(channelId) || {
      status: /** @type {ChannelStatus} */ ('connected'),
      lastActivity: 0,
      pendingCount: 0,
    };
    ch.status = 'processing';
    ch.lastActivity = Date.now();
    ch.pendingCount++;
    this._channels.set(channelId, ch);
  }

  /**
   * 응답 기록 (채널 상태 자동 갱신)
   * @param {string} channelId
   * @param {string} _requestId
   * @param {boolean} ok
   */
  recordResponse(channelId, _requestId, ok) {
    const ch = this._channels.get(channelId);
    if (!ch) return;

    ch.pendingCount = Math.max(0, ch.pendingCount - 1);
    ch.lastActivity = Date.now();

    if (!ok) {
      ch.status = 'error';
    } else if (ch.pendingCount === 0) {
      ch.status = 'connected';
    }
    // pendingCount > 0이면 'processing' 유지
  }

  /**
   * 채널 상태 조회
   * @param {string} channelId
   * @returns {ChannelStatus}
   */
  getChannelStatus(channelId) {
    const ch = this._channels.get(channelId);
    if (!ch) return 'connected';

    // 지연 감지: processing 상태가 임계값 초과
    if (ch.status === 'processing' && Date.now() - ch.lastActivity > this.delayThresholdMs) {
      ch.status = 'delayed';
    }

    return ch.status;
  }

  /**
   * 채널 상태 수동 설정
   * @param {string} channelId
   * @param {ChannelStatus} status
   */
  setChannelStatus(channelId, status) {
    const ch = this._channels.get(channelId) || {
      status: /** @type {ChannelStatus} */ ('connected'),
      lastActivity: Date.now(),
      pendingCount: 0,
    };
    ch.status = status;
    ch.lastActivity = Date.now();
    this._channels.set(channelId, ch);
  }

  /**
   * 만료 항목 정리
   */
  cleanup() {
    const now = Date.now();
    for (const [hash, ts] of this._recentRequests) {
      if (now - ts > this.dedupWindowMs * 10) {
        this._recentRequests.delete(hash);
      }
    }
  }

  /**
   * 타이머 정리 (테스트용)
   */
  destroy() {
    if (this._cleanupTimer) clearInterval(this._cleanupTimer);
  }
}

module.exports = { ChannelReliability };
