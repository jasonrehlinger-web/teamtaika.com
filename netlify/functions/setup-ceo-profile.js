// One-time function: insert super_admin profile for ceo@taikatranslations.com
// Uses native fetch only — no npm dependencies.
// DELETE THIS FILE after running once.

exports.handler = async (event) => {
  const token = event.queryStringParameters?.token;
  if (token !== 'taika-setup-2026') {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const SUPABASE_URL = 'https://ijwgdzrunkxrpzsrcqir.supabase.co';
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!SERVICE_KEY) return { statusCode: 500, body: 'No service key' };

  const headers = {
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json'
  };

  // 1. Find the CEO user ID
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers });
  if (!listRes.ok) return { statusCode: 500, body: 'listUsers failed: ' + await listRes.text() };
  const listData = await listRes.json();
  const users = listData.users || listData;
  const ceo = users.find(u => u.email === 'ceo@taikatranslations.com');
  if (!ceo) return { statusCode: 404, body: 'ceo@taikatranslations.com not found in auth.users' };

  // 2. Upsert the profile row
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id:        ceo.id,
      email:     'ceo@taikatranslations.com',
      full_name: 'Jason',
      role:      'super_admin',
      is_active: true
    })
  });

  if (!upsertRes.ok) return { statusCode: 500, body: 'Upsert failed: ' + await upsertRes.text() };

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, userId: ceo.id, message: 'Profile created: ceo@taikatranslations.com → super_admin' })
  };
};
