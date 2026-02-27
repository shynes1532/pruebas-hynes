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

  console.log('❌ Verificación de webhook fallida', { mode, token, expected: process.env.WEBHOOK_VERIFY_TOKEN, match: token === process.env.WEBHOOK_VERIFY_TOKEN });
  return res.sendStatus(403);
});

// Recibir mensajes (Meta envía POST con cada mensaje)
router.post('/', async (req, res) => {
  // Siempre responder 200 rápido para que Meta no reintente
  res.sendStatus(200);

  try {
    const body = req.body;

    console.log('📩 Webhook POST recibido:', JSON.stringify(body).substring(0, 300));

    if (!body.object || body.object !== 'whatsapp_business_account') {
      console.log('⚠️ Objeto no es whatsapp_business_account:', body.object);
      return;
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;

        // Ignorar notificaciones de status (enviado, leido, etc.)
        if (value?.statuses) continue;

        if (!value || !value.messages) {
          console.log('ℹ️ Webhook sin mensajes (posible status update)');
          continue;
        }

        const messages = value.messages;
        const contacts = value.contacts || [];

        for (const message of messages) {
          const phone = message.from;
          const contact = contacts.find(c => c.wa_id === phone);
          const profileName = contact?.profile?.name || null;

          console.log(`📱 Mensaje de ${phone} (${profileName}): tipo=${message.type}, texto="${message.text?.body || message.interactive?.button_reply?.title || '(no text)'}"`);

          await conversationController.handleIncoming(phone, message, profileName);

          console.log(`✅ Mensaje procesado para ${phone}`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error procesando webhook:', err);
  }
});

module.exports = router;
