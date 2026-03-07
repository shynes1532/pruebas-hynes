const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'concesionario.db');
let rawDb = null;
let inTransaction = false;

// Persist database to disk
function saveToFile() {
  if (!rawDb || inTransaction) return;
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

// Wrapper that mimics better-sqlite3 Statement API
class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
  }

  run(...params) {
    this._db.run(this._sql, params);
    saveToFile();
    return { changes: this._db.getRowsModified() };
  }

  get(...params) {
    const stmt = this._db.prepare(this._sql);
    if (params.length > 0) stmt.bind(params);
    let result;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  }

  all(...params) {
    const results = [];
    const stmt = this._db.prepare(this._sql);
    if (params.length > 0) stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

// Wrapper that mimics better-sqlite3 Database API
const dbWrapper = {
  prepare(sql) {
    return new Statement(rawDb, sql);
  },

  exec(sql) {
    rawDb.exec(sql);
    saveToFile();
  },

  pragma(str) {
    if (str.includes('foreign_keys')) {
      try { rawDb.run('PRAGMA foreign_keys = ON'); } catch (e) { /* ignore */ }
    }
  },

  transaction(fn) {
    return function (...args) {
      inTransaction = true;
      rawDb.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        rawDb.exec('COMMIT');
        inTransaction = false;
        saveToFile();
        return result;
      } catch (e) {
        try { rawDb.exec('ROLLBACK'); } catch (_) { /* ignore */ }
        inTransaction = false;
        throw e;
      }
    };
  }
};

function getDb() {
  if (!rawDb) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return dbWrapper;
}

async function initialize() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    rawDb = new SQL.Database(buffer);
  } else {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    rawDb = new SQL.Database();
  }

  rawDb.run('PRAGMA foreign_keys = ON');

  rawDb.exec(`
    -- Vehículos del catálogo
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      version TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      category TEXT DEFAULT 'sedan',
      fuel TEXT DEFAULT 'nafta',
      transmission TEXT DEFAULT 'manual',
      engine TEXT,
      horsepower INTEGER,
      color_options TEXT,
      features TEXT,
      image_url TEXT,
      available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Leads / Contactos
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      name TEXT,
      email TEXT,
      source TEXT DEFAULT 'whatsapp',
      vehicle_interest TEXT,
      status TEXT DEFAULT 'nuevo',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Conversaciones
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      direction TEXT NOT NULL,
      message TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      flow_state TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Estado de la conversación por usuario
    CREATE TABLE IF NOT EXISTS user_states (
      phone TEXT PRIMARY KEY,
      current_flow TEXT DEFAULT 'main_menu',
      flow_step TEXT DEFAULT 'welcome',
      flow_data TEXT DEFAULT '{}',
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Citas / Turnos
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      name TEXT NOT NULL,
      appointment_type TEXT NOT NULL,
      vehicle_id INTEGER,
      vehicle_info TEXT,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT DEFAULT 'pendiente',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    -- Cotizaciones
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      name TEXT,
      vehicle_id INTEGER,
      vehicle_info TEXT,
      vehicle_price REAL,
      down_payment REAL,
      financing_months INTEGER,
      monthly_payment REAL,
      interest_rate REAL,
      total_financing REAL,
      status TEXT DEFAULT 'generada',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    -- Solicitudes de Plan de Ahorro
    CREATE TABLE IF NOT EXISTS savings_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      name TEXT,
      contact_phone TEXT,
      plan_id TEXT,
      plan_name TEXT,
      request_type TEXT DEFAULT 'suscripcion',
      status TEXT DEFAULT 'pendiente',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Solicitudes de Crédito Automotor
    CREATE TABLE IF NOT EXISTS credit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      name TEXT,
      dni TEXT,
      email TEXT,
      contact_phone TEXT,
      employment_type TEXT,
      monthly_income REAL,
      seniority TEXT,
      vehicle_model TEXT,
      down_payment TEXT,
      credit_term INTEGER,
      status TEXT DEFAULT 'pendiente',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
    CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_savings_requests_phone ON savings_requests(phone);
    CREATE INDEX IF NOT EXISTS idx_savings_requests_status ON savings_requests(status);
    CREATE INDEX IF NOT EXISTS idx_credit_requests_phone ON credit_requests(phone);
    CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON credit_requests(status);
  `);

  saveToFile();

  // Auto-seed: si no hay vehículos, cargar catálogo automáticamente
  const count = new Statement(rawDb, 'SELECT COUNT(*) as total FROM vehicles').get();
  if (!count || count.total === 0) {
    console.log('📦 Tabla de vehículos vacía, ejecutando seed automático...');
    await autoSeed();
  }

  console.log('✅ Base de datos inicializada correctamente');
}

async function autoSeed() {
  const seedPath = path.join(__dirname, '..', 'seed.js');
  if (!fs.existsSync(seedPath)) {
    console.log('⚠️ No se encontró seed.js, saltando auto-seed');
    return;
  }
  // Ejecutar la lógica de seed directamente
  const vehicles = require('../data/vehicles.json');
  const insert = dbWrapper.prepare(
    'INSERT INTO vehicles (brand, model, year, version, price, currency, category, fuel, transmission, engine, horsepower, color_options, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertMany = dbWrapper.transaction((items) => {
    for (const v of items) {
      insert.run(v.brand, v.model, v.year, v.version, v.price, v.currency, v.category, v.fuel, v.transmission, v.engine, v.horsepower, v.color_options, v.features);
    }
  });
  insertMany(vehicles);
  console.log(`📦 ${vehicles.length} vehículos cargados automáticamente`);
}

module.exports = { getDb, initialize };
