// One-time: wipe and recreate super_admin account for ceo@taikatranslations.com
// DELETE AFTER USE
exports.handler = async (event) => {
  if (event.queryStringParameters?.token !== 'taika-reset-2026') {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const SUPABASE_URL = 'https://ijwgdzrunkxrpzsrcqir.supabase.co';
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  if (!SERVICE_KEY) return { statusCode: 500, body: 'No service key' };

  const h = {
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json'
  };

  const EMAIL = 'ceo@taikatranslations.com';

  // 1. Find existing user
  const listRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers: h });
  const listData = await listRes.json();
  const existing = (listData.users || []).find(u => u.email === EMAIL);

  // 2. Delete profile row first (avoid FK issues)
  if (existing) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${existing.id}`, { method: 'DELETE', headers: h });
    // 3. Delete auth user
    const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, { method: 'DELETE', headers: h });
    if (!delRes.ok) return { statusCode: 500, body: 'Delete failed: ' + await delRes.text() };
  }

  // 4. Create fresh auth user (email pre-confirmed)
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST', headers: h,
    body: JSON.stringify({
      email: EMAIL,
      email_confirm: true,
      user_metadata: { full_name: 'Jason' }
    })
  });
  if (!createRes.ok) return { statusCode: 500, body: 'Create failed: ' + await createRes.text() };
  const newUser = await createRes.json();

  // 5. Insert profile row
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ id: newUser.id, email: EMAIL, full_name: 'Jason', role: 'super_admin', is_active: true })
  });
  if (!profRes.ok) return { statusCode: 500, body: 'Profile insert failed: ' + await profRes.text() };

  // 6. Send password reset email
  const resetRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ type: 'recovery', email: EMAIL })
  });
  const resetData = await resetRes.json();

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      newUserId: newUser.id,
      message: 'Account wiped and recreated. Password reset email sent (or check reset_link below).',
      reset_link: resetData.action_link || resetData.properties?.action_link || '(check email)'
    })
  };
};
