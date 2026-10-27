// donor.js - Food Donation System & Donor Management Portal
let selectedPhotoUrl = 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80';

// Preset Food Photo options for instant high-quality visuals
const PHOTO_PRESETS = [
  { label: 'Biryani / Pulao', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80' },
  { label: 'Roti / Chapati / Naan', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  { label: 'Dal & Curry Feast', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80' },
  { label: 'South Indian Breakfast', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80' },
  { label: 'Veg/Non-Veg Meal Boxes', url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80' },
  { label: 'Bakery & Bread', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80' },
  { label: 'Fresh Fruits & Greens', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&auto=format&fit=crop&q=80' },
  { label: 'Dry Groceries & Staples', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80' }
];

// Open Food Donation Modal
function openDonateModal() {
  const modal = document.getElementById('donateModal');
  if (!modal) return;

  // Auto-fill donor details from logged in user if available
  if (currentUser) {
    const nameField = document.getElementById('donorName');
    const orgField = document.getElementById('donorOrg');
    const phoneField = document.getElementById('donorPhone');
    const addrField = document.getElementById('donationAddress');

    if (nameField && !nameField.value) nameField.value = currentUser.name;
    if (orgField && !orgField.value) orgField.value = currentUser.organization || '';
    if (phoneField && !phoneField.value) phoneField.value = currentUser.phone || '';
    if (addrField && !addrField.value) addrField.value = currentUser.address || 'Central Campus Gate, Bangalore';
  }

  // Set default cooked time to 1 hour ago
  const cookedInput = document.getElementById('donationCookedTime');
  if (cookedInput && !cookedInput.value) {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    cookedInput.value = formatDateTimeLocal(past);
  }

  // Set default safe pickup deadline to 4 hours from now
  setDeadlineOffset(4);

  // Render photo presets
  renderPhotoPresets();

  modal.classList.add('active');

  // Trigger leaflet map picker resize
  setTimeout(() => {
    initFormMapPicker();
  }, 250);
}

function closeDonateModal() {
  const modal = document.getElementById('donateModal');
  if (modal) modal.classList.remove('active');
}

// Quick Expiry Offset Buttons (+2h, +4h, +6h, +12h)
function setDeadlineOffset(hours) {
  const expiryInput = document.getElementById('donationExpiryTime');
  if (!expiryInput) return;
  const target = new Date(Date.now() + hours * 3600 * 1000);
  expiryInput.value = formatDateTimeLocal(target);
}

// Render Photo Preset selector
function renderPhotoPresets() {
  const container = document.getElementById('photoPresetContainer');
  if (!container) return;

  container.innerHTML = PHOTO_PRESETS.map((p, idx) => `
    <div class="image-preset-option ${p.url === selectedPhotoUrl ? 'selected' : ''}" 
         onclick="selectPresetPhoto('${p.url}')" title="${p.label}">
      <img src="${p.url}" alt="${p.label}">
    </div>
  `).join('');
}

function selectPresetPhoto(url) {
  selectedPhotoUrl = url;
  const customInput = document.getElementById('donationImageUrl');
  if (customInput) customInput.value = url;
  renderPhotoPresets();
}

// Handle Donation Form Submit
async function handleDonationSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('donationTitle').value.trim();
  const category = document.getElementById('donationCategory').value;
  const dietary_type = document.getElementById('donationDietary').value;
  const quantity = parseFloat(document.getElementById('donationQuantity').value);
  const unit = document.getElementById('donationUnit').value;
  const servings = parseInt(document.getElementById('donationServings').value, 10);
  const cooked_time = document.getElementById('donationCookedTime').value;
  const expiry_time = document.getElementById('donationExpiryTime').value;
  const storage_condition = document.getElementById('donationStorage').value;
  const allergens = document.getElementById('donationAllergens').value.trim() || 'None reported';
  const packaging_type = document.getElementById('donationPackaging').value.trim() || 'Packed in hygienic containers';

  const donor_name = document.getElementById('donorName').value.trim();
  const donor_org = document.getElementById('donorOrg').value.trim();
  const donor_phone = document.getElementById('donorPhone').value.trim();
  const donor_type = document.getElementById('donorType').value;
  const address = document.getElementById('donationAddress').value.trim();
  const city = document.getElementById('donationCity').value.trim() || 'Bangalore';

  const lat = parseFloat(document.getElementById('donationLat').value) || (userCurrentPos.lat + (Math.random() - 0.5) * 0.04);
  const lng = parseFloat(document.getElementById('donationLng').value) || (userCurrentPos.lng + (Math.random() - 0.5) * 0.04);
  const pickup_instructions = document.getElementById('donationInstructions').value.trim();
  const image_url = document.getElementById('donationImageUrl').value.trim() || selectedPhotoUrl;

  const payload = {
    title, category, dietary_type, quantity, unit, servings,
    cooked_time: new Date(cooked_time).toISOString(),
    expiry_time: new Date(expiry_time).toISOString(),
    storage_condition, allergens, packaging_type,
    donor_name, donor_org, donor_phone, donor_type,
    address, city, lat, lng, pickup_instructions, image_url
  };

  try {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : ''
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list food donation');

    closeDonateModal();
    showToast(`🎉 Food surplus listed successfully! Feeds ~${servings} people.`, 'success');

    // Reset form
    document.getElementById('donationForm').reset();

    // Reload active listings & fly to the newly created pin
    if (window.loadDonations) {
      await window.loadDonations();
      setTimeout(() => {
        if (window.flyToDonation) window.flyToDonation(data.lat, data.lng, data.id);
      }, 600);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// Donor Portal: Manage My Donations & Verify Handover OTP
// -------------------------------------------------------------
async function loadMyDonations() {
  const container = document.getElementById('myDonationsList');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:2rem; color:#64748b;">Loading donor listings...</div>`;

  try {
    const res = await fetch('/api/my/donations', {
      headers: { 'Authorization': authToken ? `Bearer ${authToken}` : '' }
    });
    const items = await res.json();

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; background:#fff; border-radius:1.5rem; border:1px dashed #cbd5e1;">
          <p style="font-size:1.1rem; font-weight:700; color:#334155; margin-bottom:0.5rem;">No active donations posted yet</p>
          <p style="color:#64748b; font-size:0.9rem; margin-bottom:1.25rem;">Post surplus food from your mess, banquet, or bakery to see it tracked here.</p>
          <button class="btn btn-primary" onclick="openDonateModal()">➕ Post Food Surplus</button>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(d => `
      <div class="food-card" style="margin-bottom:1.25rem; border-left:5px solid ${d.status === 'available' ? '#16a34a' : d.status === 'reserved' ? '#f59e0b' : '#0284c7'};">
        <div class="food-card-body">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
            <div>
              <span class="dietary-badge ${d.dietary_type}" style="margin-right:0.5rem;">${d.dietary_type.toUpperCase()}</span>
              <span class="status-badge ${d.status}">${d.status.toUpperCase()}</span>
            </div>
            <div style="font-size:0.8rem; color:#64748b;">Created: ${formatDate(d.created_at)}</div>
          </div>

          <h3 style="font-size:1.15rem; font-weight:800; color:#0f172a; margin-bottom:0.35rem;">${escapeHtml(d.title)}</h3>
          <p style="font-size:0.85rem; color:#475569; margin-bottom:0.75rem;">
            <strong>Quantity:</strong> ${d.quantity} ${d.unit} (Feeds ~${d.servings} people) • 
            <strong>Safe Until:</strong> ${formatTime(d.expiry_time)}
          </p>

          ${d.status === 'reserved' ? `
            <div style="background:#fffbeb; border:1.5px solid #fde68a; border-radius:1rem; padding:1rem; margin-top:0.5rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <h4 style="color:#92400e; font-size:0.9rem; font-weight:800;">🚨 Food Claimed & Pickup In Progress</h4>
                <span style="font-size:0.75rem; background:#f59e0b; color:#fff; padding:2px 8px; border-radius:999px; font-weight:700;">Awaiting Handover</span>
              </div>
              <p style="font-size:0.825rem; color:#78350f; margin-bottom:0.75rem;">
                Claimed by: <strong>${escapeHtml(d.claimant_name || 'Volunteer')}</strong> (${escapeHtml(d.claimant_org || 'Rescue Team')})<br>
                Contact: <a href="tel:${d.claimant_phone}">${d.claimant_phone}</a>
              </p>
              
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <input type="text" id="otp-verify-input-${d.claim_id || d.id}" placeholder="Enter Volunteer 4-Digit OTP" 
                       style="width:220px; padding:0.45rem 0.75rem; border:1.5px solid #cbd5e1; border-radius:0.5rem; font-weight:700; font-family:monospace; font-size:1rem; text-align:center;" maxlength="4">
                <button class="btn btn-primary btn-sm" onclick="verifyVolunteerOtp(${d.claim_id || d.id})">
                  ✅ Verify & Handover Food
                </button>
              </div>
            </div>
          ` : d.status === 'picked_up' ? `
            <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:0.75rem; padding:0.75rem; color:#0369a1; font-size:0.825rem; font-weight:600;">
              🚚 Food has been safely handed over to volunteer and is en route for distribution.
            </div>
          ` : d.status === 'completed' ? `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:0.75rem; padding:0.75rem; color:#15803d; font-size:0.825rem; font-weight:600;">
              ✨ Redistribution Complete! Meals reached beneficiaries with zero food waste.
            </div>
          ` : `
            <div style="color:#16a34a; font-size:0.825rem; font-weight:600;">
              🟢 Active on Rescue Radar — Waiting for nearby NGO / volunteer claim.
            </div>
          `}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:#ef4444; padding:1rem;">Failed to load donations: ${err.message}</div>`;
  }
}

// Verify Volunteer OTP by Donor
async function verifyVolunteerOtp(claimId) {
  const input = document.getElementById(`otp-verify-input-${claimId}`);
  if (!input || !input.value.trim()) {
    showToast('Please enter the 4-digit OTP provided by the volunteer', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/claims/${claimId}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : ''
      },
      body: JSON.stringify({ otp_code: input.value.trim() })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OTP verification failed');

    showToast('✅ Food handover successfully verified! Status updated to Picked Up.', 'success');
    loadMyDonations();
    if (window.loadDonations) window.loadDonations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
