'use strict';
// noma-relay/api/register.js
// 로컬 Noma가 페어링 코드 + endpoint를 임시 등록

const routing = require('../lib/routing');

const PAIRING_TTL_MS = 300_000; // 5분

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Auth check
  const secret = process.env.NOMA_RELAY_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  let body;
  try {
    body = await parseBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  const { code, endpoint } = body || {};
  if (!code || !endpoint || !/^\d{6}$/.test(code)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'code (6 digits) and endpoint are required' }));
    return;
  }

  try {
    await routing.setPending(code, endpoint, PAIRING_TTL_MS);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, expiresIn: PAIRING_TTL_MS }));
  } catch (/** @type {any} */ e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) { resolve(req.body); return; }
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
