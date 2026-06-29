'use strict';

const PORTAL_CONFIG = {
  supabaseUrl: 'https://ijwgdzrunkxrpzsrcqir.supabase.co',
  supabaseKey: 'sb_publishable_UmQ1ni6871mzup_Wz7oO6w_pbqYinV5'
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  reviewing: 'Under Review',
  quoted: 'Quote Ready',
  approved: 'Approved',
  in_progress: 'In Progress',
  review: 'In Review',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const STATUS_ORDER = ['submitted', 'reviewing', 'quoted', 'approved', 'in_progress', 'review', 'delivered', 'completed'];

const SERVICES = [
  { id: null, name: 'Certified Translation', slug: 'certified-translation', base_price: 24.99, price_unit: 'page' },
  { id: null, name: 'Legal Translation', slug: 'legal-translation', base_price: 29.99, price_unit: 'page' },
  { id: null, name: 'Medical Translation', slug: 'medical-translation', base_price: 29.99, price_unit: 'page' },
  { id: null, name: 'Website Localization', slug: 'website-localization', base_price: null, price_unit: 'custom' },
  { id: null, name: 'Interpretation In-Person', slug: 'interpretation-in-person', base_price: 120.00, price_unit: 'hour' },
  { id: null, name: 'Interpretation Remote', slug: 'interpretation-remote', base_price: 95.00, price_unit: 'hour' },
  { id: null, name: 'Transcription', slug: 'transcription', base_price: 1.50, price_unit: 'minute' },
  { id: null, name: 'Captioning', slug: 'captioning', base_price: 2.00, price_unit: 'minute' },
  { id: null, name: 'Desktop Publishing', slug: 'desktop-publishing', base_price: null, price_unit: 'custom' },
  { id: null, name: '508 Compliance', slug: '508-compliance', base_price: null, price_unit: 'custom' },
  { id: null, name: 'AI Automation', slug: 'ai-automation', base_price: null, price_unit: 'custom' },
  { id: null, name: 'Managed Translation', slug: 'managed-translation', base_price: null, price_unit: 'custom' }
];

// ---------------------------------------------------------------------------
// Supabase singleton
// ---------------------------------------------------------------------------

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase client library not loaded. Ensure the CDN script is included before portal.js.');
  }
  _supabase = window.supabase.createClient(PORTAL_CONFIG.supabaseUrl, PORTAL_CONFIG.supabaseKey);
  window._supabaseClient = _supabase; // exposed for pages that reference it directly
  return _supabase;
}

// ---------------------------------------------------------------------------
// Auth functions
// ---------------------------------------------------------------------------

async function requireAuth() {
  const { data: { session }, error } = await getSupabase().auth.getSession();
  if (error || !session) {
    window.location.href = '/portal';
    return null;
  }
  return session;
}

async function requireAdmin() {
  const { data: { session }, error } = await getSupabase().auth.getSession();
  if (error || !session) {
    window.location.href = '/admin';
    return null;
  }
  const { data: profile, error: profileError } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
    window.location.href = '/admin';
    return null;
  }
  return { user: session.user, profile };
}

async function getCurrentUser() {
  const { data: { session }, error } = await getSupabase().auth.getSession();
  if (error || !session) return null;
  const { data: profile, error: profileError } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (profileError) return null;
  return { user: session.user, profile };
}

async function signOut() {
  await getSupabase().auth.signOut();
  window.location.href = '/portal';
}

// ---------------------------------------------------------------------------
// Project functions
// ---------------------------------------------------------------------------

