const express = require('express');
const router = express.Router();
const { getDb } = require('../models/database');

// API para actualizar estado de cita
router.post('/appointments/:id/status', express.json(), (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['pendiente', 'confirmada', 'completada', 'cancelada'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// API para actualizar estado de lead
router.post('/leads/:id/status', express.json(), (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['nuevo', 'contactado', 'en_negociacion', 'vendido', 'descartado'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// API para agregar nota a un lead
router.post('/leads/:id/notes', express.json(), (req, res) => {
  const db = getDb();
  const { notes } = req.body;
  db.prepare('UPDATE leads SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(notes, req.params.id);
  res.json({ ok: true });
});

// API estadísticas para gráficos
router.get('/stats/messages-by-day', (req, res) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM conversations
    WHERE created_at >= date('now', '-30 days')
    GROUP BY day
    ORDER BY day
  `).all();
  res.json(data);
});

router.get('/stats/leads-by-day', (req, res) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM leads
    WHERE created_at >= date('now', '-30 days')
    GROUP BY day
    ORDER BY day
  `).all();
  res.json(data);
});

module.exports = router;
