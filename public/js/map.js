// map.js - Real Interactive Leaflet & OpenStreetMap Engine for FoodLoop Platform
let foodMap = null;
let formPickerMap = null;
let mapMarkers = [];
let userCurrentPos = { lat: 12.9716, lng: 77.5946 }; // Default center (Bangalore Tech & Education Hub)
let userLocationMarker = null;
let formPickerMarker = null;

// Initialize Main Food Map
function initFoodMap() {
  const mapContainer = document.getElementById('foodMap');
  if (!mapContainer || foodMap) return;

  // Create Leaflet map
  foodMap = L.map('foodMap', {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([userCurrentPos.lat, userCurrentPos.lng], 12);

  // High quality, clean OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | FoodLoop Rescue Radar'
  }).addTo(foodMap);

  // Try getting user location on init
  requestUserLocation(false);
}

// Request User Browser Location
function requestUserLocation(panToUser = true) {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userCurrentPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        if (foodMap) {
          // Add or update pulsing user marker
          if (userLocationMarker) {
            foodMap.removeLayer(userLocationMarker);
          }

          const userIcon = L.divIcon({
            className: 'user-gps-marker',
            html: `<div style="width:20px; height:20px; background:#0284c7; border:3px solid #fff; border-radius:50%; box-shadow:0 0 0 6px rgba(2, 132, 199, 0.35); animation: pulsePin 2s infinite;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          userLocationMarker = L.marker([userCurrentPos.lat, userCurrentPos.lng], { icon: userIcon })
            .addTo(foodMap)
            .bindPopup('<b>📍 Your Current Location</b><br><small>Redistribution radius calculated from here</small>');

          if (panToUser) {
            foodMap.flyTo([userCurrentPos.lat, userCurrentPos.lng], 14, { duration: 1.2 });
            showToast('Centered on your GPS location', 'info');
          }
        }
      },
      (error) => {
        console.warn('Geolocation access declined or unavailable, using campus default.', error.message);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  }
}

// Render Donation Markers on the Map
function renderMapMarkers(donations) {
  if (!foodMap) initFoodMap();

  // Clear previous markers
  mapMarkers.forEach(m => foodMap.removeLayer(m.marker));
  mapMarkers = [];

  const bounds = L.latLngBounds();

  donations.forEach(donation => {
    if (!donation.lat || !donation.lng) return;

    // Check urgency (less than 2.5 hours remaining)
    const expiryDate = new Date(donation.expiry_time);
    const now = new Date();
    const hoursLeft = (expiryDate - now) / (1000 * 60 * 60);
    const isUrgent = hoursLeft > 0 && hoursLeft <= 2.5;
    const isReserved = donation.status !== 'available';

    // Color marker class
    let pinClass = 'pin-veg';
    let iconChar = '🥗';
    if (donation.dietary_type === 'non_veg') {
      pinClass = 'pin-nonveg';
      iconChar = '🍗';
    } else if (donation.dietary_type === 'egg') {
      pinClass = 'pin-nonveg';
      iconChar = '🥚';
    }

    if (isUrgent && !isReserved) {
      pinClass = 'pin-urgent';
      iconChar = '⚡';
    } else if (isReserved) {
      pinClass = 'pin-claimed';
      iconChar = '🔒';
    }

    const customIcon = L.divIcon({
      className: 'leaflet-custom-marker-wrapper',
      html: `
        <div class="custom-map-pin ${pinClass}" title="${escapeHtml(donation.title)}">
          <span>${iconChar}</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });

    const marker = L.marker([donation.lat, donation.lng], { icon: customIcon }).addTo(foodMap);

    // Build rich popup content
    const osmRoutingUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userCurrentPos.lat}%2C${userCurrentPos.lng}%3B${donation.lat}%2C${donation.lng}`;

    const popupHtml = `
      <div>
        <img src="${donation.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400'}" class="popup-img-thumb" alt="${escapeHtml(donation.title)}">
        <div class="popup-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span class="dietary-badge ${donation.dietary_type}" style="font-size:0.65rem; padding:2px 6px;">
              ${donation.dietary_type.toUpperCase()}
            </span>
            <span style="font-size:0.75rem; font-weight:700; color:#15803d;">
              ${donation.quantity} ${donation.unit} (${donation.servings} meals)
            </span>
          </div>
          <h4 class="popup-title">${escapeHtml(donation.title)}</h4>
          <p class="popup-meta">
            📍 <strong>${escapeHtml(donation.donor_name)}</strong><br>
            <span>${escapeHtml(donation.address)}</span>
          </p>
          <div style="font-size:0.75rem; color:#b91c1c; font-weight:700; margin-bottom:8px;">
            ⏳ Safe Pickup Before: ${formatTime(donation.expiry_time)}
          </div>
          <div class="popup-actions">
            ${donation.status === 'available' ? `
              <button class="btn btn-primary btn-sm" onclick="openClaimModal(${donation.id})">
                🤝 Claim Food
              </button>
            ` : `
              <span class="status-badge ${donation.status}" style="font-size:0.7rem;">${donation.status.toUpperCase()}</span>
            `}
            <a href="${osmRoutingUrl}" target="_blank" class="btn btn-outline btn-sm" title="Real OpenStreetMap directions">
              🗺️ Route
            </a>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);

    // Marker click highlights the matching card in the listing
    marker.on('click', () => {
      highlightListingCard(donation.id);
    });

    mapMarkers.push({ id: donation.id, marker });
    bounds.extend([donation.lat, donation.lng]);
  });

  // Fit bounds if markers exist and not zoomed in manually
  if (donations.length > 0 && bounds.isValid()) {
    foodMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
}