async function getMyProjects() {
  const session = await requireAuth();
  if (!session) return [];
  const { data, error } = await getSupabase()
    .from('projects')
    .select('*')
    .eq('client_id', session.user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function getProject(id) {
  const { data, error } = await getSupabase()
    .from('projects')
    .select('*, project_files(*), messages(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function createProject(data) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');
  const { data: project, error } = await getSupabase()
    .from('projects')
    .insert({ ...data, client_id: currentUser.user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return project;
}

// ---------------------------------------------------------------------------
// File functions
// ---------------------------------------------------------------------------

async function uploadFile(projectId, file, fileType) {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = 'project-files/' + projectId + '/' + fileType + '/' + timestamp + '_' + safeName;
  const { error: uploadError } = await getSupabase()
    .storage
    .from('project-files')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const currentUser = await getCurrentUser();
  const { data: record, error: dbError } = await getSupabase()
    .from('project_files')
    .insert({
      project_id: projectId,
      file_name: file.name,
      file_path: path,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: currentUser ? currentUser.user.id : null
    })
    .select()
    .single();
  if (dbError) throw new Error(dbError.message);
  return record;
}

async function getSignedUrl(filePath) {
  const { data, error } = await getSupabase()
    .storage
    .from('project-files')
    .createSignedUrl(filePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

async function getProjectFiles(projectId) {
  const { data, error } = await getSupabase()
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------------------------------------------------------------------------
// Message functions
// ---------------------------------------------------------------------------

async function getMessages(projectId, includeInternal) {
  if (includeInternal === undefined) includeInternal = false;
  let query = getSupabase()
    .from('messages')
    .select('*')
    .eq('project_id', projectId);
  if (!includeInternal) {
    query = query.eq('is_internal', false);
  }
  query = query.order('created_at', { ascending: true });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function sendMessage(projectId, body, isInternal) {
  if (isInternal === undefined) isInternal = false;
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');
  const { data, error } = await getSupabase()
    .from('messages')
    .insert({
      project_id: projectId,
      body: body,
      is_internal: isInternal,
      sender_id: currentUser.user.id,
      sender_role: currentUser.profile.role
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function markMessagesRead(projectId) {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session) return;
  const { error } = await getSupabase()
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .is('read_at', null)
    .neq('sender_id', session.user.id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Admin API helper
// ---------------------------------------------------------------------------

async function callAdminAPI(action, payload) {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const response = await fetch('/.netlify/functions/portal-admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + session.access_token
    },
    body: JSON.stringify(Object.assign({ action: action }, payload))
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Admin API error');
  return result;
}

// ---------------------------------------------------------------------------
// Admin API functions
// ---------------------------------------------------------------------------

async function adminUpdateProject(id, updates) {
  return callAdminAPI('updateProjectAdmin', { projectId: id, updates: updates });
}

async function adminUpdateProjectStatus(projectId, newStatus, note) {
  return callAdminAPI('updateProjectStatus', { projectId: projectId, newStatus: newStatus, note: note });
}

async function adminGetAllProjects(filters) {
  if (!filters) filters = {};
  let query = getSupabase()
    .from('projects')
    .select('*, profiles:client_id(id, full_name, email, role)');
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.service) {
    query = query.eq('service', filters.service);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters.search) {
    query = query.or('title.ilike.%' + filters.search + '%,description.ilike.%' + filters.search + '%');
  }
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function adminGetAllClients() {
  const { data: clients, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!clients || clients.length === 0) return [];
  const clientIds = clients.map(function(c) { return c.id; });
  const { data: projects, error: projError } = await getSupabase()
    .from('projects')
    .select('client_id')
    .in('client_id', clientIds);
  if (projError) throw new Error(projError.message);
  const countMap = {};
  (projects || []).forEach(function(p) {
    countMap[p.client_id] = (countMap[p.client_id] || 0) + 1;
  });
  return clients.map(function(c) {
    return Object.assign({}, c, { project_count: countMap[c.id] || 0 });
  });
}

async function adminGetSignedUrl(filePath) {
  const result = await callAdminAPI('getSignedUrl', { filePath: filePath });
  return result.signedUrl;
}

async function adminInviteTeam(email, full_name, role) {
  return callAdminAPI('inviteTeamMember', { email: email, full_name: full_name, role: role });
}

async function adminRemoveTeamMember(userId) {
  return callAdminAPI('removeTeamMember', { userId: userId });
}

async function getTeamMembers() {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}


// ---------------------------------------------------------------------------
// HTML escape utility — prevents XSS when inserting user content into innerHTML
// ---------------------------------------------------------------------------
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ---------------------------------------------------------------------------
// UI utility functions
// ---------------------------------------------------------------------------

function showToast(message, type, duration) {
  if (!type) type = 'success';
  if (!duration) duration = 4000;

  var container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }

  var icons = { success: '✓', error: '✗', info: 'ℹ' };
  var colors = {
    success: { bg: '#1a3a2a', border: '#2d6a4a', icon: '#4caf82', text: '#e8f5ee' },
    error:   { bg: '#3a1a1a', border: '#6a2d2d', icon: '#f44336', text: '#fde8e8' },
    info:    { bg: '#1a2a3a', border: '#2d4a6a', icon: '#4a90d9', text: '#e8f0f5' }
  };
  var c = colors[type] || colors.info;
  var icon = icons[type] || icons.info;

  var toast = document.createElement('div');
  toast.style.cssText = 'background:' + c.bg + ';border:1px solid ' + c.border + ';border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:10px;min-width:260px;max-width:380px;box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:auto;opacity:0;transform:translateX(40px);transition:opacity 0.25s ease,transform 0.25s ease;';
  var iconSpan = document.createElement('span');
  iconSpan.style.cssText = 'color:' + c.icon + ';font-weight:bold;font-size:16px;flex-shrink:0;';
  iconSpan.textContent = icon;
  var msgSpan = document.createElement('span');
  msgSpan.style.cssText = 'color:' + c.text + ';font-size:14px;line-height:1.4;';
  msgSpan.textContent = message;
  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);

  container.appendChild(toast);

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
  });

  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      if (container.children.length === 0 && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 280);
  }, duration);
}

function formatDate(isoString) {
  if (!isoString) return '—';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDatetime(isoString) {
  if (!isoString) return '—';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  var date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  var time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return date + ' at ' + time;
}

function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  var diffMs = Date.now() - d.getTime();
  var diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  var diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + ' minute' + (diffMin !== 1 ? 's' : '') + ' ago';
  var diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + ' hour' + (diffHr !== 1 ? 's' : '') + ' ago';
  var diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return diffDay + ' day' + (diffDay !== 1 ? 's' : '') + ' ago';
  var diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return diffMon + ' month' + (diffMon !== 1 ? 's' : '') + ' ago';
  var diffYr = Math.floor(diffMon / 12);
  return diffYr + ' year' + (diffYr !== 1 ? 's' : '') + ' ago';
}

function formatStatus(status) {
  if (!status) return '—';
  return STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function getStatusBadgeClass(status) {
  if (!status) return 'badge';
  return 'badge badge-' + status;
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  return '$' + Number(amount).toFixed(2);
}

function renderSkeletonCards(container, count) {
  if (!count) count = 3;
  if (!container) return;
  var html = '';
  for (var i = 0; i < count; i++) {
    html += '<div class="skeleton-card" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;animation:skeleton-pulse 1.5s ease-in-out infinite;">' +
      '<div style="height:14px;width:30%;background:rgba(255,255,255,0.08);border-radius:4px;margin-bottom:12px;"></div>' +
      '<div style="height:20px;width:70%;background:rgba(255,255,255,0.08);border-radius:4px;margin-bottom:10px;"></div>' +
      '<div style="height:14px;width:50%;background:rgba(255,255,255,0.06);border-radius:4px;margin-bottom:16px;"></div>' +
      '<div style="height:32px;width:100px;background:rgba(255,255,255,0.08);border-radius:6px;"></div>' +
      '</div>';
  }
  container.innerHTML = html;
  if (!document.getElementById('skeleton-pulse-style')) {
    var style = document.createElement('style');
    style.id = 'skeleton-pulse-style';
    style.textContent = '@keyframes skeleton-pulse{0%,100%{opacity:1}50%{opacity:0.5}}';
    document.head.appendChild(style);
  }
}

function showModal(html, options) {
  if (!options) options = {};
  closeModal();
  var onClose = options.onClose;
  var maxWidth = options.maxWidth || '560px';

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity 0.2s ease;';

  var dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.style.cssText = 'max-width:' + maxWidth + ';width:100%;background:#1a1f2e;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:28px;max-height:90vh;overflow-y:auto;transform:scale(0.95);transition:transform 0.2s ease;';
  dialog.innerHTML = html;
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      overlay.style.opacity = '1';
      dialog.style.transform = 'scale(1)';
    });
  });

  function doClose() {
    overlay.style.opacity = '0';
    dialog.style.transform = 'scale(0.95)';
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
    if (typeof onClose === 'function') onClose();
  }

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) doClose();
  });

  var closeBtn = dialog.querySelector('[data-modal-close]');
  if (closeBtn) closeBtn.addEventListener('click', doClose);

  overlay._closeModal = doClose;
  return { close: doClose };
}

