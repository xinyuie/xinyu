// public/js/admin.js —— 后台管理页交互逻辑
const API = '/api/admin';

function getToken() { return localStorage.getItem('adminToken'); }
function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

function showView() {
  const hasToken = !!getToken();
  document.getElementById('adminLoginView').style.display = hasToken ? 'none' : 'flex';
  document.getElementById('dashboardView').style.display = hasToken ? 'block' : 'none';
  if (hasToken) {
    loadStats();
    loadUsers();
  }
}

// 管理员登录
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  const msgBox = document.getElementById('loginMsg');

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');
    localStorage.setItem('adminToken', data.token);
    showView();
  } catch (err) {
    msgBox.textContent = err.message;
    msgBox.className = 'msg show error';
  }
});

function adminLogout() {
  localStorage.removeItem('adminToken');
  showView();
}

async function loadStats() {
  const res = await fetch(`${API}/stats`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) return adminLogout();
  const data = await res.json();
  document.getElementById('statTotal').textContent = data.totalUsers;
  document.getElementById('statToday').textContent = data.todayNew;
  document.getElementById('statIps').textContent = data.uniqueIps;
  document.getElementById('statBanned').textContent = data.bannedUsers;
}

let searchTimer = null;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadUsers, 300);
});

async function loadUsers() {
  const keyword = document.getElementById('searchInput').value.trim();
  const url = `${API}/users?keyword=${encodeURIComponent(keyword)}&page=1&pageSize=50`;
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) return adminLogout();
  const data = await res.json();
  renderUsers(data.users);
}

function statusTag(user) {
  if (user.is_banned) {
    return `<span class="status-tag"><span class="pulse-dot banned"></span>已封禁</span>`;
  }
  if (user.last_login_at) {
    return `<span class="status-tag"><span class="pulse-dot"></span>正常</span>`;
  }
  return `<span class="status-tag"><span class="pulse-dot offline"></span>未登录</span>`;
}

function renderUsers(users) {
  const tbody = document.getElementById('userTableBody');
  const emptyState = document.getElementById('emptyState');
  tbody.innerHTML = '';

  if (!users.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${u.id}</td>
      <td>${escapeHtml(u.username)}</td>
      <td class="mono">${escapeHtml(u.email || '-')}</td>
      <td><span class="ip-chip mono">${u.register_ip || '-'}</span></td>
      <td><span class="ip-chip mono">${u.last_login_ip || '-'}</span></td>
      <td class="mono">${u.login_count}</td>
      <td>${statusTag(u)}</td>
      <td class="mono">${u.created_at}</td>
      <td class="actions-cell">
        <button class="btn-sm" onclick="openDetail(${u.id})">详情</button>
        <button class="btn-sm" onclick="toggleBan(${u.id}, ${u.is_banned ? 0 : 1})">${u.is_banned ? '解封' : '封禁'}</button>
        <button class="btn-sm btn-danger" onclick="deleteUser(${u.id})">删除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

async function toggleBan(id, banned) {
  await fetch(`${API}/users/${id}/ban`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ banned: !!banned })
  });
  loadUsers();
  loadStats();
}

async function deleteUser(id) {
  if (!confirm('确认删除该用户？此操作不可撤销。')) return;
  await fetch(`${API}/users/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadUsers();
  loadStats();
}

async function openDetail(id) {
  const res = await fetch(`${API}/users/${id}`, { headers: authHeaders() });
  if (!res.ok) return;
  const { user, logs } = await res.json();

  document.getElementById('detailBody').innerHTML = `
    ID：${user.id}<br/>
    用户名：${escapeHtml(user.username)}<br/>
    邮箱：${escapeHtml(user.email || '-')}<br/>
    注册 IP：${user.register_ip || '-'}<br/>
    最近登录 IP：${user.last_login_ip || '-'}<br/>
    最近登录时间：${user.last_login_at || '-'}<br/>
    累计登录次数：${user.login_count}<br/>
    注册时间：${user.created_at}
  `;

  const logList = document.getElementById('logList');
  if (!logs.length) {
    logList.innerHTML = `<div class="empty-state" style="padding:16px;">暂无登录记录</div>`;
  } else {
    logList.innerHTML = logs.map(l => `
      <div class="log-row mono">
        <span class="${l.success ? '' : 'log-fail'}">${l.ip || '-'} ${l.success ? '' : '(失败)'}</span>
        <span>${l.created_at}</span>
      </div>
    `).join('');
  }

  document.getElementById('detailOverlay').classList.add('show');
}

function closeDetail() {
  document.getElementById('detailOverlay').classList.remove('show');
}

showView();
