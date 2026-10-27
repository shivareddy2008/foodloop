// app.js - Main Application Orchestrator & State Manager for FoodLoop
let currentCategory = 'all';
let currentDietary = 'all';
let currentStatus = 'all';
let currentSearch = '';
let currentUrgency = 'all';
let currentViewMode = 'split'; // 'split', 'grid', 'map'
let activeTab = 'explore'; // 'explore', 'donor', 'volunteer', 'admin', 'safety'
let allLoadedDonations = [];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Auth
  initAuth();

  // Initialize Map
  setTimeout(() => {
    initFoodMap();
  }, 100);

  // Load Initial Food Listings
  loadDonations();

  // Load Impact Stats
  loadHomepageImpact();

  // Start Live Countdown Clock Ticker (runs every 60s)
  setInterval(updateLiveCountdowns, 60000);

  // Setup Event Listeners
  setupEventListeners();
});

// Setup DOM Event Listeners
function setupEventListeners() {
  // Search bar input with debounce
  const searchInput = document.getElementById('foodSearchInput');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentSearch = e.target.value;
        loadDonations();
      }, 300);
    });
  }

  // Dietary select
  const dietarySelect = document.getElementById('foodDietarySelect');
  if (dietarySelect) {
    dietarySelect.addEventListener('change', (e) => {
      currentDietary = e.target.value;
      loadDonations();
    });
  }

  // Category select
  const categorySelect = document.getElementById('foodCategorySelect');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      setCategoryFilter(e.target.value);
    });
  }
}

// Main View Tab Switcher
function switchMainTab(tabName) {
  activeTab = tabName;

  const views = {
    explore: document.getElementById('viewExplore'),
    donor: document.getElementById('viewDonor'),
    volunteer: document.getElementById('viewVolunteer'),
    admin: document.getElementById('viewAdmin'),
    safety: document.getElementById('viewSafety')
  };

  Object.keys(views).forEach(k => {
    if (views[k]) views[k].style.display = k === tabName ? 'block' : 'none';
  });

  // Update nav link active classes
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-tab') === tabName) link.classList.add('active');
  });

  // Tab specific data load
  if (tabName === 'explore') {
    if (foodMap) setTimeout(() => foodMap.invalidateSize(), 200);
  } else if (tabName === 'donor') {
    loadMyDonations();
  } else if (tabName === 'volunteer') {
    loadMyClaims();
  } else if (tabName === 'admin') {
    loadAdminDashboard();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Switch Category Filter
function setCategoryFilter(cat) {
  currentCategory = cat;

  // Update pill active classes
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.classList.remove('active');
    if (pill.getAttribute('data-category') === cat) pill.classList.add('active');
  });

  const catSelect = document.getElementById('foodCategorySelect');
  if (catSelect) catSelect.value = cat;

  loadDonations();
}

// Switch Dietary Filter
function setDietaryFilter(diet) {
  currentDietary = diet;
  loadDonations();
}

// Switch Urgency Filter
function toggleUrgentOnly() {
  currentUrgency = currentUrgency === 'urgent' ? 'all' : 'urgent';
  const btn = document.getElementById('urgentFilterBtn');
  if (btn) {
    if (currentUrgency === 'urgent') {
      btn.classList.add('btn-danger');
      btn.classList.remove('btn-outline');
    } else {
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-outline');
    }
  }
  loadDonations();
}

// Switch Layout View Mode: Split vs Grid vs Map
function setViewMode(mode) {
  currentViewMode = mode;
  const splitWrapper = document.getElementById('splitViewWrapper');
  const cardsCol = document.getElementById('foodCardsCol');
  const mapCol = document.getElementById('foodMapCol');

  document.querySelectorAll('.view-mode-btn').forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('data-mode') === mode) b.classList.add('active');
  });

  if (mode === 'split') {
    splitWrapper.className = 'split-view-wrapper';
    cardsCol.style.display = 'flex';
    mapCol.style.display = 'block';
  } else if (mode === 'grid') {
    splitWrapper.className = 'full-grid-wrapper';
    cardsCol.style.display = 'contents';
    mapCol.style.display = 'none';
  } else if (mode === 'map') {
    splitWrapper.className = 'split-view-wrapper';
    cardsCol.style.display = 'none';
    mapCol.style.display = 'block';
    mapCol.style.gridColumn = 'span 2';
  }

  if (foodMap) {
    setTimeout(() => foodMap.invalidateSize(), 200);
  }
}

