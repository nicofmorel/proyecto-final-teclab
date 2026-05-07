/**
 * auth.js — Login, logout, token & session management
 */

const AUTH_KEYS = {
  TOKEN:    'token',
  MEDICO_ID: 'medicoId',
  MAIL:     'mail',
  ROL:      'rol',
  NOMBRE:   'nombre',
  APELLIDO: 'apellido',
};

/* ── Storage helpers ── */

function saveSession(data) {
  localStorage.setItem(AUTH_KEYS.TOKEN,     data.token     || '');
  localStorage.setItem(AUTH_KEYS.MEDICO_ID, data.medicoId  ?? '');
  localStorage.setItem(AUTH_KEYS.MAIL,      data.mail      || '');
  localStorage.setItem(AUTH_KEYS.ROL,       data.rol       || '');
  localStorage.setItem(AUTH_KEYS.NOMBRE,    data.nombre    || '');
  localStorage.setItem(AUTH_KEYS.APELLIDO,  data.apellido  || '');
}

function clearSession() {
  localStorage.clear();
}

function getSession() {
  const token = localStorage.getItem(AUTH_KEYS.TOKEN);
  if (!token) return null;
  return {
    token:     token,
    medicoId:  localStorage.getItem(AUTH_KEYS.MEDICO_ID),
    mail:      localStorage.getItem(AUTH_KEYS.MAIL),
    rol:       localStorage.getItem(AUTH_KEYS.ROL),
    nombre:    localStorage.getItem(AUTH_KEYS.NOMBRE),
    apellido:  localStorage.getItem(AUTH_KEYS.APELLIDO),
  };
}

function isLoggedIn() {
  return !!localStorage.getItem(AUTH_KEYS.TOKEN);
}

function getCurrentRole() {
  return localStorage.getItem(AUTH_KEYS.ROL);
}

function getCurrentMedicoId() {
  return localStorage.getItem(AUTH_KEYS.MEDICO_ID);
}

function getCurrentNombre() {
  return localStorage.getItem(AUTH_KEYS.NOMBRE) || '';
}

function getCurrentApellido() {
  return localStorage.getItem(AUTH_KEYS.APELLIDO) || '';
}

/* ── Route guards ── */

/**
 * Call at the top of every protected page.
 * Redirects to login if not authenticated.
 * Optionally checks role.
 * @param {'ADMIN'|'MEDICO'|null} requiredRole
 */
function requireAuth(requiredRole = null) {
  if (!isLoggedIn()) {
    redirectToLogin();
    return false;
  }
  if (requiredRole && getCurrentRole() !== requiredRole) {
    // Wrong role — redirect to appropriate dashboard
    redirectToDashboard();
    return false;
  }
  return true;
}

function getBasePath() {
  // Pages are at root (index.html) or one level deep (admin/*.html, medico/*.html)
  return /\/(admin|medico)\/[^/]+$/.test(window.location.pathname) ? '../' : '';
}

function redirectToLogin() {
  clearSession();
  window.location.href = getBasePath() + 'index.html';
}

function redirectToDashboard() {
  const role = getCurrentRole();
  const base = getBasePath();
  if (role === 'ADMIN') {
    window.location.href = base + 'admin/dashboard.html';
  } else {
    window.location.href = base + 'medico/dashboard.html';
  }
}

/* ── Login ── */

/**
 * Performs login API call.
 * Stores session and redirects on success.
 * Throws Error with message on failure.
 */
async function login(mail, password) {
  const res = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mail, password }),
  });

  if (!res.ok) {
    let msg = 'Credenciales inválidas.';
    try {
      const data = await res.json();
      msg = data.message || data.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const data = await res.json();
  saveSession(data);

  // Redirect based on role
  if (data.rol === 'ADMIN') {
    window.location.href = 'admin/dashboard.html';
  } else {
    window.location.href = 'medico/dashboard.html';
  }
}

/* ── Logout ── */

function logout() {
  clearSession();
  window.location.href = getBasePath() + 'index.html';
}

/* ── Sidebar population ── */

/**
 * Fills in the sidebar user info (name, role, avatar initials).
 * Binds the logout button.
 * Call this on every protected page after the DOM is ready.
 */
function initSidebar() {
  const session = getSession();
  if (!session) return;

  const nombre   = session.nombre   || '';
  const apellido = session.apellido || '';
  const fullName = [nombre, apellido].filter(Boolean).join(' ');
  const initials = [(nombre[0] || ''), (apellido[0] || '')].join('').toUpperCase();

  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const headerNameEl = document.getElementById('header-user-name');

  if (nameEl)   nameEl.textContent   = fullName;
  if (roleEl)   roleEl.textContent   = session.rol === 'ADMIN' ? 'Administrador' : 'Médico';
  if (avatarEl) avatarEl.textContent = initials;
  if (headerNameEl) headerNameEl.textContent = fullName;

  // Logout buttons
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', () => logout());
  });

  // Mobile sidebar toggle
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');

  function openSidebar() {
    sidebar && sidebar.classList.add('show');
    overlay && overlay.classList.add('show');
  }

  function closeSidebar() {
    sidebar && sidebar.classList.remove('show');
    overlay && overlay.classList.remove('show');
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (overlay)   overlay.addEventListener('click', closeSidebar);

  // Mark active nav link
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.endsWith(currentPage)) {
      link.classList.add('active');
    }
  });
}