// Fly map to a specific donation marker and open popup
function flyToDonation(lat, lng, donationId) {
  if (!foodMap) initFoodMap();
  foodMap.flyTo([lat, lng], 15, { duration: 1 });

  const found = mapMarkers.find(m => m.id === donationId);
  if (found) {
    setTimeout(() => {
      found.marker.openPopup();
    }, 900);
  }
}

// Highlight listing card in the DOM
function highlightListingCard(id) {
  document.querySelectorAll('.food-card').forEach(c => c.classList.remove('highlighted'));
  const card = document.getElementById(`food-card-${id}`);
  if (card) {
    card.classList.add('highlighted');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// -------------------------------------------------------------
// Interactive Map Picker inside Food Donation Form
// -------------------------------------------------------------
function initFormMapPicker() {
  const container = document.getElementById('formMapPicker');
  if (!container) return;

  if (formPickerMap) {
    formPickerMap.invalidateSize();
    return;
  }

  const initialLat = userCurrentPos.lat;
  const initialLng = userCurrentPos.lng;

  formPickerMap = L.map('formMapPicker').setView([initialLat, initialLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(formPickerMap);

  const pickerIcon = L.divIcon({
    className: 'picker-pin',
    html: `<div style="width:28px; height:28px; background:#16a34a; border:3px solid #fff; border-radius:50%; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold;">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });

  formPickerMarker = L.marker([initialLat, initialLng], {
    icon: pickerIcon,
    draggable: true
  }).addTo(formPickerMap);

  updateFormCoordinates(initialLat, initialLng);

  // Update on pin drag
  formPickerMarker.on('dragend', function (e) {
    const coord = e.target.getLatLng();
    updateFormCoordinates(coord.lat, coord.lng);
  });

  // Update on map click
  formPickerMap.on('click', function (e) {
    formPickerMarker.setLatLng(e.latlng);
    updateFormCoordinates(e.latlng.lat, e.latlng.lng);
  });
}

function updateFormCoordinates(lat, lng) {
  const latInput = document.getElementById('donationLat');
  const lngInput = document.getElementById('donationLng');
  const coordDisplay = document.getElementById('coordDisplay');

  if (latInput) latInput.value = lat.toFixed(5);
  if (lngInput) lngInput.value = lng.toFixed(5);
  if (coordDisplay) coordDisplay.textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
}

function useGpsInForm() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (formPickerMap && formPickerMarker) {
          formPickerMap.setView([lat, lng], 15);
          formPickerMarker.setLatLng([lat, lng]);
          updateFormCoordinates(lat, lng);
          showToast('Updated location to current GPS coordinates', 'success');
        }
      },
      (err) => {
        showToast('Unable to fetch GPS. You can click on the map to set location.', 'info');
      }
    );
  }
}
