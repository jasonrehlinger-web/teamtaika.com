/**
 * portal-admin.js — Taika Netlify Serverless Function
 * All service-role Supabase operations for the admin panel.
 * Node 18+ (uses native fetch). No external dependencies.
 *
 * Environment variables required:
 *   SUPABASE_SERVICE_KEY  — Supabase service role secret key (never hardcode)
 *   SUPABASE_URL          — (optional) falls back to hardcoded project URL
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ijwgdzrunkxrpzsrcqir.supabase.co';
// Service key MUST come from environment — never committed to source
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

/* ── CORS headers ── */
const headers = {
  'Access-Control-Allow-Origin':  'https://teamtaika.com',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

/* ── Rate limiter ────────────────────────────────────────────────────────────
   Simple in-memory IP throttle: max 30 requests per minute per IP.
   Resets on cold start (acceptable — Netlify functions are ephemeral).
   ─────────────────────────────────────────────────────────────────────────── */
const _rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit  = 30;
  const entry  = _rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    _rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count++;
  _rateLimitMap.set(ip, entry);
  return entry.count > limit;
}


/* ── Input validators ────────────────────────────────────────────────────────
   isValidUUID: prevents PostgREST query injection via malformed ID params.
   VALID_STATUSES: allowlist for project status transitions.
   ─────────────────────────────────────────────────────────────────────────── */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val) {
  return typeof val === 'string' && UUID_RE.test(val);
}

const VALID_STATUSES = new Set([
  'pending_review', 'reviewing', 'quoted', 'in_progress',
  'qa_review', 'delivered', 'completed', 'cancelled', 'on_hold'
]);

const VALID_PRIORITIES = new Set(['standard', 'rush', 'urgent']);

/* ── HTML escape for email templates — prevents injection ── */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ── Date format validator (ISO 8601 date: YYYY-MM-DD) ── */
function isValidDate(val) {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);
}