// Load Food Donations from Backend REST API
async function loadDonations() {
  const cardsContainer = document.getElementById('foodCardsList');
  if (!cardsContainer) return;

  cardsContainer.innerHTML = `
    <div style="text-align:center; padding:3rem; color:#64748b; font-weight:600;">
      <div class="pulse-dot" style="margin:0 auto 1rem; width:16px; height:16px;"></div>
      Scanning Live Surplus Food Radar...
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (currentCategory && currentCategory !== 'all') params.append('category', currentCategory);
    if (currentDietary && currentDietary !== 'all') params.append('dietary', currentDietary);
    if (currentStatus && currentStatus !== 'all') params.append('status', currentStatus);
    if (currentSearch && currentSearch.trim()) params.append('search', currentSearch.trim());
    if (currentUrgency === 'urgent') params.append('urgency', 'urgent');

    const res = await fetch(`/api/donations?${params.toString()}`);
    const donations = await res.json();
    if (!res.ok) throw new Error(donations.error || 'Failed to fetch donations');

    allLoadedDonations = donations;

    // Render Cards
    renderFoodCards(donations);

    // Render Map Markers
    if (window.renderMapMarkers) {
      window.renderMapMarkers(donations);
    }

    // Update Urgent Ticker
    updateUrgentBanner(donations);

    // Update result count
    const countEl = document.getElementById('foodResultCount');
    if (countEl) countEl.textContent = `${donations.length} surplus meal batches available`;

  } catch (err) {
    cardsContainer.innerHTML = `
      <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:1rem; padding:1.5rem; text-align:center; color:#e11d48;">
        <strong>Error connecting to FoodLoop database:</strong> ${escapeHtml(err.message)}
      </div>
    `;
  }
}

// Render Food Cards
function renderFoodCards(donations) {
  const container = document.getElementById('foodCardsList');
  if (!container) return;

  if (donations.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3.5rem 1.5rem; background:#ffffff; border-radius:1.5rem; border:1.5px dashed #cbd5e1;">
        <div style="font-size:2.5rem; margin-bottom:0.75rem;">🌿</div>
        <h3 style="font-size:1.2rem; font-weight:800; color:#0f172a; margin-bottom:0.35rem;">No surplus meals match your criteria</h3>
        <p style="color:#64748b; font-size:0.9rem; margin-bottom:1.5rem;">Try clearing category filters or adjusting search parameters.</p>
        <button class="btn btn-outline btn-sm" onclick="clearFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = donations.map(d => {
    const expiryDate = new Date(d.expiry_time);
    const now = new Date();
    const hoursLeft = (expiryDate - now) / (1000 * 60 * 60);
    const isUrgent = hoursLeft > 0 && hoursLeft <= 2.5;

    let countdownText = formatCountdown(d.expiry_time);
    const isAvailable = d.status === 'available';

    return `
      <div class="food-card" id="food-card-${d.id}">
        <div class="food-card-img-wrap">
          <img src="${d.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600'}" 
               class="food-card-img" alt="${escapeHtml(d.title)}" loading="lazy">
          
          <div class="card-top-badges">
            <span class="dietary-badge ${d.dietary_type}">
              ${d.dietary_type === 'veg' ? '🥗 VEG' : d.dietary_type === 'non_veg' ? '🍗 NON-VEG' : d.dietary_type === 'vegan' ? '🌱 VEGAN' : '🥚 EGG'}
            </span>
            <span class="status-badge ${d.status}">
              ${d.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div class="food-card-body">
          <div class="card-donor-row">
            <span class="donor-type-tag">
              🏛️ ${escapeHtml(d.donor_type.replace('_', ' ').toUpperCase())}
            </span>
            <span>📍 ${escapeHtml(d.city || 'Bangalore')}</span>
          </div>

          <h3 class="food-card-title">${escapeHtml(d.title)}</h3>

          <div class="food-card-metrics">
            <span class="metric-pill servings">
              👥 Feeds ~${d.servings} people
            </span>
            <span class="metric-pill">
              ⚖️ ${d.quantity} ${d.unit}
            </span>
            <span class="metric-pill">
              ❄️ ${escapeHtml(d.storage_condition.replace('_', ' '))}
            </span>
          </div>

          <div class="food-card-location">
            <span>📍</span>
            <span><strong>${escapeHtml(d.donor_name)}</strong> — ${escapeHtml(d.address)}</span>
          </div>

          <div class="expiry-countdown-bar ${isUrgent && isAvailable ? 'urgent' : ''}">
            <span>${isUrgent && isAvailable ? '🚨 Expiring Soon:' : '⏳ Safe Pickup Deadline:'}</span>
            <span class="countdown-clock" data-expiry="${d.expiry_time}">
              ${countdownText}
            </span>
          </div>

          <div class="food-card-actions">
            ${isAvailable ? `
              <button class="btn btn-primary" onclick="openClaimModal(${d.id})">
                🤝 Claim Food
              </button>
            ` : `
              <button class="btn btn-outline" disabled style="opacity:0.7; cursor:not-allowed;">
                🔒 ${d.status.toUpperCase()}
              </button>
            `}
            <button class="btn btn-outline btn-icon" title="View on interactive map" 
                    onclick="flyToDonation(${d.lat}, ${d.lng}, ${d.id})">
              🗺️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Update Urgent Food Radar Banner
function updateUrgentBanner(donations) {
  const container = document.getElementById('urgentFoodBanner');
  if (!container) return;

  const urgentItems = donations.filter(d => {
    if (d.status !== 'available') return false;
    const hours = (new Date(d.expiry_time) - new Date()) / (1000 * 3600);
    return hours > 0 && hours <= 3;
  });

  if (urgentItems.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  const topItem = urgentItems[0];

  container.innerHTML = `
    <div style="background:linear-gradient(90deg, #fff1f2 0%, #fee2e2 100%); border:1.5px solid #fecdd3; border-radius:1.25rem; padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <span class="pulse-dot" style="background:#ef4444; width:12px; height:12px;"></span>
        <div>
          <span style="font-weight:800; color:#b91c1c; font-size:0.95rem;">⚡ Urgent Rescue Alert (${urgentItems.length} donations expiring soon!):</span>
          <span style="color:#7f1d1d; font-size:0.9rem; margin-left:0.5rem;">
            "${escapeHtml(topItem.title)}" (${topItem.servings} meals) at ${escapeHtml(topItem.donor_name)}
          </span>
        </div>
      </div>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <span class="countdown-pill" style="font-size:0.8rem; padding:0.3rem 0.75rem;">
          ${formatCountdown(topItem.expiry_time)}
        </span>
        <button class="btn btn-danger btn-sm" onclick="openClaimModal(${topItem.id})">
          Claim Now
        </button>
      </div>
    </div>
  `;
}

// Format Countdown
function formatCountdown(expiryIso) {
  const expiry = new Date(expiryIso);
  const now = new Date();
  const diffMs = expiry - now;

  if (diffMs <= 0) return 'Expired';

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${mins}m remaining`;
  }
  return `${mins}m remaining`;
}

// Live Countdown Updater
function updateLiveCountdowns() {
  document.querySelectorAll('.countdown-clock').forEach(el => {
    const expiry = el.getAttribute('data-expiry');
    if (expiry) el.textContent = formatCountdown(expiry);
  });
}

// Homepage Impact Counter Animation
async function loadHomepageImpact() {
  try {
    const res = await fetch('/api/admin/stats');
    const stats = await res.json();
    if (!res.ok) return;

    animateCounter('impactMealsCount', stats.totalMeals);
    animateCounter('impactKgCount', Math.round(stats.totalKg));
    animateCounter('impactCo2Count', stats.co2SavedKg);
    animateCounter('impactNgoCount', stats.activeNGOs);
    animateCounter('impactVolCount', stats.activeVolunteers);
  } catch (e) {
    // Graceful fallback to static demo numbers
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const duration = 1200;
  const stepTime = 30;
  const steps = duration / stepTime;
  const increment = target / steps;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = target.toLocaleString();
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current).toLocaleString();
    }
  }, stepTime);
}

// Reset Filters
function clearFilters() {
  currentCategory = 'all';
  currentDietary = 'all';
  currentSearch = '';
  currentUrgency = 'all';

  const sInput = document.getElementById('foodSearchInput');
  if (sInput) sInput.value = '';
  const dSelect = document.getElementById('foodDietarySelect');
  if (dSelect) dSelect.value = 'all';
  const cSelect = document.getElementById('foodCategorySelect');
  if (cSelect) cSelect.value = 'all';

  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  const allPill = document.querySelector('.cat-pill[data-category="all"]');
  if (allPill) allPill.classList.add('active');

  loadDonations();
}

// Global Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Utility Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTimeLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
