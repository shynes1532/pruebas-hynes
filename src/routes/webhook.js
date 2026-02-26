const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation');

// Verificación del webhook (Meta envía GET al configurar)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado correctamente');
    return res.status(200).send(challenge);
  }

  console.log('❌ Verificación de webhook fallida');
  return res.sendStatus(403);
});

// Recibir mensajes (Meta envía POST con cada mensaje)
router.post('/', async (req, res) => {
  // Siempre responder 200 rápido para que Meta no reintente
  res.sendStatus(200);

  try {
    const body = req.body;

    if (!body.object || body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        const messages = value.messages;
        const contacts = value.contacts || [];

        for (const message of messages) {
          const phone = message.from;
          const contact = contacts.find(c => c.wa_id === phone);
          const profileName = contact?.profile?.name || null;

          await conversationController.handleIncoming(phone, message, profileName);
        }
      }
    }
  } catch (err) {
    console.error('Error procesando webhook:', err);
  }
});

module.exports = router;
