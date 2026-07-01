// One-time: set password for new super_admin account
// DELETE AFTER USE
exports.handler = async (event) => {
  if (event.queryStringParameters?.token !== 'taika-setpw-2026') {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const SUPABASE_URL = 'https://ijwgdzrunkxrpzsrcqir.supabase.co';
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  const USER_ID      = 'ba47ec14-2a6b-47c1-a15d-aac1ec2ae46d';
  const TEMP_PASS    = 'TaikaAdmin2026!';

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`, {
    method: 'PUT',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({ password: TEMP_PASS })
  });

  if (!res.ok) return { statusCode: 500, body: await res.text() };
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
