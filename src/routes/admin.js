const express = require('express');
const router = express.Router();
const { getDb } = require('../models/database');

// Autenticación básica del panel admin
function authMiddleware(req, res, next) {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASSWORD || 'admin123';

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Panel de Administración"');
    return res.status(401).send('Acceso no autorizado');
  }

  const decoded = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [inputUser, inputPass] = decoded.split(':');

  if (inputUser === user && inputPass === pass) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Panel de Administración"');
  return res.status(401).send('Credenciales incorrectas');
}

router.use(authMiddleware);

// Dashboard principal
router.get('/', (req, res) => {
  const db = getDb();

  const stats = {
    totalLeads: db.prepare('SELECT COUNT(*) as c FROM leads').get().c,
    newLeads: db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'nuevo'").get().c,
    totalAppointments: db.prepare('SELECT COUNT(*) as c FROM appointments').get().c,
    pendingAppointments: db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'pendiente'").get().c,
    totalQuotes: db.prepare('SELECT COUNT(*) as c FROM quotes').get().c,
    totalConversations: db.prepare('SELECT COUNT(DISTINCT phone) as c FROM conversations').get().c,
    todayMessages: db.prepare("SELECT COUNT(*) as c FROM conversations WHERE date(created_at) = date('now')").get().c,
    totalVehicles: db.prepare('SELECT COUNT(*) as c FROM vehicles WHERE available = 1').get().c
  };

  // Top vehículos más consultados
  const topVehicles = db.prepare(`
    SELECT vehicle_interest, COUNT(*) as count
    FROM leads
    WHERE vehicle_interest IS NOT NULL
    GROUP BY vehicle_interest
    ORDER BY count DESC
    LIMIT 5
  `).all();

  // Leads recientes
  const recentLeads = db.prepare(
    'SELECT * FROM leads ORDER BY created_at DESC LIMIT 10'
  ).all();

  // Citas próximas
  const upcomingAppointments = db.prepare(
    "SELECT * FROM appointments WHERE status = 'pendiente' ORDER BY date ASC, time_slot ASC LIMIT 10"
  ).all();

  res.render('dashboard', { stats, topVehicles, recentLeads, upcomingAppointments });
});

// Página de leads
router.get('/leads', (req, res) => {
  const db = getDb();
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.render('leads', { leads });
});

// Página de conversaciones
router.get('/conversations', (req, res) => {
  const db = getDb();
  const phones = db.prepare(
    'SELECT phone, MAX(created_at) as last_msg, COUNT(*) as msg_count FROM conversations GROUP BY phone ORDER BY last_msg DESC'
  ).all();
  res.render('conversations', { phones });
});

// Detalle de conversación
router.get('/conversations/:phone', (req, res) => {
  const db = getDb();
  const phone = req.params.phone;
  const messages = db.prepare(
    'SELECT * FROM conversations WHERE phone = ? ORDER BY created_at ASC'
  ).all(phone);
  const lead = db.prepare('SELECT * FROM leads WHERE phone = ?').get(phone);
  res.render('conversation-detail', { phone, messages, lead });
});

// Página de citas
router.get('/appointments', (req, res) => {
  const db = getDb();
  const appointments = db.prepare('SELECT * FROM appointments ORDER BY date DESC, time_slot ASC').all();
  res.render('appointments', { appointments });
});

// Página de cotizaciones
router.get('/quotes', (req, res) => {
  const db = getDb();
  const quotes = db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all();
  res.render('quotes', { quotes });
});

// Página de vehículos
router.get('/vehicles', (req, res) => {
  const db = getDb();
  const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY brand, model').all();
  res.render('vehicles', { vehicles });
});

module.exports = router;
