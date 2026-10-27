// claim.js - NGO & Volunteer Claim Flow & Pickup Verification Engine
let activeClaimDonationId = null;

// Open Claim Food Modal
async function openClaimModal(donationId) {
  activeClaimDonationId = donationId;
  const modal = document.getElementById('claimModal');
  if (!modal) return;

  // Auto-switch to Volunteer or NGO role if user is guest or donor
  if (!currentUser || currentUser.role === 'donor') {
    switchDemoRole('volunteer', false);
  }

  // Pre-fill claimant fields
  if (currentUser) {
    const nameField = document.getElementById('claimantName');
    const orgField = document.getElementById('claimantOrg');
    const phoneField = document.getElementById('claimantPhone');
    if (nameField) nameField.value = currentUser.name;
    if (orgField) orgField.value = currentUser.organization || 'Youth Food Rescue Brigade';
    if (phoneField) phoneField.value = currentUser.phone || '+91 99887 76655';
  }

  // Fetch donation details to show summary
  try {
    const res = await fetch(`/api/donations/${donationId}`);
    const donation = await res.json();
    if (!res.ok) throw new Error(donation.error || 'Failed to load donation details');

    const summaryEl = document.getElementById('claimDonationSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="background:#f4fbf7; border:1px solid #bbf7d0; border-radius:1rem; padding:1rem; margin-bottom:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
            <h4 style="color:#0f172a; font-size:1.05rem; font-weight:800;">${escapeHtml(donation.title)}</h4>
            <span class="dietary-badge ${donation.dietary_type}">${donation.dietary_type.toUpperCase()}</span>
          </div>
          <p style="font-size:0.85rem; color:#475569; margin-bottom:0.25rem;">
            <strong>Quantity:</strong> ${donation.quantity} ${donation.unit} (${donation.servings} meals) • 
            <strong>Storage:</strong> ${donation.storage_condition}
          </p>
          <p style="font-size:0.825rem; color:#15803d; font-weight:600;">
            📍 Pickup from: ${escapeHtml(donation.donor_name)} — ${escapeHtml(donation.address)}
          </p>
        </div>
      `;
    }

    modal.classList.add('active');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeClaimModal() {
  const modal = document.getElementById('claimModal');
  if (modal) modal.classList.remove('active');
}

// Handle Claim Form Submission
async function handleClaimSubmit(event) {
  event.preventDefault();
  if (!activeClaimDonationId) return;

  const claimant_name = document.getElementById('claimantName').value.trim();
  const claimant_org = document.getElementById('claimantOrg').value.trim();
  const claimant_phone = document.getElementById('claimantPhone').value.trim();
  const vehicle_type = document.getElementById('claimVehicle').value;
  const eta_minutes = parseInt(document.getElementById('claimEta').value, 10);
  const beneficiary_type = document.getElementById('claimBeneficiary').value;
  const notes = document.getElementById('claimNotes').value.trim();

  const payload = {
    claimant_name,
    claimant_org,
    claimant_phone,
    claimant_role: currentUser ? currentUser.role : 'volunteer',
    vehicle_type,
    eta_minutes,
    beneficiary_type,
    notes
  };

  try {
    const res = await fetch(`/api/donations/${activeClaimDonationId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : ''
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to claim food');

    closeClaimModal();
    showToast('🎉 Food successfully claimed! Digital Pass generated.', 'success');

    // Show Digital Pass Modal
    showDigitalPassModal(data.claim, data.donationTitle);

    // Refresh listings & map
    if (window.loadDonations) window.loadDonations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Show Digital Pickup Pass & OTP Modal
function showDigitalPassModal(claim, donationTitle) {
  const modal = document.getElementById('digitalPassModal');
  const content = document.getElementById('digitalPassContent');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="digital-pass-card">
      <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em; color:#a7f3d0; margin-bottom:0.25rem;">
        Official FoodLoop Rescue Dispatch Pass
      </div>
      <h3 style="font-size:1.35rem; font-weight:800; margin-bottom:0.75rem;">${escapeHtml(donationTitle || 'Surplus Meal Rescue')}</h3>

      <div style="font-size:0.85rem; color:#ecfdf5;">Present this Handover Verification Code to the Donor:</div>
      <div class="otp-huge-display">${claim.otp_code}</div>
      <div style="font-size:0.75rem; color:#a7f3d0;">4-Digit Handover Verification OTP</div>
    </div>

    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:1rem; padding:1.25rem; margin-bottom:1.25rem;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; font-size:0.85rem;">
        <div>
          <span style="color:#64748b;">Assigned Rescuer:</span><br>
          <strong style="color:#0f172a;">${escapeHtml(claim.claimant_name)}</strong>
        </div>
        <div>
          <span style="color:#64748b;">Organization:</span><br>
          <strong style="color:#0f172a;">${escapeHtml(claim.claimant_org)}</strong>
        </div>
        <div>
          <span style="color:#64748b;">Vehicle:</span><br>
          <strong style="color:#0f172a;">${claim.vehicle_type.toUpperCase()}</strong>
        </div>
        <div>
          <span style="color:#64748b;">Estimated Arrival:</span><br>
          <strong style="color:#15803d;">~${claim.eta_minutes} Minutes</strong>
        </div>
      </div>
    </div>

    <div style="font-size:0.8rem; color:#475569; line-height:1.5;">
      💡 <strong>Standard Hygiene Protocol:</strong> Ensure thermal insulation or clean food-grade containers. Verify food aroma and temperature before departing.
    </div>
  `;

  modal.classList.add('active');
}

function closeDigitalPassModal() {
  const modal = document.getElementById('digitalPassModal');
  if (modal) modal.classList.remove('active');
}

// -------------------------------------------------------------
// NGO & Volunteer Dashboard: My Active Rescues
// -------------------------------------------------------------
async function loadMyClaims() {
  const container = document.getElementById('myClaimsList');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:2rem; color:#64748b;">Loading volunteer claims...</div>`;

  try {
    const res = await fetch('/api/my/claims', {
      headers: { 'Authorization': authToken ? `Bearer ${authToken}` : '' }
    });
    const items = await res.json();

    if (!items || items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; background:#fff; border-radius:1.5rem; border:1px dashed #cbd5e1;">
          <p style="font-size:1.1rem; font-weight:700; color:#334155; margin-bottom:0.5rem;">No active food claims</p>
          <p style="color:#64748b; font-size:0.9rem; margin-bottom:1.25rem;">Browse available surplus food on the live radar and claim a pickup.</p>
          <button class="btn btn-primary" onclick="switchMainTab('explore')">🔍 Browse Food Surplus</button>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(c => `
      <div class="food-card" style="margin-bottom:1.25rem; border-left:5px solid ${c.status === 'reserved' ? '#f59e0b' : c.status === 'picked_up' ? '#0284c7' : '#16a34a'};">
        <div class="food-card-body">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
            <div>
              <span class="status-badge ${c.status}">${c.status.toUpperCase()}</span>
              <span style="font-size:0.8rem; color:#64748b; margin-left:0.5rem;">Claimed: ${formatDate(c.claimed_at)}</span>
            </div>
            <div style="background:#064e3b; color:#a7f3d0; padding:2px 10px; border-radius:999px; font-weight:800; font-family:monospace; font-size:0.875rem;">
              OTP: ${c.otp_code}
            </div>
          </div>

          <h3 style="font-size:1.2rem; font-weight:800; color:#0f172a; margin-bottom:0.35rem;">${escapeHtml(c.donation_title)}</h3>
          
          <div style="font-size:0.85rem; color:#475569; margin-bottom:0.75rem;">
            <strong>Quantity:</strong> ${c.quantity} ${c.unit} (${c.servings} meals) • 
            <strong>Donor:</strong> ${escapeHtml(c.donor_name)} (<a href="tel:${c.donor_phone}">${c.donor_phone}</a>)<br>
            <strong>Pickup Location:</strong> ${escapeHtml(c.pickup_address)}
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; margin-top:0.75rem;">
            <a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userCurrentPos.lat}%2C${userCurrentPos.lng}%3B${c.lat}%2C${c.lng}" 
               target="_blank" class="btn btn-outline btn-sm">
              🗺️ OpenStreetMap Navigation
            </a>

            ${c.status === 'reserved' ? `
              <button class="btn btn-accent btn-sm" onclick="showDigitalPassModal(${JSON.stringify(c).replace(/"/g, '&quot;')}, '${escapeHtml(c.donation_title)}')">
                🎫 View Pickup Pass & OTP
              </button>
            ` : c.status === 'picked_up' ? `
              <button class="btn btn-primary btn-sm" onclick="markClaimCompleted(${c.id})">
                ✅ Mark as Distributed to Shelter
              </button>
            ` : `
              <span style="font-size:0.825rem; font-weight:700; color:#15803d;">
                ✨ Redistribution Complete
              </span>
            `}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:#ef4444; padding:1rem;">Failed to load claims: ${err.message}</div>`;
  }
}

// Mark Claim Completed by Volunteer
async function markClaimCompleted(claimId) {
  try {
    const res = await fetch(`/api/claims/${claimId}/complete`, {
      method: 'POST',
      headers: { 'Authorization': authToken ? `Bearer ${authToken}` : '' }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete distribution');

    showToast('✨ Food marked as successfully distributed! Impact recorded.', 'success');
    loadMyClaims();
    if (window.loadDonations) window.loadDonations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
