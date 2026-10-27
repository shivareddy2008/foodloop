// auth.js - Authentication, Roles & 1-Click Switcher for FoodLoop
let currentUser = null;
let authToken = null;

// Preset Demo Accounts for Instant Viva & Testing
const DEMO_ACCOUNTS = {
  donor: {
    id: 1,
    name: 'Prof. Rajesh Sharma (Mess Warden)',
    email: 'donor@foodloop.org',
    role: 'donor',
    organization: 'Campus Central Hostel Mess',
    phone: '+91 98765 43210',
    city: 'Bangalore'
  },
  ngo: {
    id: 2,
    name: 'Sunita Rao (Director)',
    email: 'ngo@roshni.org',
    role: 'ngo',
    organization: 'Roshni Food Bank & Child Welfare Trust',
    phone: '+91 91234 56780',
    city: 'Bangalore'
  },
  volunteer: {
    id: 3,
    name: 'Arjun Patel (Student Lead)',
    email: 'volunteer@campus.org',
    role: 'volunteer',
    organization: 'Youth Food Rescue Brigade',
    phone: '+91 99887 76655',
    city: 'Bangalore'
  },
  admin: {
    id: 4,
    name: 'System Admin (IP Project Lead)',
    email: 'admin@foodloop.org',
    role: 'admin',
    organization: 'FoodLoop Project Governance Team',
    phone: '+91 90000 11122',
    city: 'Bangalore'
  }
};

// Initialize Auth
function initAuth() {
  const savedUser = localStorage.getItem('foodloop_user');
  const savedToken = localStorage.getItem('foodloop_token');

  if (savedUser && savedToken) {
    try {
      currentUser = JSON.parse(savedUser);
      authToken = savedToken;
    } catch (e) {
      currentUser = null;
    }
  }

  // If no saved user, default to Volunteer for immediate interactive exploration
  if (!currentUser) {
    switchDemoRole('volunteer', false);
  } else {
    updateAuthUI();
  }
}

// 1-Click Fast Role Switcher (Crucial for IP Project Viva & Demo)
function switchDemoRole(roleKey, notify = true) {
  if (roleKey === 'guest') {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('foodloop_user');
    localStorage.removeItem('foodloop_token');
    updateAuthUI();
    if (notify) showToast('Logged out. You are now browsing as Guest.', 'info');
    return;
  }

  const profile = DEMO_ACCOUNTS[roleKey];
  if (!profile) return;

  currentUser = profile;
  // Generate valid base64 token for server requests
  authToken = btoa(`${profile.id}:${Date.now()}:${profile.role}`);
  localStorage.setItem('foodloop_user', JSON.stringify(currentUser));
  localStorage.setItem('foodloop_token', authToken);

  updateAuthUI();
  if (notify) {
    showToast(`Switched perspective to: ${currentUser.name} (${currentUser.role.toUpperCase()})`, 'success');
  }

  // Refresh active dashboard if applicable
  if (window.loadMyDonations && currentUser.role === 'donor') window.loadMyDonations();
  if (window.loadMyClaims && (currentUser.role === 'ngo' || currentUser.role === 'volunteer')) window.loadMyClaims();
  if (window.loadAdminDashboard && currentUser.role === 'admin') window.loadAdminDashboard();
}

// Update Top Navigation Bar & User Controls
function updateAuthUI() {
  const userControlArea = document.getElementById('navUserControls');
  const activeRoleBadge = document.getElementById('activeRoleBadge');
  const adminNavTab = document.getElementById('adminNavTab');
  const donorNavTab = document.getElementById('donorNavTab');
  const volunteerNavTab = document.getElementById('volunteerNavTab');

  if (!userControlArea) return;

  if (currentUser) {
    const roleEmoji = {
      donor: '🍳',
      ngo: '🤝',
      volunteer: '🚴',
      admin: '👑'
    }[currentUser.role] || '👤';

    if (activeRoleBadge) {
      activeRoleBadge.innerHTML = `<span>${roleEmoji}</span> <span>${currentUser.role.toUpperCase()}</span>`;
    }

    userControlArea.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <div style="text-align:right; line-height:1.2;">
          <div style="font-size:0.875rem; font-weight:700; color:#0f172a;">${escapeHtml(currentUser.name)}</div>
          <div style="font-size:0.75rem; color:#16a34a; font-weight:600;">${escapeHtml(currentUser.organization || currentUser.role)}</div>
        </div>
        <div class="role-badge-pill" title="Click to change demo role" onclick="openRoleSwitcherModal()">
          ${roleEmoji} ${currentUser.role}
        </div>
        <button class="btn btn-outline btn-sm" onclick="switchDemoRole('guest')">
          Sign Out
        </button>
      </div>
    `;

    // Manage role-specific nav tabs
    if (adminNavTab) adminNavTab.style.display = currentUser.role === 'admin' ? 'inline-flex' : 'none';
    if (donorNavTab) donorNavTab.style.display = (currentUser.role === 'donor' || currentUser.role === 'admin') ? 'inline-flex' : 'none';
    if (volunteerNavTab) volunteerNavTab.style.display = (currentUser.role === 'ngo' || currentUser.role === 'volunteer' || currentUser.role === 'admin') ? 'inline-flex' : 'none';

  } else {
    if (activeRoleBadge) {
      activeRoleBadge.innerHTML = `<span>👤</span> <span>GUEST</span>`;
    }
    userControlArea.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <button class="btn btn-outline btn-sm" onclick="openRoleSwitcherModal()">
          ⚡ Fast Demo Switch
        </button>
        <button class="btn btn-primary btn-sm" onclick="openAuthModal('login')">
          Sign In
        </button>
      </div>
    `;

    if (adminNavTab) adminNavTab.style.display = 'none';
    if (donorNavTab) donorNavTab.style.display = 'none';
    if (volunteerNavTab) volunteerNavTab.style.display = 'none';
  }
}

// Modal Controllers
function openRoleSwitcherModal() {
  const modal = document.getElementById('roleSwitcherModal');
  if (modal) modal.classList.add('active');
}

function closeRoleSwitcherModal() {
  const modal = document.getElementById('roleSwitcherModal');
  if (modal) modal.classList.remove('active');
}

function openAuthModal(mode = 'login') {
  const modal = document.getElementById('authModal');
  const loginForm = document.getElementById('loginFormWrapper');
  const registerForm = document.getElementById('registerFormWrapper');
  const modalTitle = document.getElementById('authModalTitle');

  if (!modal) return;

  if (mode === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    modalTitle.textContent = 'Sign In to FoodLoop';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    modalTitle.textContent = 'Create FoodLoop Account';
  }

  modal.classList.add('active');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

// Handle Traditional Login Submission
async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    currentUser = data.user;
    authToken = data.token;
    localStorage.setItem('foodloop_user', JSON.stringify(currentUser));
    localStorage.setItem('foodloop_token', authToken);

    closeAuthModal();
    updateAuthUI();
    showToast(`Welcome back, ${currentUser.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Registration Submission
async function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  const organization = document.getElementById('regOrg').value;
  const phone = document.getElementById('regPhone').value;
  const address = document.getElementById('regAddress').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, organization, phone, address })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    currentUser = data.user;
    authToken = data.token;
    localStorage.setItem('foodloop_user', JSON.stringify(currentUser));
    localStorage.setItem('foodloop_token', authToken);

    closeAuthModal();
    updateAuthUI();
    showToast(`Account successfully created for ${currentUser.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
