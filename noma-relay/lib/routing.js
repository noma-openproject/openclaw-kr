'use strict';
// noma-relay/lib/routing.js
// 라우팅 테이블 CRUD — Vercel KV (prod) / JSON 파일 (local test)

const PENDING_PREFIX = 'pending:';
const BINDING_PREFIX = 'binding:';
const HEARTBEAT_PREFIX = 'heartbeat:';

// ---------------------------------------------------------------------------
// Storage backends
// ---------------------------------------------------------------------------

/** In-memory + JSON file backend (local testing / NOMA_RELAY_STORAGE=file) */
class FileStore {
  constructor() {
    this._data = new Map();
  }

  async get(key) {
    const entry = this._data.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this._data.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, opts) {
    const entry = { value };
    if (opts && opts.px) {
      entry.expiresAt = Date.now() + opts.px;
    } else if (opts && opts.ex) {
      entry.expiresAt = Date.now() + opts.ex * 1000;
    }
    this._data.set(key, entry);
  }

  async del(key) {
    this._data.delete(key);
  }
}

/** Upstash Redis backend (production) */
function getRedisStore() {
  // Lazy-load to avoid import errors in non-Vercel environments
  const { Redis } = require('@upstash/redis');
  const redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return {
    async get(key) { return redis.get(key); },
    async set(key, value, opts) {
      if (opts && opts.ex) return redis.set(key, value, { ex: opts.ex });
      return redis.set(key, value);
    },
    async del(key) { return redis.del(key); },
  };
}

/** @returns {FileStore | ReturnType<typeof getKvStore>} */
function getStore() {
  if (process.env.NOMA_RELAY_STORAGE === 'file' || process.env.NODE_ENV === 'test') {
    if (!FileStore._instance) FileStore._instance = new FileStore();
    return FileStore._instance;
  }
  return getRedisStore();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 임시 페어링 코드 등록 (TTL 적용)
 * @param {string} code - 6자리 페어링 코드
 * @param {string} endpoint - ngrok URL
 * @param {number} ttlMs - 만료 시간 (ms)
 */
async function setPending(code, endpoint, ttlMs) {
  const store = getStore();
  const ttlSec = Math.ceil(ttlMs / 1000);
  // FileStore uses px (ms) for precision; Vercel KV uses ex (seconds)
  await store.set(`${PENDING_PREFIX}${code}`, { endpoint, createdAt: Date.now() }, { ex: ttlSec, px: ttlMs });
}

/**
 * 임시 페어링 코드 조회
 * @param {string} code
 * @returns {Promise<{endpoint: string, createdAt: number}|null>}
 */
async function getPending(code) {
  const store = getStore();
  return store.get(`${PENDING_PREFIX}${code}`);
}

/**
 * 임시 페어링 코드 삭제
 * @param {string} code
 */
async function deletePending(code) {
  const store = getStore();
  await store.del(`${PENDING_PREFIX}${code}`);
}

/**
 * userId ↔ endpoint 영구 바인딩
 * @param {string} userId
 * @param {string} endpoint
 */
async function bindUser(userId, endpoint) {
  const store = getStore();
  await store.set(`${BINDING_PREFIX}${userId}`, { endpoint, boundAt: Date.now() });
}

/**
 * userId → endpoint 조회
 * @param {string} userId
 * @returns {Promise<string|null>} endpoint URL or null
 */
async function getEndpoint(userId) {
  const store = getStore();
  const data = await store.get(`${BINDING_PREFIX}${userId}`);
  return data ? data.endpoint : null;
}

/**
 * userId 바인딩 삭제
 * @param {string} userId
 */
async function unbindUser(userId) {
  const store = getStore();
  await store.del(`${BINDING_PREFIX}${userId}`);
}

/**
 * heartbeat 갱신 + endpoint 업데이트
 * @param {string} userId
 * @param {string} endpoint
 */
async function updateHeartbeat(userId, endpoint) {
  const store = getStore();
  // endpoint도 함께 갱신 (ngrok URL 변경 대응)
  await store.set(`${BINDING_PREFIX}${userId}`, { endpoint, boundAt: Date.now() });
  await store.set(`${HEARTBEAT_PREFIX}${userId}`, { lastSeen: Date.now() }, { ex: 600 }); // 10분 TTL
}

/**
 * heartbeat 조회 (online 여부 판단)
 * @param {string} userId
 * @returns {Promise<{lastSeen: number}|null>}
 */
async function getHeartbeat(userId) {
  const store = getStore();
  return store.get(`${HEARTBEAT_PREFIX}${userId}`);
}

/** 테스트용: FileStore 초기화 */
function _resetFileStore() {
  if (FileStore._instance) FileStore._instance._data.clear();
}

module.exports = {
  setPending,
  getPending,
  deletePending,
  bindUser,
  getEndpoint,
  unbindUser,
  updateHeartbeat,
  getHeartbeat,
  _resetFileStore,
};
