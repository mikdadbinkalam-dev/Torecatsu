// Netlify Function: AI chat for the TORECATSU site.
// Needs one environment variable in Netlify: ANTHROPIC_API_KEY
// Optional: CLAUDE_MODEL (default below)

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-5-5';
const SYSTEM =
  'You are the friendly assistant of TORECATSU, a community for curious minds that learns science together ' +
  '(physics, biology, chemistry, astrophysics, mathematics, earth science). Answer any question clearly and ' +
  'briefly (under 150 words unless asked for more). Reply in the same language the user writes in. ' +
  'Be honest when you are unsure. Do not claim to be human.';

const hits = new Map(); // best-effort per-IP rate limit (resets when the function cold-starts)
const LIMIT = 15; // requests
const WINDOW_MS = 60 * 1000;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(503, { error: 'Assistant is not configured yet.' });

  const ip = (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return json(429, { error: 'Too many messages. Please wait a minute.' });
  recent.push(now);
  hits.set(ip, recent);

  let messages;
  try {
    messages = JSON.parse(event.body || '{}').messages;
  } catch {
    return json(400, { error: 'Bad request' });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return json(400, { error: 'Bad request' });
  }
  const clean = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return json(400, { error: 'Bad request' });
    }
    clean.push({ role: m.role, content: m.content.slice(0, 2000) });
  }
  if (clean[0].role !== 'user' || clean[clean.length - 1].role !== 'user') {
    return json(400, { error: 'Bad request' });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, system: SYSTEM, messages: clean }),
    });
    const data = await res.json();
    if (!res.ok) return json(502, { error: 'AI service error' });
    const reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!reply) return json(502, { error: 'Empty reply' });
    return json(200, { reply });
  } catch {
    return json(502, { error: 'AI service unreachable' });
  }
};