/* ── Main handler ── */
exports.handler = async function(event, context) {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Rate limit check
  const clientIp = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown').split(',')[0].trim();
  if (isRateLimited(clientIp)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many requests — please wait a moment and try again.' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!SERVICE_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error: service key not set' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { action } = body;
  if (!action) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing action' }) };
  }

  // Verify admin for all actions
  let adminProfile;
  try {
    adminProfile = await verifyAdmin(event.headers['authorization'] || event.headers['Authorization']);
  } catch (err) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: err.message || 'Unauthorized' })
    };
  }

  try {
    switch (action) {

      case 'updateProjectStatus':
        return await handleUpdateProjectStatus(body, adminProfile);

      case 'updateProjectAdmin':
        return await handleUpdateProjectAdmin(body, adminProfile);

      case 'getSignedUrl':
        return await handleGetSignedUrl(body, adminProfile);

      case 'inviteTeamMember':
        return await handleInviteTeamMember(body, adminProfile);

      case 'removeTeamMember':
        return await handleRemoveTeamMember(body, adminProfile);

      case 'getTeamMembers':
        return await handleGetTeamMembers(adminProfile);

      case 'exportProjects':
        return await handleExportProjects(body);

      case 'inviteClient':
        return await handleInviteClient(body, adminProfile);

      case 'blockClient':
        return await handleBlockClient(body, adminProfile);

      case 'deleteClient':
        return await handleDeleteClient(body, adminProfile);

      case 'addToBlacklist':
        return await handleAddToBlacklist(body, adminProfile);

      case 'removeFromBlacklist':
        return await handleRemoveFromBlacklist(body, adminProfile);

      case 'getBlacklist':
        return await handleGetBlacklist(adminProfile);

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
    }
  } catch (err) {
    console.error('[portal-admin] Unhandled error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    };
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   verifyAdmin
   Validates the Bearer token and confirms the caller has admin/super_admin role.
   Returns the caller's profile object on success; throws on failure.
   ═══════════════════════════════════════════════════════════════════════════ */
async function verifyAdmin(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.slice(7);

  // 1. Verify JWT with Supabase auth
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SERVICE_KEY
    }
  });

  if (!userRes.ok) {
    throw new Error('Unauthorized');
  }
  const userData = await userRes.json();
  if (!userData || !userData.id) {
    throw new Error('Unauthorized');
  }

  // 2. Look up profile and check role
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userData.id)}&select=*`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    }
  );

  if (!profileRes.ok) {
    throw new Error('Failed to verify admin role');
  }
  const profiles = await profileRes.json();
  const profile  = Array.isArray(profiles) ? profiles[0] : null;

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw new Error('Access denied');
  }

  // Deactivated admins must lose access immediately (e.g. after removal from
  // the team), not linger until their JWT expires. Only block on an explicit
  // false so records with an unset flag are not accidentally locked out.
  if (profile.is_active === false) {
    throw new Error('Access denied');
  }

  return profile;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. updateProjectStatus
   PATCH project status + append status history row.
   Body: { projectId, newStatus, note, changedBy }
   ═══════════════════════════════════════════════════════════════════════════ */
async function handleUpdateProjectStatus(body, adminProfile) {
  const { projectId, newStatus, note, changedBy } = body;
  if (!projectId || !newStatus) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId and newStatus required' }) };
  }
  if (!isValidUUID(projectId)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid projectId' }) };
  }
  if (!VALID_STATUSES.has(newStatus)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid status value' }) };
  }

  // Get current status first
  const getRes = await sbGet(`/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=status`);
  if (!getRes.ok) throw new Error('Failed to fetch project');
  const rows = await getRes.json();
  const fromStatus = rows[0]?.status || null;

  // PATCH project
  const patchRes = await sbPatch(
    `/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`,
    { status: newStatus, updated_at: new Date().toISOString() }
  );
  if (!patchRes.ok) {
    const err = await patchRes.json();
    throw new Error(err.message || 'Failed to update project status');
  }

  // Append status history
  const histRes = await sbPost('/rest/v1/project_status_history', {
    project_id:  projectId,
    // Attribution is always the verified caller — never a client-supplied id
    changed_by:  adminProfile.id,
    from_status: fromStatus,
    to_status:   newStatus,
    note:        note || null,
    created_at:  new Date().toISOString()
  });
  if (!histRes.ok) {
    console.warn('[portal-admin] Failed to write status history:', await histRes.text());
  }

  // Return updated project
  const updated = await sbGetJson(`/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=*`);
  return { statusCode: 200, headers, body: JSON.stringify({ project: updated[0] || null }) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. updateProjectAdmin
   PATCH allowed admin fields on a project.
   Body: { projectId, updates: { assigned_to?, quote_amount?, quote_note?,
           due_date?, priority?, admin_notes?, status? } }
   ═══════════════════════════════════════════════════════════════════════════ */
async function handleUpdateProjectAdmin(body, _adminProfile) {
  const { projectId, updates } = body;
  if (!projectId || !updates || typeof updates !== 'object') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId and updates object required' }) };
  }
  if (!isValidUUID(projectId)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid projectId' }) };
  }

  const ALLOWED = new Set(['assigned_to','quote_amount','quote_note','due_date','priority','admin_notes','status']);
  const filtered = {};
  for (const [k, v] of Object.entries(updates)) {
    if (!ALLOWED.has(k)) continue;
    if (k === 'quote_amount' && (v !== null && v !== undefined) && isNaN(Number(v))) continue;
    if (k === 'priority' && v && !VALID_PRIORITIES.has(v)) continue;
    if (k === 'status' && v && !VALID_STATUSES.has(v)) continue;
    if (k === 'assigned_to' && v && !isValidUUID(v)) continue;
    filtered[k] = v;
  }
  filtered.updated_at = new Date().toISOString();

  const patchRes = await sbPatch(
    `/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}`,
    filtered
  );
  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update project');
  }

  const updated = await sbGetJson(`/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=*`);
  return { statusCode: 200, headers, body: JSON.stringify({ project: updated[0] || null }) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. getSignedUrl
   Generate a time-limited signed URL for a file in project-files bucket.
   Body: { filePath }
   ═══════════════════════════════════════════════════════════════════════════ */
async function handleGetSignedUrl(body, _adminProfile) {
  const { filePath } = body;
  if (!filePath) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'filePath required' }) };
  }
  if (typeof filePath !== 'string' || filePath.includes('..') || filePath.startsWith('/') || /[\x00-\x1f]/.test(filePath)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid file path' }) };
  }
  // Security: verify the project folder prefix exists in the projects table
  // filePath format is expected to be: {projectId}/{filename}
  const projectId = filePath.split('/')[0];
  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Invalid file path structure' }) };
  }
  const projectCheck = await sbGetJson(`/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id`);
  if (!projectCheck || projectCheck.length === 0) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Project not found' }) };
  }

  // Encode each path segment individually so forward slashes are preserved
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/project-files/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        'apikey':         SERVICE_KEY,
        'Authorization':  `Bearer ${SERVICE_KEY}`,
        'Content-Type':   'application/json'
      },
      body: JSON.stringify({ expiresIn: 3600 })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate signed URL');
  }

  const data = await res.json();
  const signedUrl = data.signedURL || data.signedUrl || (data.signedURL ?? null);

  return { statusCode: 200, headers, body: JSON.stringify({ signedUrl }) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. inviteTeamMember
   Create an admin user via Supabase Admin API + insert profile row.
   Body: { email, full_name, role }  (role must be 'admin' — cannot invite super_admin)
   ═══════════════════════════════════════════════════════════════════════════ */
async function handleInviteTeamMember(body, adminProfile) {
  const { email, full_name, role } = body;
  if (!email || !full_name) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'email and full_name required' }) };
  }

  // Enforce: cannot invite super_admin via this endpoint
  const safeRole = role === 'super_admin' ? 'admin' : (role || 'admin');

  // Only super_admin can invite team members
  if (adminProfile.role !== 'super_admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only super admins can invite team members' }) };
  }

  // Use generate_link to create the invite token WITHOUT Supabase sending an email.
  // Supabase's outbound SMTP is unreliable; we send the email ourselves via Resend REST API.
  const genRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      type:        'invite',
      email,
      data:        { full_name, role: safeRole },
      redirect_to: 'https://teamtaika.com/admin/team'
    })
  });

  if (!genRes.ok) {
    const err = await genRes.json().catch(() => ({}));
    if (genRes.status === 422) throw new Error('A user with that email already exists');
    throw new Error(err.message || err.msg || 'Failed to create invite');
  }

  const linkData = await genRes.json();
  // Raw REST API returns flat structure; JS client wraps in {properties, user} — we use fetch directly
  const inviteUrl = linkData?.action_link || linkData?.properties?.action_link;
  const newUserId = linkData?.id || linkData?.user?.id;
  if (!inviteUrl) throw new Error('Invite link generation returned no action link');
  if (!newUserId) throw new Error('Invite link generation returned no user ID');

  // Upsert profile row — creates or updates regardless of whether trigger has fired
  await sbUpsert('/rest/v1/profiles', {
    id: newUserId, email, full_name, role: safeRole,
    // Invited admins are approved by definition (a super_admin invited them),
    // so activate immediately — otherwise verifyAdmin's is_active===false gate
    // would lock every new admin out. removeTeamMember still sets is_active
    // false to revoke access. "Invited vs joined" is tracked by
    // email_confirmed_at, not is_active.
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Send invite email via Resend REST API (bypasses Supabase SMTP entirely)
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    const safeName    = escHtml(full_name);
    const safeRoleLabel = escHtml(safeRole);
    const safeInviteUrl = encodeURI(inviteUrl).replace(/'/g, '%27');
    const emailHtml = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <h2>You've been invited to Taika Admin</h2>
        <p>Hi ${safeName},</p>
        <p>You've been invited to join the Taika Translations admin portal as <strong>${safeRoleLabel}</strong>.</p>
        <p>Click the button below to accept your invitation and set your password:</p>
        <p style="margin:32px 0">
          <a href="${safeInviteUrl}" style="background:#b5963e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Accept Invitation</a>
        </p>
        <p style="color:#666;font-size:13px">Or copy this link: ${safeInviteUrl}</p>
        <p style="color:#666;font-size:13px">This link expires in 24 hours.</p>
      </div>`;
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Taika Translations <no-reply@taikatranslations.com>',
        to:      [email],
        subject: "You've been invited to Taika Admin",
        html:    emailHtml
      })
    });
    if (!emailRes.ok) {
      const eErr = await emailRes.json().catch(() => ({}));
      console.warn('[portal-admin] Resend email failed:', eErr.message || emailRes.status);
    }
  } else {
    console.warn('[portal-admin] RESEND_API_KEY not set — invite email not sent');
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, userId: newUserId })
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   5b. getTeamMembers
   Returns all admin/super_admin profiles enriched with email_confirmed_at
   from auth.users so the UI can show Invited vs Active status.
   ═══════════════════════════════════════════════════════════════════════════ */
