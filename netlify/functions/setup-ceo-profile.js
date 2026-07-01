// One-time function: insert super_admin profile for ceo@taikatranslations.com
// DELETE THIS FILE after running once.
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Simple guard — require a token so this can't be called by anyone else
  const token = event.queryStringParameters?.token;
  if (token !== 'taika-setup-2026') {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return { statusCode: 500, body: 'No service key' };

  const sb = createClient('https://ijwgdzrunkxrpzsrcqir.supabase.co', serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Look up the CEO user
  const { data: { users }, error: listErr } = await sb.auth.admin.listUsers();
  if (listErr) return { statusCode: 500, body: 'listUsers error: ' + listErr.message };

  const ceo = users.find(u => u.email === 'ceo@taikatranslations.com');
  if (!ceo) return { statusCode: 404, body: 'User not found' };

  // Upsert the profile row
  const { error: upsertErr } = await sb.from('profiles').upsert({
    id: ceo.id,
    email: 'ceo@taikatranslations.com',
    full_name: 'Jason',
    role: 'super_admin',
    is_active: true
  }, { onConflict: 'id' });

  if (upsertErr) return { statusCode: 500, body: 'Upsert error: ' + upsertErr.message };

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, userId: ceo.id, message: 'Profile row created for ceo@taikatranslations.com with role super_admin' })
  };
};
