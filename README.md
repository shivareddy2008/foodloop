# FoodLoop — Good Food. No Waste.
## Smart Surplus Food Rescue & Hyper-Local Redistribution Platform
**B.Tech Internet Programming (IP) Project with Real Startup Potential**

---

## 🌟 Executive Overview
**FoodLoop** is an end-to-end, modern, responsive web platform designed to bridge the gap between food surplus generators (hostel messes, restaurants, banquet halls, caterers, bakeries) and authorized food redistributors (NGOs, soup kitchens, orphanages, and student volunteer rescue squads). 

By uniting **real-time Leaflet & OpenStreetMap geolocation**, **dynamic urgency decay timers**, and a **cryptographic 4-digit handover OTP protocol**, FoodLoop turns safe, edible surplus into immediate meals for hungry communities before food expires.

---

## 🚀 Key Features & Highlights

1. **Premium Startup-Style Design System**:
   - Palette: Emerald green (`#10b981`), crisp white, and warm cream (`#fcfbf7`).
   - Clean typography, glassmorphism headers, subtle micro-interactions, responsive drawer grids.
   - Designed to match modern cleantech products (e.g. Too Good To Go, Linear, Stripe).

2. **Real Interactive Geolocation Radar (Leaflet + OpenStreetMap)**:
   - **Zero Paid Google Maps API Key dependency**: 100% free, reliable OpenStreetMap cartography.
   - Custom SVG map markers color-coded by dietary type (Green = Veg, Orange = Non-Veg) and urgency (Red pulsing marker for $< 2.5\text{ hours}$ remaining).
   - **Synchronized Split View**: Clicking a listing card smoothly flies the map to the location and opens its popup; clicking a map marker automatically highlights and scrolls to the card.
   - **One-Click Turn-by-Turn Navigation**: Real OpenStreetMap OSRM routing link for volunteer bikes/vans.
   - **Browser Geolocation**: `navigator.geolocation` integration with GPS locate button.

3. **12 Comprehensive Food Categories**:
   - 🍚 Rice, Biryani, Pulao & Fried Rice
   - 🫓 Chapati, Roti, Naan & Paratha
   - 🍲 Dal, Curry, Sambar & Vegetable Meals
   - 🥞 Idli, Dosa, Upma & Breakfast Tiffins
   - 🍱 Veg & Non-Veg Meal Boxes
   - 🍎 Fruits & Vegetables
   - 🥐 Bread, Cakes, Biscuits & Bakery Items
   - 🥨 Packaged Snacks & Sealed Food
   - 🥛 Milk, Dairy Products & Beverages
   - 🎊 Wedding, Birthday & Event Surplus Meals
   - 🎓 College Hostel & Canteen Surplus Food
   - 🌾 Dry Groceries & Staples

4. **Working Donation System with Coordinate Picker**:
   - Donation title, category, veg/non-veg/vegan/egg dietary selector.
   - Quantity, unit, and automated approximate servings calculation.
   - Preparation time & safe pickup deadline (with quick $+2\text{h}$, $+4\text{h}$, $+6\text{h}$, $+12\text{h}$ offset helpers).
   - Storage condition (Hot insulated, Room temperature, Refrigerated, Deep frozen).
   - Allergen declaration & packaging type.
   - **Interactive Leaflet Coordinate Pin**: Donors can click or drag the pin directly on the map or click *"Use Current GPS"* to auto-populate accurate latitude & longitude.
   - Visual food image presets + custom image upload support.

5. **NGO & Volunteer Workflow with Secure OTP Handover**:
   - Volunteer selects vehicle type (Bike, Auto, Delivery Van, Foot), ETA, and target beneficiary.
   - Claim generates a **Secure 4-Digit Handover OTP** and a **Digital Dispatch Pass**.
   - **Handover Verification**: Donor checks and inputs the volunteer's OTP into their portal to confirm food release.
   - Full status lifecycle: `Available` $\to$ `Reserved` $\to$ `Picked Up` $\to$ `Completed`.

