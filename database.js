// database.js - Universal SQLite & In-Memory Fallback Database for FoodLoop
let DatabaseSync = null;
try {
  const sqlite = require('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (e) {
  // node:sqlite not available on older Node versions (e.g. Node 18/20)
  DatabaseSync = null;
}

const path = require('node:path');
const fs = require('node:fs');

// In-Memory / File Fallback Engine when node:sqlite is not supported
class FallbackDatabase {
  constructor(filepath) {
    this.filepath = filepath;
    this.tables = {
      users: [],
      donations: [],
      claims: [],
      audit_logs: []
    };
    this.autoInc = { users: 1, donations: 1, claims: 1, audit_logs: 1 };
  }

  exec(sql) {
    // Schema creation helper
    if (sql.includes('DELETE FROM claims')) {
      this.tables.claims = [];
      this.tables.donations = [];
      this.tables.users = [];
      this.tables.audit_logs = [];
    }
  }

  prepare(sql) {
    const cleanSql = sql.trim();
    const self = this;

    return {
      run(...params) {
        if (/INSERT INTO users/i.test(cleanSql)) {
          const id = self.autoInc.users++;
          const row = {
            id,
            name: params[0],
            email: params[1],
            password: params[2],
            role: params[3],
            organization: params[4] || '',
            phone: params[5] || '',
            address: params[6] || '',
            city: params[7] || 'Bangalore',
            verified: 1,
            created_at: new Date().toISOString()
          };
          self.tables.users.push(row);
          return { lastInsertRowid: id, changes: 1 };
        }

        if (/INSERT INTO donations/i.test(cleanSql)) {
          const id = self.autoInc.donations++;
          const row = {
            id,
            donor_id: params[0],
            donor_name: params[1],
            donor_org: params[2],
            donor_phone: params[3],
            donor_type: params[4],
            title: params[5],
            category: params[6],
            dietary_type: params[7],
            quantity: params[8],
            unit: params[9],
            servings: params[10],
            cooked_time: params[11],
            expiry_time: params[12],
            storage_condition: params[13],
            allergens: params[14],
            packaging_type: params[15],
            address: params[16],
            city: params[17],
            lat: params[18],
            lng: params[19],
            pickup_instructions: params[20],
            image_url: params[21],
            status: params[22] || 'available',
            is_sample: params[23] || 0,
            created_at: new Date().toISOString()
          };
          self.tables.donations.push(row);
          return { lastInsertRowid: id, changes: 1 };
        }

        if (/INSERT INTO claims/i.test(cleanSql)) {
          const id = self.autoInc.claims++;
          const row = {
            id,
            donation_id: params[0],
            user_id: params[1],
            claimant_name: params[2],
            claimant_org: params[3],
            claimant_phone: params[4],
            claimant_role: params[5],
            vehicle_type: params[6],
            eta_minutes: params[7],
            beneficiary_type: params[8],
            otp_code: params[9],
            status: 'reserved',
            notes: params[10] || '',
            claimed_at: new Date().toISOString(),
            picked_up_at: null,
            completed_at: null
          };
          self.tables.claims.push(row);
          return { lastInsertRowid: id, changes: 1 };
        }

        if (/INSERT INTO audit_logs/i.test(cleanSql)) {
          const id = self.autoInc.audit_logs++;
          self.tables.audit_logs.push({
            id,
            event_type: params[0],
            details: params[1],
            user_email: params[2] || '',
            created_at: new Date().toISOString()
          });
          return { lastInsertRowid: id, changes: 1 };
        }

        if (/UPDATE donations SET status/i.test(cleanSql)) {
          const status = cleanSql.match(/status\s*=\s*'([^']+)'/i)?.[1] || params[0];
          const id = params[params.length - 1];
          const d = self.tables.donations.find(x => x.id === Number(id));
          if (d) d.status = status;
          return { changes: 1 };
        }

        if (/UPDATE claims SET status/i.test(cleanSql)) {
          const status = cleanSql.match(/status\s*=\s*'([^']+)'/i)?.[1] || params[0];
          const id = params[params.length - 1];
          const c = self.tables.claims.find(x => x.id === Number(id));
          if (c) {
            c.status = status;
            if (status === 'picked_up') c.picked_up_at = new Date().toISOString();
            if (status === 'completed') c.completed_at = new Date().toISOString();
          }
          return { changes: 1 };
        }

        return { changes: 1 };
      },

      get(...params) {
        if (/SELECT COUNT\(\*\) as count FROM users/i.test(cleanSql) || /SELECT COUNT\(\*\) as c FROM users/i.test(cleanSql)) {
          if (/role\s*=\s*['"]donor['"]/i.test(cleanSql)) {
            return { c: self.tables.users.filter(u => u.role === 'donor').length, count: self.tables.users.filter(u => u.role === 'donor').length };
          }
          if (/role\s*=\s*['"]ngo['"]/i.test(cleanSql)) {
            return { c: self.tables.users.filter(u => u.role === 'ngo').length, count: self.tables.users.filter(u => u.role === 'ngo').length };
          }
          if (/role\s*=\s*['"]volunteer['"]/i.test(cleanSql)) {
            return { c: self.tables.users.filter(u => u.role === 'volunteer').length, count: self.tables.users.filter(u => u.role === 'volunteer').length };
          }
          return { count: self.tables.users.length, c: self.tables.users.length };
        }

        if (/SELECT COUNT\(\*\) as count FROM donations/i.test(cleanSql) || /SELECT COUNT\(\*\) as c FROM donations/i.test(cleanSql)) {
          if (/status\s*=\s*['"]completed['"]/i.test(cleanSql)) {
            return { c: self.tables.donations.filter(d => d.status === 'completed').length };
          }
          return { count: self.tables.donations.length, c: self.tables.donations.length };
        }

        if (/SELECT COUNT\(\*\) as c FROM claims/i.test(cleanSql)) {
          return { c: self.tables.claims.length };
        }

        if (/SUM\(servings\)/i.test(cleanSql)) {
          const s = self.tables.donations.reduce((acc, d) => acc + (d.status !== 'cancelled' ? (d.servings || 0) : 0), 0);
          return { s };
        }

        if (/SUM\(quantity\)/i.test(cleanSql)) {
          const k = self.tables.donations.reduce((acc, d) => acc + (d.unit === 'kg' ? (d.quantity || 0) : 0), 0);
          return { k };
        }

        if (/SELECT \* FROM users WHERE LOWER\(email\) = LOWER\(\?\)/i.test(cleanSql)) {
          const email = params[0]?.toLowerCase();
          return self.tables.users.find(u => u.email.toLowerCase() === email) || null;
        }

        if (/SELECT id, name, email/i.test(cleanSql) && /FROM users WHERE id = \?/i.test(cleanSql)) {
          const id = Number(params[0]);
          return self.tables.users.find(u => u.id === id) || null;
        }

        if (/SELECT \* FROM donations WHERE id = \?/i.test(cleanSql) || /SELECT d\.\*.*FROM donations d.*WHERE d\.id = \?/i.test(cleanSql)) {
          const id = Number(params[0]);
          const d = self.tables.donations.find(x => x.id === id);
          if (!d) return null;
          const c = self.tables.claims.find(x => x.donation_id === id && x.status !== 'cancelled');
          return c ? { ...d, claim_id: c.id, claimant_name: c.claimant_name, claimant_org: c.claimant_org, claimant_phone: c.claimant_phone, claimant_role: c.claimant_role, vehicle_type: c.vehicle_type, eta_minutes: c.eta_minutes, beneficiary_type: c.beneficiary_type, otp_code: c.otp_code, claim_status: c.status } : d;
        }

        if (/SELECT \* FROM claims WHERE id = \?/i.test(cleanSql)) {
          const id = Number(params[0]);
          return self.tables.claims.find(c => c.id === id) || null;
        }

        return null;
      },

      all(...params) {
        if (/SELECT \* FROM audit_logs/i.test(cleanSql)) {
          return [...self.tables.audit_logs].reverse().slice(0, 50);
        }

        if (/SELECT u\.id, u\.name.*FROM users u/i.test(cleanSql)) {
          return self.tables.users.map(u => ({
            ...u,
            donations_count: self.tables.donations.filter(d => d.donor_id === u.id).length,
            claims_count: self.tables.claims.filter(c => c.user_id === u.id).length
          }));
        }

        if (/GROUP BY status/i.test(cleanSql)) {
          const counts = {};
          self.tables.donations.forEach(d => counts[d.status] = (counts[d.status] || 0) + 1);
          return Object.entries(counts).map(([status, count]) => ({ status, count }));
        }

        if (/GROUP BY category/i.test(cleanSql)) {
          const counts = {};
          self.tables.donations.forEach(d => counts[d.category] = (counts[d.category] || 0) + 1);
          return Object.entries(counts).map(([category, count]) => ({ category, count }));
        }

        if (/FROM claims c\s+JOIN donations d/i.test(cleanSql)) {
          return self.tables.claims.map(c => {
            const d = self.tables.donations.find(x => x.id === c.donation_id) || {};
            return {
              ...c,
              donation_title: d.title,
              category: d.category,
              quantity: d.quantity,
              unit: d.unit,
              servings: d.servings,
              donor_name: d.donor_name,
              donor_phone: d.donor_phone,
              pickup_address: d.address,
              expiry_time: d.expiry_time,
              image_url: d.image_url,
              lat: d.lat,
              lng: d.lng
            };
          }).reverse();
        }

        // Donations query
        let list = self.tables.donations.map(d => {
          const c = self.tables.claims.find(x => x.donation_id === d.id && x.status !== 'cancelled');
          return c ? { ...d, claim_id: c.id, claimant_name: c.claimant_name, claimant_org: c.claimant_org, claimant_phone: c.claimant_phone, claimant_role: c.claimant_role, vehicle_type: c.vehicle_type, eta_minutes: c.eta_minutes, beneficiary_type: c.beneficiary_type, otp_code: c.otp_code, claim_status: c.status } : d;
        });

        // Search and filters
        let paramIdx = 0;
        if (/d\.category\s*=\s*\?/i.test(cleanSql)) {
          const cat = params[paramIdx++];
          list = list.filter(d => d.category === cat);
        }
        if (/d\.dietary_type\s*=\s*\?/i.test(cleanSql)) {
          const diet = params[paramIdx++];
          list = list.filter(d => d.dietary_type === diet);
        }
        if (/d\.status\s*=\s*\?/i.test(cleanSql)) {
          const st = params[paramIdx++];
          list = list.filter(d => d.status === st);
        }
        if (/LIKE \?/i.test(cleanSql)) {
          const term = (params[paramIdx] || '').replace(/%/g, '').toLowerCase();
          paramIdx += 4;
          if (term) {
            list = list.filter(d => 
              (d.title || '').toLowerCase().includes(term) ||
              (d.donor_name || '').toLowerCase().includes(term) ||
              (d.address || '').toLowerCase().includes(term) ||
              (d.allergens || '').toLowerCase().includes(term)
            );
          }
        }

        return list.reverse();
      }
    };
  }
}

// Select Database Engine
const DB_PATH = path.join(__dirname, 'foodloop.db');
let db;

if (DatabaseSync) {
  try {
    db = new DatabaseSync(DB_PATH);
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA foreign_keys = ON;');
    } catch (e) {}
    console.log('[*] Using native Node.js SQLite Database Engine (WAL mode)');
  } catch (err) {
    console.warn('[!] DatabaseSync failed, falling back to memory database:', err.message);
    db = new FallbackDatabase(DB_PATH);
  }
} else {
  console.log('[*] node:sqlite not present (Node < 22). Using Universal Fallback Database Engine.');
  db = new FallbackDatabase(DB_PATH);
}

// Initialize Tables
function initSchema() {
  if (DatabaseSync && db instanceof DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('donor', 'ngo', 'volunteer', 'admin')),
        organization TEXT,
        phone TEXT,
        address TEXT,
        city TEXT DEFAULT 'Bangalore',
        verified INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donor_id INTEGER,
        donor_name TEXT NOT NULL,
        donor_org TEXT,
        donor_phone TEXT NOT NULL,
        donor_type TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        dietary_type TEXT NOT NULL CHECK(dietary_type IN ('veg', 'non_veg', 'vegan', 'egg')),
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        servings INTEGER NOT NULL,
        cooked_time TEXT NOT NULL,
        expiry_time TEXT NOT NULL,
        storage_condition TEXT NOT NULL,
        allergens TEXT,
        packaging_type TEXT,
        address TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT 'Bangalore',
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        pickup_instructions TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'available' CHECK(status IN ('available', 'reserved', 'picked_up', 'completed', 'cancelled')),
        is_sample INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donation_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        claimant_name TEXT NOT NULL,
        claimant_org TEXT NOT NULL,
        claimant_phone TEXT NOT NULL,
        claimant_role TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        eta_minutes INTEGER NOT NULL,
        beneficiary_type TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        status TEXT DEFAULT 'reserved' CHECK(status IN ('reserved', 'picked_up', 'completed', 'cancelled')),
        notes TEXT,
        claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        picked_up_at TEXT,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT NOT NULL,
        user_email TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  seedInitialData();
}

function getFutureISO(hoursAhead) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + Math.round(hoursAhead * 60));
  return d.toISOString();
}

