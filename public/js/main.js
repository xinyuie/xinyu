// public/js/main.js —— 登录/注册页交互逻辑
const API = '/api/auth';

const msgBox = document.getElementById('msg');
function showMsg(text, type = 'error') {
  msgBox.textContent = text;
  msgBox.className = `msg show ${type}`;
}

// tab 切换
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const isLogin = btn.dataset.tab === 'login';
    document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
    document.getElementById('registerForm').style.display = isLogin ? 'none' : 'block';
    msgBox.className = 'msg';
  });
});

// 注册
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '注册失败');
    showMsg('注册成功，请登录', 'success');
    document.querySelector('.tab-btn[data-tab="login"]').click();
    document.getElementById('loginUsername').value = username;
  } catch (err) {
    showMsg(err.message);
  }
});

// 登录
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');

    localStorage.setItem('userToken', data.token);
    showMsg('登录成功', 'success');
    await loadProfile();
  } catch (err) {
    showMsg(err.message);
  }
});

async function loadProfile() {
  const token = localStorage.getItem('userToken');
  if (!token) return;
  const res = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const { user } = await res.json();

  document.getElementById('profileBody').innerHTML = `
    用户名：${user.username}<br/>
    邮箱：${user.email || '未填写'}<br/>
    注册 IP：${user.register_ip || '-'}<br/>
    最近登录 IP：${user.last_login_ip || '-'}<br/>
    最近登录时间：${user.last_login_at || '-'}<br/>
    累计登录次数：${user.login_count}<br/>
    注册时间：${user.created_at}
  `;
  document.getElementById('profileOverlay').classList.add('show');
}

function logout() {
  localStorage.removeItem('userToken');
  location.reload();
}

// 若已登录，直接展示个人信息
if (localStorage.getItem('userToken')) {
  loadProfile();
}
