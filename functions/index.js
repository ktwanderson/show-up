const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const DAILY_LIMIT = 50;

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

exports.callClaude = onRequest({ secrets: [ANTHROPIC_API_KEY], cors: true }, async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  // ── Auth: require a valid Firebase ID token ─────────────────
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) { res.status(401).json({ error: 'unauthorized', message: 'Missing auth token.' }); return; }

  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired auth token.' });
    return;
  }

  // ── Rate limit: N requests per UTC day per user ─────────────
  const today = new Date().toISOString().slice(0, 10);
  const usageRef = admin.database().ref(`usage/${uid}/${today}`);
  let count;
  try {
    const txnResult = await usageRef.transaction(current => (current || 0) + 1);
    count = txnResult.snapshot.val();
  } catch (e) {
    res.status(500).json({ error: 'rate_limit_check_failed', message: 'Could not check usage limit.' });
    return;
  }
  if (count > DAILY_LIMIT) {
    res.status(429).json({ error: 'daily_limit_exceeded', message: `Daily AI request limit (${DAILY_LIMIT}) reached. Resets at midnight UTC.` });
    return;
  }

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
