/**
 * get-profile.js — returns the caller's own profile row, using the service role
 * to bypass the broken RLS recursive policy on the profiles table.
 * Caller must pass their Supabase access token as Authorization: Bearer <token>
 */
exports.handler = async (event) => {
 try {
  const SUPABASE_URL = 'https://ijwgdzrunkxrpzsrcqir.supabase.co';
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!SERVICE_KEY) return { statusCode: 500, body: 'Server misconfigured' };

  // Extract user JWT
  const jwt = ((event.headers && event.headers['authorization']) || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return { statusCode: 401, body: 'No token' };

  // Verify JWT and get user ID
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${jwt}` }
  });
  if (!userRes.ok) return { statusCode: 401, body: 'Invalid token' };
  const user = await userRes.json();
  if (!user?.id) return { statusCode: 401, body: 'No user id' };

  // Fetch this user's profile with service key (bypasses RLS)
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&limit=1`,
    {
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Accept':        'application/vnd.pgrst.object+json'
      }
    }
  );

  if (profileRes.status === 406) {
    // No row found
    return { statusCode: 404, body: JSON.stringify({ error: 'no_profile' }) };
  }
  if (!profileRes.ok) {
    console.error('[get-profile] profile fetch failed:', profileRes.status, await profileRes.text());
    return { statusCode: 500, body: 'Profile fetch failed' };
  }

  const profile = await profileRes.json();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(profile)
  };
 } catch (err) {
  console.error('[get-profile] error:', err);
  return { statusCode: 500, body: 'Internal error' };
 }
};
