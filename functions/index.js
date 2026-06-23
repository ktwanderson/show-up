const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const DAILY_LIMIT = 50;
const FETCH_DAILY_LIMIT = 300;

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function requireAuthedUser(req, res) {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) { res.status(401).json({ error: 'unauthorized', message: 'Missing auth token.' }); return null; }
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
  } catch (e) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired auth token.' });
    return null;
  }
}

async function checkRateLimit(uid, bucket, limit, res) {
  const today = new Date().toISOString().slice(0, 10);
  const usageRef = admin.database().ref(`usage/${bucket}/${uid}/${today}`);
  let count;
  try {
    const txnResult = await usageRef.transaction(current => (current || 0) + 1);
    count = txnResult.snapshot.val();
  } catch (e) {
    res.status(500).json({ error: 'rate_limit_check_failed', message: 'Could not check usage limit.' });
    return false;
  }
  if (count > limit) {
    res.status(429).json({ error: 'daily_limit_exceeded', message: `Daily limit (${limit}) reached. Resets at midnight UTC.` });
    return false;
  }
  return true;
}

function isUrlSafe(urlStr) {
  let parsed;
  try { parsed = new URL(urlStr); } catch (e) { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return false;
  // Block private/internal IP ranges
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
  if (host.endsWith('.local') || host.endsWith('.internal')) return false;
  return true;
}

exports.callClaude = onRequest({ secrets: [ANTHROPIC_API_KEY], cors: true }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const uid = await requireAuthedUser(req, res);
  if (!uid) return;

  if (!(await checkRateLimit(uid, 'claude', DAILY_LIMIT, res))) return;

  // ── Forward to Anthropic ────────────────────────────────────
  const { prompt, maxTokens, model } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'bad_request', message: 'Missing prompt.' });
    return;
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY.value(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens || 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json({ error: 'anthropic_error', message: data?.error?.message || 'Anthropic API error.' });
      return;
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'network', message: e.message });
  }
});

exports.fetchUrl = onRequest({ cors: true }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const uid = await requireAuthedUser(req, res);
  if (!uid) return;

  if (!(await checkRateLimit(uid, 'fetch', FETCH_DAILY_LIMIT, res))) return;

  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).json({ error: 'bad_request', message: 'Missing url parameter.' });
    return;
  }
  if (!isUrlSafe(targetUrl)) {
    res.status(400).json({ error: 'bad_request', message: 'URL not allowed.' });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let resp;
    try {
      resp = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShowUpBot/1.0)' },
      });
    } finally {
      clearTimeout(timer);
    }
    const text = await resp.text();
    res.status(200).json({ ok: resp.ok, status: resp.status, contents: text });
  } catch (e) {
    res.status(502).json({ error: 'network', message: e.message });
  }
});
