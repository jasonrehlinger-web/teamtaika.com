const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://teamtaika.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ijwgdzrunkxrpzsrcqir.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/* ── Rate limiter: 20 req/min authenticated, 10 req/min unauthenticated ── */
const _rateLimitMap = new Map();
function isRateLimited(ip, authenticated) {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = authenticated ? 20 : 5;
  const key = ip + (authenticated ? ':auth' : ':anon');
  const entry = _rateLimitMap.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    _rateLimitMap.set(key, { count: 1, start: now });
    return false;
  }
  entry.count++;
  _rateLimitMap.set(key, entry);
  return entry.count > limit;
}

async function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ') || !SUPABASE_KEY) return false;
  try {
    const token = authHeader.slice(7);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_KEY }
    });
    return res.ok;
  } catch { return false; }
}

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Auth check (optional — stricter rate limit for unauthenticated callers)
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const authenticated = await verifyToken(authHeader);

  // Rate limit
  const clientIp = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown').split(',')[0].trim();
  if (isRateLimited(clientIp, authenticated)) {
    return { statusCode: 429, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Too many requests — please wait a moment and try again.' }) };
  }

  const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'API not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { text, target } = body;

  if (!text || !target) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing text or target language' }) };
  }

  if (typeof text !== 'string' || typeof target !== 'string') {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid input types' }) };
  }

  // Tighter cap for unauthenticated callers to limit paid-API cost abuse
  const maxLen = authenticated ? 2000 : 500;
  if (text.length > maxLen) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: `Text too long. Maximum ${maxLen} characters per preview${authenticated ? '' : ' — sign in to the portal for longer previews'}.` }) };
  }

  const ALLOWED_TARGETS = [
    'es','fr','pt','de','it','zh','ar','hi','ru','pl','ur','bn',
    'ja','ko','vi','tl','fa','sw','ha','am','so','ht','my','km','lo',
    'ne','si','th','uk','ro','nl','el','he','tr','id','ms','yo','ig','zu'
  ];

  if (!ALLOWED_TARGETS.includes(target)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unsupported target language' }) };
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: target, format: 'text' })
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Google Translate error:', data.error);
      return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Translation service error. Please try again.' }) };
    }

    const translated = data.data.translations[0].translatedText;
    const detectedSource = data.data.translations[0].detectedSourceLanguage || 'en';

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' },
      body: JSON.stringify({ translated, detectedSource, charCount: text.length })
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal error. Please try again.' }) };
  }
};