function closeModal() {
  var overlay = document.querySelector('.modal-overlay');
  if (overlay && typeof overlay._closeModal === 'function') {
    overlay._closeModal();
  }
}

function confirmDialog(message, onConfirm, onCancel) {
  var html = '<div style="text-align:center;">' +
    '<p style="color:#e8eaf0;font-size:16px;line-height:1.6;margin:0 0 24px;">' + esc(message) + '</p>' +
    '<div style="display:flex;gap:12px;justify-content:center;">' +
    '<button id="confirm-cancel-btn" style="padding:10px 24px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#a0a8b8;font-size:14px;cursor:pointer;">Cancel</button>' +
    '<button id="confirm-ok-btn" style="padding:10px 24px;border-radius:8px;border:none;background:#c9a84c;color:#0d0f1a;font-size:14px;font-weight:600;cursor:pointer;">Confirm</button>' +
    '</div></div>';
  var modal = showModal(html, { maxWidth: '420px' });
  var dialog = document.querySelector('.modal-dialog');
  if (!dialog) return;
  dialog.querySelector('#confirm-ok-btn').addEventListener('click', function() {
    modal.close();
    if (typeof onConfirm === 'function') onConfirm();
  });
  dialog.querySelector('#confirm-cancel-btn').addEventListener('click', function() {
    modal.close();
    if (typeof onCancel === 'function') onCancel();
  });
}