async function handleGetTeamMembers(_adminProfile) {
  const profilesRes = await sbGet('/rest/v1/profiles?role=in.(admin,super_admin)&select=id,email,full_name,role,is_active,created_at&order=created_at.asc');
  if (!profilesRes.ok) throw new Error('Failed to fetch team profiles');
  const profiles = await profilesRes.json();

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  let authMap = {};
  if (authRes.ok) {
    const authData = await authRes.json();
    const users = authData.users || authData;
    for (const u of users) authMap[u.id] = u.email_confirmed_at || null;
  }

  const members = profiles.map(p => ({ ...p, email_confirmed_at: authMap[p.id] || null }));
  return { statusCode: 200, headers, body: JSON.stringify({ members }) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. removeTeamMember
   Soft-deactivate a team member (set is_active = false).
   Body: { userId }
   ═══════════════════════════════════════════════════════════════════════════ */
async function handleRemoveTeamMember(body, adminProfile) {
  const { userId } = body;
  if (!userId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
  }
  if (!isValidUUID(userId)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid userId' }) };
  }

  // Only super_admin can remove members
  if (adminProfile.role !== 'super_admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only super admins can remove team members' }) };
  }

  // Prevent self-removal
  if (userId === adminProfile.id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'You cannot remove yourself' }) };
  }

  // Prevent removing another super_admin
  const target = await sbGetJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role`);
  if (target[0]?.role === 'super_admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Cannot remove a super admin' }) };
  }

  const patchRes = await sbPatch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    { is_active: false, updated_at: new Date().toISOString() }
  );

  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to remove team member');
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. exportProjects
   Return project rows (optionally filtered) with client name joined.
   Body: { filters: { status?, client_id?, assigned_to?, from_date?, to_date? } }
   ═══════════════════════════════════════════════════════════════════════════ */
async function handleExportProjects(body) {
  const { filters = {} } = body;

  // Validate all filter inputs before building query string
  if (filters.status && !VALID_STATUSES.has(filters.status)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid status filter' }) };
  }
  if (filters.client_id && !isValidUUID(filters.client_id)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid client_id filter' }) };
  }
  if (filters.assigned_to && !isValidUUID(filters.assigned_to)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid assigned_to filter' }) };
  }
  if (filters.from_date && !isValidDate(filters.from_date)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid from_date — use YYYY-MM-DD' }) };
  }
  if (filters.to_date && !isValidDate(filters.to_date)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid to_date — use YYYY-MM-DD' }) };
  }

  let qs = 'select=*,client:profiles!client_id(full_name,email,organization)';

  if (filters.status)      qs += `&status=eq.${encodeURIComponent(filters.status)}`;
  if (filters.client_id)   qs += `&client_id=eq.${encodeURIComponent(filters.client_id)}`;
  if (filters.assigned_to) qs += `&assigned_to=eq.${encodeURIComponent(filters.assigned_to)}`;
  if (filters.from_date)   qs += `&created_at=gte.${encodeURIComponent(filters.from_date)}`;
  if (filters.to_date)     qs += `&created_at=lte.${encodeURIComponent(filters.to_date)}`;

  qs += '&order=created_at.desc';

  const projects = await sbGetJson(`/rest/v1/projects?${qs}`);
  return { statusCode: 200, headers, body: JSON.stringify({ projects }) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. inviteClient
   Create a client user via Supabase Admin API + insert profile.
   Body: { email, full_name, organization }
   ═══════════════════════════════════════════════════════════════════════════ */
async function handleInviteClient(body, _adminProfile) {
  const { email, full_name, organization } = body;
  if (!email || !full_name) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'email and full_name required' }) };
  }

  // Use generate_link to create invite token without Supabase sending email (SMTP unreliable).
  const genRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      type:        'invite',
      email,
      data:        { full_name, role: 'client', organization: organization || null },
      redirect_to: 'https://teamtaika.com/portal'
    })
  });

  if (!genRes.ok) {
    const err = await genRes.json().catch(() => ({}));
    if (genRes.status === 422) throw new Error('A user with that email already exists');
    throw new Error(err.message || err.msg || 'Failed to create client invite');
  }

  const linkData = await genRes.json();
  // Raw REST API returns flat structure; JS client wraps in {properties, user} — we use fetch directly
  const inviteUrl = linkData?.action_link || linkData?.properties?.action_link;
  const newUserId = linkData?.id || linkData?.user?.id;
  if (!inviteUrl) throw new Error('Invite link generation returned no action link');
  if (!newUserId) throw new Error('Invite link generation returned no user ID');

  // Upsert profile row — creates or updates regardless of whether trigger has fired
  await sbUpsert('/rest/v1/profiles', {
    id: newUserId, email, full_name, organization: organization || null,
    role: 'client', is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Send invite email via Resend REST API
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    const safeClientName  = escHtml(full_name);
    const safeOrg         = organization ? escHtml(organization) : null;
    const safeClientUrl   = encodeURI(inviteUrl).replace(/'/g, '%27');
    const emailHtml = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <h2>You've been invited to the Taika Client Portal</h2>
        <p>Hi ${safeClientName},</p>
        <p>You've been invited to access the Taika Translations client portal${safeOrg ? ` for <strong>${safeOrg}</strong>` : ''}.</p>
        <p>Click the button below to set your password and get started:</p>
        <p style="margin:32px 0">
          <a href="${safeClientUrl}" style="background:#b5963e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Accept Invitation</a>
        </p>
        <p style="color:#666;font-size:13px">Or copy this link: ${safeClientUrl}</p>
        <p style="color:#666;font-size:13px">This link expires in 24 hours.</p>
      </div>`;
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Taika Translations <no-reply@taikatranslations.com>',
        to:      [email],
        subject: "You've been invited to the Taika Client Portal",
        html:    emailHtml
      })
    });
    if (!emailRes.ok) {
      const eErr = await emailRes.json().catch(() => ({}));
      console.warn('[portal-admin] Resend client invite email failed:', eErr.message || emailRes.status);
    }
  } else {
    console.warn('[portal-admin] RESEND_API_KEY not set — client invite email not sent');
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, userId: newUserId })
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Supabase REST helpers
   All use the service role key for full access.
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Block / Unblock a client ─────────────────────────────────────────────────
async function handleBlockClient(body, _adminProfile) {
  const { clientId, block } = body;
  if (!clientId) throw new Error('clientId required');
  if (!isValidUUID(clientId)) throw new Error('Invalid clientId');
  const res = await sbPatch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(clientId)}&role=eq.client`,
    { is_active: !block, updated_at: new Date().toISOString() } // block=true → is_active=false
  );
  if (!res.ok) throw new Error('Failed to update client status');
  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
}

// ─── Delete a client account ──────────────────────────────────────────────────
async function handleDeleteClient(body, _adminProfile) {
  const { clientId, blacklistEmail } = body;
  if (!clientId) throw new Error('clientId required');
  if (!isValidUUID(clientId)) throw new Error('Invalid clientId');

  // Fetch email first (for optional blacklisting)
  let email = null;
  if (blacklistEmail) {
    const pRes = await sbGet(`/rest/v1/profiles?id=eq.${encodeURIComponent(clientId)}&select=email`);
    if (pRes.ok) {
      const pData = await pRes.json();
      email = pData?.[0]?.email || null;
    }
  }

  // Delete profile row (cascades via FK or soft-deletes)
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${clientId}&role=eq.client`, {
    method: 'DELETE',
    headers: sbHeaders()
  });
  if (!delRes.ok) throw new Error('Failed to delete client profile');

  // Delete auth user via service role. If this fails, the profile is gone but
  // the auth account survives and can still authenticate against send-email /
  // notify / translate — surface the failure so it's retried, don't swallow it.
  const authDel = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${clientId}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  if (!authDel.ok && authDel.status !== 404) {
    throw new Error('Profile deleted but auth-user removal failed — please retry the delete');
  }

  // Optionally blacklist the email
  if (blacklistEmail && email) {
    await sbUpsert('/rest/v1/blacklisted_emails', {
      email: email.toLowerCase(),
      reason: 'Deleted by admin',
      created_at: new Date().toISOString()
    });
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
}

