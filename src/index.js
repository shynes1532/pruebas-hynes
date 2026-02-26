require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./models/database');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'WhatsApp Concesionario Bot',
    version: '1.0.0'
  });
});

// Initialize database and start server
db.initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`🚗 Bot del concesionario corriendo en puerto ${PORT}`);
    console.log(`📊 Panel admin: http://localhost:${PORT}/admin`);
    console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
  });
}).catch(err => {
  console.error('Error al inicializar la base de datos:', err);
  process.exit(1);
});