function getPastISO(hoursAgo) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - Math.round(hoursAgo * 60));
  return d.toISOString();
}

function seedInitialData() {
  const countUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (countUsers === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role, organization, phone, address, city, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'Prof. Rajesh Sharma (Mess Warden)',
      'donor@foodloop.org',
      'donor123',
      'donor',
      'Campus Central Hostel Mess',
      '+91 98765 43210',
      'Hostel Block B, National Institute of Technology Campus',
      'Bangalore',
      1
    );

    insertUser.run(
      'Sunita Rao (Director)',
      'ngo@roshni.org',
      'ngo123',
      'ngo',
      'Roshni Food Bank & Child Welfare Trust',
      '+91 91234 56780',
      '#42 Green Park Extension, Koramangala',
      'Bangalore',
      1
    );

    insertUser.run(
      'Arjun Patel (Student Lead)',
      'volunteer@campus.org',
      'volunteer123',
      'volunteer',
      'Youth Food Rescue Brigade',
      '+91 99887 76655',
      'Student Activity Center, NIT Campus',
      'Bangalore',
      1
    );

    insertUser.run(
      'System Admin (IP Project Lead)',
      'admin@foodloop.org',
      'admin123',
      'admin',
      'FoodLoop Project Governance Team',
      '+91 90000 11122',
      'Department of Computer Science & Engineering',
      'Bangalore',
      1
    );

    db.prepare('INSERT INTO audit_logs (event_type, details, user_email) VALUES (?, ?, ?)').run(
      'SYSTEM_INIT',
      'Initial seed users created for Donor, NGO, Volunteer, and Admin',
      'admin@foodloop.org'
    );
  }

  const countDonations = db.prepare('SELECT COUNT(*) as count FROM donations').get().count;
  if (countDonations === 0) {
    const insertDonation = db.prepare(`
      INSERT INTO donations (
        donor_id, donor_name, donor_org, donor_phone, donor_type,
        title, category, dietary_type, quantity, unit, servings,
        cooked_time, expiry_time, storage_condition, allergens, packaging_type,
        address, city, lat, lng, pickup_instructions, image_url, status, is_sample
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleList = [
      {
        donor_id: 1,
        donor_name: 'Campus Central Mess',
        donor_org: 'National Institute Campus Hostel',
        donor_phone: '+91 98765 43210',
        donor_type: 'hostel_mess',
        title: 'Fresh Veg Biryani with Cucumber Raita & Salan',
        category: 'rice_biryani',
        dietary_type: 'veg',
        quantity: 35,
        unit: 'kg',
        servings: 75,
        cooked_time: getPastISO(1.5),
        expiry_time: getFutureISO(2.5),
        storage_condition: 'hot_insulated',
        allergens: 'Contains Dairy (Curd in Raita)',
        packaging_type: 'Insulated Thermal Food Containers',
        address: 'Hostel Block B Gate, University Campus, Outer Ring Rd',
        city: 'Bangalore',
        lat: 12.9352,
        lng: 77.6245,
        pickup_instructions: 'Contact Mess Supervisor Mr. Kumar at Kitchen Gate 2. Please bring sturdy food grade vessels.',
        image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Royal Palace Grand Banquets',
        donor_org: 'Royal Grand Convention Centre',
        donor_phone: '+91 98450 12345',
        donor_type: 'wedding_hall',
        title: 'Wedding Reception Feast: Paneer Butter Masala, Dal Makhani & Jeera Rice',
        category: 'event_surplus',
        dietary_type: 'veg',
        quantity: 60,
        unit: 'kg',
        servings: 140,
        cooked_time: getPastISO(2.0),
        expiry_time: getFutureISO(4.0),
        storage_condition: 'hot_insulated',
        allergens: 'Contains Dairy (Butter, Paneer, Cream), Cashew nuts',
        packaging_type: 'Stainless Steel Degs & Foil Trays',
        address: 'Grand Palace Convention, Bellary Road, Sadashivanagar',
        city: 'Bangalore',
        lat: 13.0068,
        lng: 77.5813,
        pickup_instructions: 'Service entrance ramp behind Hall B. Loading van can park directly at bay.',
        image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Artisan Sourdough & Crust Bakery',
        donor_org: 'Crust & Crumb Artisan Bakes',
        donor_phone: '+91 97412 88990',
        donor_type: 'bakery',
        title: 'Assorted Fresh Bakery Items: Multigrain Bread, Croissants & Veg Puffs',
        category: 'bakery_desserts',
        dietary_type: 'veg',
        quantity: 45,
        unit: 'packets',
        servings: 60,
        cooked_time: getPastISO(3.0),
        expiry_time: getFutureISO(18.0),
        storage_condition: 'room_temp',
        allergens: 'Gluten (Wheat), traces of Sesame',
        packaging_type: 'Sealed Brown Kraft Paper Pouches',
        address: '100ft Road, Indiranagar Stage 2',
        city: 'Bangalore',
        lat: 12.9719,
        lng: 77.6412,
        pickup_instructions: 'Front bakery counter. Ring bell if closed. Ready for immediate pickup.',
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Taj Gateway Spice Restaurant',
        donor_org: 'Spice Garden Fine Dine',
        donor_phone: '+91 98860 33441',
        donor_type: 'restaurant',
        title: 'Chicken Dum Biryani & Mirchi Ka Salan (Buffet Surplus)',
        category: 'rice_biryani',
        dietary_type: 'non_veg',
        quantity: 25,
        unit: 'kg',
        servings: 50,
        cooked_time: getPastISO(1.0),
        expiry_time: getFutureISO(3.0),
        storage_condition: 'hot_insulated',
        allergens: 'Chicken, Mustard Oil, Peanuts in Salan',
        packaging_type: 'Insulated Chafing Trays',
        address: 'Residency Road, Ashok Nagar',
        city: 'Bangalore',
        lat: 12.9698,
        lng: 77.6033,
        pickup_instructions: 'Kitchen dispatch door on side alley. Clean food containers required.',
        image_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Udupi Sri Krishna Bhavan',
        donor_org: 'Sri Krishna Grand Tiffin',
        donor_phone: '+91 94480 77123',
        donor_type: 'restaurant',
        title: 'Steamed Idlis (80 pcs), Medu Vada & Coconut Chutney',
        category: 'breakfast_tiffin',
        dietary_type: 'veg',
        quantity: 80,
        unit: 'meals',
        servings: 40,
        cooked_time: getPastISO(2.0),
        expiry_time: getFutureISO(2.0),
        storage_condition: 'room_temp',
        allergens: 'Coconut, Mustard Seeds, Lentils',
        packaging_type: 'Hot Food Boxes',
        address: 'Gandhi Bazaar Main Road, Basavanagudi',
        city: 'Bangalore',
        lat: 12.9429,
        lng: 77.5746,
        pickup_instructions: 'Counter 3. Ask for cashier Mr. Manjunath. Ready packed.',
        image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Tech Mahindra Corporate Cafeteria',
        donor_org: 'Tech Park Campus Dining Block',
        donor_phone: '+91 96112 45450',
        donor_type: 'corporate_canteen',
        title: 'Hot Whole Wheat Phulkas (120 pcs) with Yellow Dal Tadka',
        category: 'roti_breads',
        dietary_type: 'veg',
        quantity: 120,
        unit: 'meals',
        servings: 45,
        cooked_time: getPastISO(1.2),
        expiry_time: getFutureISO(3.8),
        storage_condition: 'hot_insulated',
        allergens: 'Gluten (Wheat)',
        packaging_type: 'Thermal Casseroles (Deposit vessels)',
        address: 'Electronic City Phase 1, Hosur Road',
        city: 'Bangalore',
        lat: 12.8452,
        lng: 77.6602,
        pickup_instructions: 'Security gate 1 issue visitor pass for Cafeteria loading dock.',
        image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Green Orchard Organic Mart',
        donor_org: 'Green Orchard Direct Farmers Market',
        donor_phone: '+91 98220 99881',
        donor_type: 'restaurant',
        title: 'Fresh Surplus Produce: Crisp Apples, Bananas, Spinach & Carrots',
        category: 'fruits_veggies',
        dietary_type: 'vegan',
        quantity: 50,
        unit: 'kg',
        servings: 80,
        cooked_time: getPastISO(4.0),
        expiry_time: getFutureISO(28.0),
        storage_condition: 'room_temp',
        allergens: 'None (100% Raw Produce)',
        packaging_type: 'Reusable Crates (Empty crate exchange)',
        address: 'CMH Road, Metro Pillar 78, Indiranagar',
        city: 'Bangalore',
        lat: 12.9784,
        lng: 77.6389,
        pickup_instructions: 'Loading bay in the basement. Crates ready for handover.',
        image_url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Engineering College Canteen',
        donor_org: 'RVCE Campus Food Court',
        donor_phone: '+91 99001 22334',
        donor_type: 'hostel_canteen',
        title: 'South Indian Meal Trays: Rice, Sambar, Rasam, Beetroot Poriyal & Curd',
        category: 'hostel_canteen',
        dietary_type: 'veg',
        quantity: 55,
        unit: 'boxes',
        servings: 55,
        cooked_time: getPastISO(1.8),
        expiry_time: getFutureISO(3.2),
        storage_condition: 'hot_insulated',
        allergens: 'Contains Dairy (Curd), Mustard Seeds',
        packaging_type: 'Eco-friendly Bagasse Meal Trays with Lids',
        address: 'Mysore Road, RV Vidyaniketan Post',
        city: 'Bangalore',
        lat: 12.9237,
        lng: 77.4987,
        pickup_instructions: 'Canteen back porch next to Mechanical workshop block.',
        image_url: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Metro Mega Supermarket',
        donor_org: 'Metro Wholesale Cash & Carry',
        donor_phone: '+91 97330 66554',
        donor_type: 'corporate_canteen',
        title: 'Sealed Dry Grocery Packets: Atta, Basmati Rice, Toor Dal & Oats',
        category: 'dry_groceries',
        dietary_type: 'veg',
        quantity: 110,
        unit: 'kg',
        servings: 220,
        cooked_time: getPastISO(24.0),
        expiry_time: getFutureISO(72.0),
        storage_condition: 'room_temp',
        allergens: 'Gluten in Atta',
        packaging_type: 'Original Factory Sealed Poly Bags',
        address: 'Kanakapura Main Road, Yalachenahalli',
        city: 'Bangalore',
        lat: 12.8988,
        lng: 77.5681,
        pickup_instructions: 'Warehouse dispatch counter, Gate 4. Bill of donation copy attached.',
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Amul Dairy Distribution Center',
        donor_org: 'Nandini & Amul Cooperative Hub',
        donor_phone: '+91 98440 55221',
        donor_type: 'corporate_canteen',
        title: 'Pasteurized Milk Packets (50L) & Fresh Sweet Buttermilk (30L)',
        category: 'dairy_beverages',
        dietary_type: 'veg',
        quantity: 80,
        unit: 'litres',
        servings: 160,
        cooked_time: getPastISO(3.0),
        expiry_time: getFutureISO(5.0),
        storage_condition: 'refrigerated',
        allergens: 'Dairy (Milk, Lactose)',
        packaging_type: 'Cold Crates with Ice Packs',
        address: 'Dairy Circle, Bannerghatta Road, Adugodi',
        city: 'Bangalore',
        lat: 12.9388,
        lng: 77.5997,
        pickup_instructions: 'Cold storage unit 2. Transport vehicle should have cold insulation or ice bags.',
        image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Haldiram Snack Depot',
        donor_org: 'Haldiram Foods Pvt Ltd',
        donor_phone: '+91 99110 44332',
        donor_type: 'corporate_canteen',
        title: 'Pre-packaged Snacks: Baked Bhujia, Moong Dal & High-Protein Khakhra',
        category: 'packaged_snacks',
        dietary_type: 'veg',
        quantity: 120,
        unit: 'packets',
        servings: 120,
        cooked_time: getPastISO(12.0),
        expiry_time: getFutureISO(48.0),
        storage_condition: 'room_temp',
        allergens: 'Legumes, traces of nuts',
        packaging_type: 'Sealed Multi-layer Foil Bags',
        address: 'BTM Layout 2nd Stage, Ring Road',
        city: 'Bangalore',
        lat: 12.9165,
        lng: 77.6101,
        pickup_instructions: 'Pickup from loading bay. Best suited for distribution among street children.',
        image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      },
      {
        donor_id: 1,
        donor_name: 'Anjappar Chettinad Kitchen',
        donor_org: 'Anjappar Traditional Dining',
        donor_phone: '+91 98451 90909',
        donor_type: 'restaurant',
        title: 'Chettinad Egg Biryani Meal Packets (30 Boxes)',
        category: 'meal_boxes',
        dietary_type: 'egg',
        quantity: 30,
        unit: 'boxes',
        servings: 30,
        cooked_time: getPastISO(1.5),
        expiry_time: getFutureISO(2.2),
        storage_condition: 'hot_insulated',
        allergens: 'Eggs, Spices, Dairy',
        packaging_type: 'Sealed Biodegradable Meal Boxes with Spoons',
        address: 'Koramangala 5th Block, Jyoti Nivas College Road',
        city: 'Bangalore',
        lat: 12.9344,
        lng: 77.6152,
        pickup_instructions: 'Side parcel counter. Ready packed for immediate van or bike pickup.',
        image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
        status: 'available',
        is_sample: 1
      }
    ];

    for (const item of sampleList) {
      insertDonation.run(
        item.donor_id,
        item.donor_name,
        item.donor_org,
        item.donor_phone,
        item.donor_type,
        item.title,
        item.category,
        item.dietary_type,
        item.quantity,
        item.unit,
        item.servings,
        item.cooked_time,
        item.expiry_time,
        item.storage_condition,
        item.allergens,
        item.packaging_type,
        item.address,
        item.city,
        item.lat,
        item.lng,
        item.pickup_instructions,
        item.image_url,
        item.status,
        item.is_sample
      );
    }

    db.prepare('INSERT INTO audit_logs (event_type, details, user_email) VALUES (?, ?, ?)').run(
      'SAMPLE_DATA_SEEDED',
      `Loaded ${sampleList.length} initial food surplus listings across multiple categories`,
      'admin@foodloop.org'
    );
  }
}

function resetToDemo() {
  db.exec('DELETE FROM claims;');
  seedInitialData();
  return { success: true, message: 'Database reset to clean initial demo state' };
}

module.exports = {
  db,
  initSchema,
  resetToDemo
};