function initPortalNav(userName, role) {
  var nav = document.querySelector('.portal-nav');
  if (!nav) return;

  var greeting = nav.querySelector('.nav-user-greeting') || nav.querySelector('[data-user-greeting]');
  if (greeting) {
    greeting.textContent = 'Hello, ' + (userName || 'User');
  }

  var signOutBtn = nav.querySelector('[data-signout]') || nav.querySelector('.sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      signOut();
    });
  }

  var adminLink = nav.querySelector('[data-admin-link]') || nav.querySelector('.admin-nav-link');
  if (adminLink) {
    if (role === 'admin' || role === 'super_admin') {
      adminLink.style.display = '';
    } else {
      adminLink.style.display = 'none';
    }
  }
}

function buildProjectCard(project) {
  var priorityColors = { high: '#f44336', urgent: '#ff5722', normal: '#4a90d9', low: '#78909c' };
  var priority = project.priority || 'normal';
  var priorityColor = priorityColors[priority] || priorityColors.normal;
  var serviceName = project.service || 'Translation';
  var statusLabel = formatStatus(project.status);
  var statusClass = getStatusBadgeClass(project.status);
  var dateStr = formatDate(project.created_at);
  var priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

  var safeId = esc(project.id);
  var safeTitle = esc(project.title || 'Untitled Project');
  var safeService = esc(serviceName);
  var safePriority = esc(priorityLabel);
  var safeStatusLabel = esc(statusLabel);
  var safeStatusClass = esc(statusClass);
  return '<div class="project-card" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;transition:border-color 0.2s ease,transform 0.2s ease;">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">' +
    '<span class="' + safeStatusClass + '" style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,0.08);color:#a0a8b8;">' + safeStatusLabel + '</span>' +
    '<span style="font-size:11px;font-weight:600;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:' + priorityColor + '22;color:' + priorityColor + ';flex-shrink:0;">' + safePriority + '</span>' +
    '</div>' +
    '<div style="color:#c9a84c;font-size:12px;font-weight:500;margin-bottom:4px;">' + safeService + '</div>' +
    '<h3 style="color:#e8eaf0;font-size:16px;font-weight:600;margin:0 0 8px;line-height:1.3;">' + safeTitle + '</h3>' +
    '<div style="color:#6b7280;font-size:12px;margin-bottom:16px;">Submitted ' + dateStr + '</div>' +
    '<a href="/portal/project?id=' + safeId + '" style="display:inline-flex;align-items:center;gap:6px;color:#c9a84c;font-size:14px;font-weight:500;text-decoration:none;padding:8px 16px;border:1px solid #c9a84c44;border-radius:8px;transition:background 0.2s ease;">View &rarr;</a>' +
    '</div>';
}

function buildStatusTimeline(currentStatus) {
  var currentIndex = STATUS_ORDER.indexOf(currentStatus);
  var html = '<div class="status-timeline" style="display:flex;align-items:flex-start;gap:0;width:100%;padding:8px 0;">';

  STATUS_ORDER.forEach(function(status, i) {
    var state;
    if (i < currentIndex) state = 'completed';
    else if (i === currentIndex) state = 'current';
    else state = 'future';

    var dotColor = state === 'completed' ? '#4caf82' : state === 'current' ? '#c9a84c' : '#2a2f40';
    var dotBorder = state === 'completed' ? '#4caf82' : state === 'current' ? '#c9a84c' : '#3a3f50';
    var labelColor = state === 'future' ? '#4a5060' : state === 'current' ? '#c9a84c' : '#a0a8b8';
    var fontWeight = state === 'current' ? '600' : '400';
    var glow = state === 'current' ? 'box-shadow:0 0 0 3px rgba(201,168,76,0.25);' : '';
    var label = formatStatus(status);

    html += '<div class="timeline-step timeline-step-' + state + '" style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:0;">' +
      '<div style="width:16px;height:16px;border-radius:50%;background:' + dotColor + ';border:2px solid ' + dotBorder + ';flex-shrink:0;position:relative;z-index:1;' + glow + '"></div>' +
      '<span style="font-size:10px;font-weight:' + fontWeight + ';color:' + labelColor + ';text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + label + '</span>' +
      '</div>';

    if (i < STATUS_ORDER.length - 1) {
      var filled = i < currentIndex;
      html += '<div style="height:2px;flex:1;margin-top:7px;background:' + (filled ? '#4caf82' : 'rgba(255,255,255,0.08)') + ';transition:background 0.3s;"></div>';
    }
  });

  html += '</div>';
  return html;
}