// ─── Blacklist management ─────────────────────────────────────────────────────
async function handleAddToBlacklist(body, adminProfile) {
  const { email, reason } = body;
  if (!email) throw new Error('email required');
  const res = await sbUpsert('/rest/v1/blacklisted_emails', {
    email: email.toLowerCase().trim(),
    reason: reason || null,
    blacklisted_by: adminProfile.id,
    created_at: new Date().toISOString()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to add to blacklist');
  }
  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
}

async function handleRemoveFromBlacklist(body, _adminProfile) {
  const { id } = body;
  if (!id) throw new Error('id required');
  if (!/^[0-9]+$/.test(String(id)) && !isValidUUID(String(id))) throw new Error('Invalid id');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blacklisted_emails?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: sbHeaders()
  });
  if (!res.ok) throw new Error('Failed to remove from blacklist');
  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
}

async function handleGetBlacklist(_adminProfile) {
  const res = await sbGet('/rest/v1/blacklisted_emails?select=id,email,reason,created_at&order=created_at.desc');
  if (!res.ok) throw new Error('Failed to fetch blacklist');
  const data = await res.json();
  return { statusCode: 200, headers, body: JSON.stringify({ entries: data || [] }) };
}

function sbHeaders(extra = {}) {
  return {
    'apikey':         SERVICE_KEY,
    'Authorization':  `Bearer ${SERVICE_KEY}`,
    'Content-Type':   'application/json',
    'Prefer':         'return=representation',
    ...extra
  };
}

function sbGet(path) {
  return fetch(`${SUPABASE_URL}${path}`, { headers: sbHeaders() });
}

async function sbGetJson(path) {
  const res = await sbGet(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `REST GET failed: ${path}`);
  }
  return res.json();
}

function sbPost(path, payload) {
  return fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(payload)
  });
}

function sbPatch(path, payload) {
  return fetch(`${SUPABASE_URL}${path}`, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify(payload)
  });
}

// Upsert: POST with resolution=merge-duplicates — creates or updates on conflict
function sbUpsert(path, payload) {
  return fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: sbHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(payload)
  });
}
