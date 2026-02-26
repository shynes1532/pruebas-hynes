const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'concesionario.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initialize() {
  const conn = getDb();

  conn.exec(`
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

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
    CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  `);

  console.log('✅ Base de datos inicializada correctamente');
}

module.exports = { getDb, initialize };
