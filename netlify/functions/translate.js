exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { text, target } = body;

  if (!text || !target) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing text or target language' }) };
  }

  // Hard limit: 2000 characters per request
  if (text.length > 2000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Text too long. Maximum 2000 characters per preview.' }) };
  }

  const ALLOWED_TARGETS = [
    'es','fr','pt','de','it','zh','ar','hi','ru','pl','ur','bn',
    'ja','ko','vi','tl','fa','sw','ha','am','so','ht','my','km','lo',
    'ne','si','th','uk','ro','nl','el','he','tr','id','ms','yo','ig','zu'
  ];

  if (!ALLOWED_TARGETS.includes(target)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported target language' }) };
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: target,
          format: 'text'
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Google Translate error:', data.error);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Translation service error. Please try again.' })
      };
    }

    const translated = data.data.translations[0].translatedText;
    const detectedSource = data.data.translations[0].detectedSourceLanguage || 'en';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        translated,
        detectedSource,
        charCount: text.length
      })
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error. Please try again.' }) };
  }
};