6. **Fast 1-Click Role Switcher for Viva Presentations**:
   - Immediate persona switching without typing passwords:
     - 🍳 **Prof. Rajesh Sharma** (College Hostel Mess Warden / Donor)
     - 🤝 **Sunita Rao** (Roshni Food Bank Director / NGO Partner)
     - 🚴 **Arjun Patel** (Student Volunteer Lead / Rescuer)
     - 👑 **System Admin** (IP Project Lead / System Governance)
     - 👤 **Guest Visitor** (Public view)

7. **Admin Console & Viva Reporting**:
   - Live platform metrics: Servings rescued, Kilograms saved, CO₂e averted ($1\text{ meal} \approx 1.85\text{ kg CO}_2\text{e}$).
   - Donation pipeline status distribution.
   - Registered stakeholders directory.
   - Real-time audit trail and event log.
   - **One-Click CSV Report Export** for college project viva submissions!
   - **Reset Demo Database** helper button.

---

## 🛠️ Architecture & Tech Stack

```
+-------------------------------------------------------------+
|                     Client (Browser)                        |
|   HTML5 + Vanilla CSS3 + Modern ES6 Modules                 |
|   Leaflet.js + OpenStreetMap (OSM) Cartography & Routing     |
+-------------------------------------------------------------+
                              |
                     REST API (HTTP / JSON)
                              |
+-------------------------------------------------------------+
|                   Backend Server (Node.js)                  |
|   Native node:http Server (Zero Fragile NPM Dependencies)   |
|   RESTful Endpoints (/api/donations, /api/auth, etc.)       |
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|                Database Engine (SQLite)                     |
|   Built-in node:sqlite (DatabaseSync) with WAL Mode         |
|   Tables: users, donations, claims, audit_logs              |
+-------------------------------------------------------------+
```

---

## 💻 Quick Start & Running the Platform

### Option A: Double-Click (Windows)
Double-click `run.bat` in the project directory. It detects the Node.js runtime and automatically launches the platform at `http://localhost:3000`.

### Option B: PowerShell
Open PowerShell in the project directory and execute:
```powershell
.\start.ps1
```

### Option C: Manual Command
```bash
node server.js
```
*(Or use the included `agy-node.cmd server.js`)*

Visit `http://localhost:3000` in any web browser.

---

## 🎓 IP Project Viva Voce Questions & Answers

### Q1: What problem does FoodLoop solve that existing delivery apps cannot?
**Answer:** Delivery apps (Swiggy, Zomato) are commercial on-demand food commerce platforms with paid order lifecycles and rigid merchant contracts. FoodLoop is a hyper-local, zero-cost rescue logistics network designed for perishable, time-sensitive surplus food. It incorporates safety countdown clocks based on FSSAI surplus guidelines and verifies physical handover via random 4-digit OTPs.

### Q2: Why did you choose Leaflet & OpenStreetMap over Google Maps?
**Answer:** 
1. **Zero Cost & Openness:** Google Maps requires a billed credit card and an API key with monthly usage quotas. OpenStreetMap (OSM) is free, open-source, and privacy-respecting.
2. **Speed & Lightweight:** Leaflet is only ~42 KB, resulting in fast mobile loading on 4G/5G connections.
3. **Turn-by-Turn Directions:** FoodLoop integrates OpenStreetMap OSRM routing directly without proprietary SDKs.

### Q3: How is data persistence handled?
**Answer:** The application uses an embedded **SQLite database (`foodloop.db`)** via Node.js native `DatabaseSync` engine with Write-Ahead Logging (WAL) enabled. It supports ACID transactions, foreign keys, and persistent relational data storage without relying on volatile browser localStorage.

### Q4: How does FoodLoop enforce food safety during redistribution?
**Answer:** 
1. **Automated Expiry Decoupling:** Donors must specify cooking and safe consumption deadlines. The system flags items expiring within 2.5 hours as urgent and locks expired items.
2. **Thermal Standards:** Hot foods must remain $\ge 60^\circ\text{C}$ and cold items $\le 5^\circ\text{C}$.
3. **Sensory Inspection:** Rescuers perform visual, aroma, and packaging checks before sharing the OTP.
