// admin.js - Platform Governance, System Analytics & Moderation Console
async function loadAdminDashboard() {
  await Promise.all([
    loadAdminStats(),
    loadAdminUsers(),
    loadAdminAuditLogs()
  ]);
}

// 1. Load System-Wide Stats
async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const statMeals = document.getElementById('adminStatMeals');
    const statKg = document.getElementById('adminStatKg');
    const statDonations = document.getElementById('adminStatDonations');
    const statCo2 = document.getElementById('adminStatCo2');
    const statUsers = document.getElementById('adminStatUsers');

    if (statMeals) statMeals.textContent = data.totalMeals.toLocaleString();
    if (statKg) statKg.textContent = `${data.totalKg.toLocaleString()} kg`;
    if (statDonations) statDonations.textContent = data.totalDonations;
    if (statCo2) statCo2.textContent = `${data.co2SavedKg.toLocaleString()} kg`;
    if (statUsers) statUsers.textContent = (data.activeDonors + data.activeNGOs + data.activeVolunteers);

    // Render Status Breakdown Bar
    const breakdownEl = document.getElementById('adminStatusBreakdown');
    if (breakdownEl && data.statusBreakdown) {
      breakdownEl.innerHTML = data.statusBreakdown.map(s => `
        <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:1rem; padding:0.75rem 1rem; text-align:center;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:#64748b; font-weight:700;">${s.status}</div>
          <div style="font-size:1.4rem; font-weight:800; color:#0f172a;">${s.count}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

// 2. Load Registered Users Directory
async function loadAdminUsers() {
  const tableBody = document.getElementById('adminUsersTableBody');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/users');
    const users = await res.json();
    if (!res.ok) throw new Error(users.error);

    tableBody.innerHTML = users.map(u => `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${escapeHtml(u.name)}</div>
          <div style="font-size:0.775rem; color:#64748b;">${escapeHtml(u.email)}</div>
        </td>
        <td>
          <span class="role-badge-pill" style="font-size:0.7rem; padding:2px 8px;">
            ${u.role.toUpperCase()}
          </span>
        </td>
        <td>${escapeHtml(u.organization || 'Individual')}</td>
        <td>${escapeHtml(u.phone || 'N/A')}</td>
        <td>
          <span style="font-weight:700; color:#15803d;">${u.donations_count} Donated</span> • 
          <span style="font-weight:700; color:#0284c7;">${u.claims_count} Claimed</span>
        </td>
        <td>
          <span style="color:#16a34a; font-weight:700;">● Verified</span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" style="color:#ef4444; padding:1rem;">Error: ${err.message}</td></tr>`;
  }
}

// 3. Load Audit Trail
async function loadAdminAuditLogs() {
  const container = document.getElementById('adminAuditLogsList');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/audit-logs');
    const logs = await res.json();
    if (!res.ok) throw new Error(logs.error);

    container.innerHTML = logs.map(l => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.75rem; border-bottom:1px solid #f1f5f9; font-size:0.825rem;">
        <div>
          <span style="font-weight:700; color:#064e3b; background:#dcfce7; padding:2px 6px; border-radius:4px; font-size:0.725rem; margin-right:6px;">
            ${l.event_type}
          </span>
          <span style="color:#334155;">${escapeHtml(l.details)}</span>
        </div>
        <div style="color:#94a3b8; font-size:0.75rem; white-space:nowrap; margin-left:1rem;">
          ${formatTime(l.created_at)}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:#ef4444; padding:0.5rem;">Error: ${err.message}</div>`;
  }
}

// 4. Export Donations to CSV for Viva / College Submission
async function exportDonationsCSV() {
  try {
    const res = await fetch('/api/donations?status=all');
    const donations = await res.json();

    if (!donations || donations.length === 0) {
      showToast('No donation records to export', 'info');
      return;
    }

    const headers = ['ID', 'Title', 'Category', 'Dietary', 'Quantity', 'Unit', 'Servings', 'Donor', 'Address', 'Status', 'Expiry Time'];
    const rows = donations.map(d => [
      d.id,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      d.category,
      d.dietary_type,
      d.quantity,
      d.unit,
      d.servings,
      `"${(d.donor_name || '').replace(/"/g, '""')}"`,
      `"${(d.address || '').replace(/"/g, '""')}"`,
      d.status,
      d.expiry_time
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `foodloop_rescue_data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 CSV report downloaded successfully for project viva!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 5. Reset Database to Clean Demo State
async function handleResetToDemo() {
  if (!confirm('Are you sure you want to reset FoodLoop database back to the initial pilot state? This will re-seed the 12 default food donations and accounts.')) {
    return;
  }

  try {
    const res = await fetch('/api/admin/reset-demo', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('✨ Database successfully reset to clean demo state.', 'success');
    if (window.loadDonations) window.loadDonations();
    loadAdminDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