function renderProjectsGrid(projects, container) {
  if (!container) return;
  if (!projects || projects.length === 0) {
    container.innerHTML = '<div class="empty-state" style="text-align:center;padding:60px 20px;color:#6b7280;">' +
      '<div style="font-size:48px;margin-bottom:16px;opacity:0.4;">&#128194;</div>' +
      '<h3 style="color:#a0a8b8;font-size:18px;font-weight:600;margin:0 0 8px;">No projects yet</h3>' +
      '<p style="font-size:14px;margin:0;">Your projects will appear here once submitted.</p>' +
      '</div>';
    return;
  }
  container.innerHTML = projects.map(buildProjectCard).join('');
}

// ---------------------------------------------------------------------------
// Realtime subscriptions
// ---------------------------------------------------------------------------

function subscribeToMessages(projectId, onNewMessage) {
  var subscription = getSupabase()
    .channel('messages:' + projectId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'project_id=eq.' + projectId
      },
      function(payload) {
        if (typeof onNewMessage === 'function') onNewMessage(payload.new);
      }
    )
    .subscribe();
  return subscription;
}

function subscribeToProjectUpdates(projectId, onUpdate) {
  var subscription = getSupabase()
    .channel('project-updates:' + projectId)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects',
        filter: 'id=eq.' + projectId
      },
      function(payload) {
        if (typeof onUpdate === 'function') onUpdate(payload.new);
      }
    )
    .subscribe();
  return subscription;
}

/* ── Portal Nav renderer ────────────────────────────────────────────────── */
function renderPortalNav(containerId) {
  var el = document.getElementById(containerId);
  if (!el) return;

  var path = window.location.pathname;
  var isSubmit    = path.includes('/submit');
  var isAccount   = path.includes('/account');
  var isProject   = path.includes('/project');
  var isTranslate = path.includes('/translate');

  var dashClass      = (!isSubmit && !isAccount && !isProject && !isTranslate) ? ' active' : '';
  var translateClass = isTranslate ? ' active' : '';
  var submitClass    = isSubmit    ? ' active' : '';
  var accountClass   = isAccount   ? ' active' : '';

  el.innerHTML =
    '<nav class="portal-nav" role="navigation" aria-label="Portal navigation">' +
      '<a href="/" class="portal-nav-back" aria-label="Back to main site">← teamtaika.com</a>' +
      '<a href="/portal/dashboard" class="portal-nav__logo">Taika</a>' +
      '<div class="portal-nav__links">' +
        '<a href="/portal/dashboard"  class="portal-nav__link' + dashClass      + '">Dashboard</a>' +
        '<a href="/portal/translate"  class="portal-nav__link' + translateClass + '">MT Preview</a>' +
        '<a href="/portal/submit"     class="portal-nav__link' + submitClass    + '">New Project</a>' +
        '<a href="/portal/account"    class="portal-nav__link' + accountClass   + '">Account</a>' +
        '<a href="/admin/dashboard"   class="portal-nav__link portal-nav__admin-link" id="nav-admin-link" style="display:none">Admin Panel →</a>' +
      '</div>' +
      '<div class="portal-nav__right">' +
        '<span class="portal-nav__greeting" id="nav-greeting"></span>' +
        '<button class="portal-nav__signout" id="nav-signout">Sign Out</button>' +
      '</div>' +
    '</nav>';

  /* Wire sign-out */
  var signOutBtn = el.querySelector('#nav-signout');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof signOut === 'function') signOut();
    });
  }

  /* Fill greeting + show admin link for admin/super_admin */
  try {
    getCurrentUser().then(function(result) {
      var greet = el.querySelector('#nav-greeting');
      if (greet && result) {
        var name = (result.profile && result.profile.full_name)
          ? result.profile.full_name.split(' ')[0]
          : (result.user && result.user.email ? result.user.email.split('@')[0] : '');
        if (name) greet.textContent = 'Hello, ' + name;
      }
      var role = result && result.profile && result.profile.role;
      var adminLink = el.querySelector('#nav-admin-link');
      if (adminLink && (role === 'admin' || role === 'super_admin')) {
        adminLink.style.display = '';
      }
    }).catch(function(){});
  } catch(e) {}
}
