const axios = require('axios');

const GRAPH_API = 'https://graph.facebook.com/v21.0';

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

function getUrl() {
  return `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

// Enviar mensaje de texto simple
async function sendText(to, text) {
  try {
    console.log(`📤 Enviando texto a ${to}: "${text.substring(0, 80)}..."`);
    const resp = await axios.post(getUrl(), {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    }, { headers: getHeaders() });
    console.log(`✅ Texto enviado a ${to}, message_id: ${resp.data?.messages?.[0]?.id || 'N/A'}`);
  } catch (err) {
    console.error('❌ Error enviando texto:', JSON.stringify(err.response?.data || err.message));
  }
}

// Enviar mensaje con botones interactivos (máx 3 botones)
async function sendButtons(to, bodyText, buttons, headerText) {
  const interactive = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.map((btn, i) => ({
        type: 'reply',
        reply: { id: btn.id || `btn_${i}`, title: btn.title.substring(0, 20) }
      }))
    }
  };
  if (headerText) {
    interactive.header = { type: 'text', text: headerText };
  }

  try {
    console.log(`📤 Enviando botones a ${to}: "${bodyText.substring(0, 60)}..."`);
    const resp = await axios.post(getUrl(), {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive
    }, { headers: getHeaders() });
    console.log(`✅ Botones enviados a ${to}`);
  } catch (err) {
    console.error('❌ Error enviando botones:', JSON.stringify(err.response?.data || err.message));
  }
}

// Enviar lista interactiva (máx 10 items por sección)
async function sendList(to, bodyText, buttonLabel, sections, headerText) {
  const interactive = {
    type: 'list',
    body: { text: bodyText },
    action: {
      button: buttonLabel.substring(0, 20),
      sections: sections.map(section => ({
        title: section.title,
        rows: section.rows.map(row => ({
          id: row.id,
          title: row.title.substring(0, 24),
          description: row.description ? row.description.substring(0, 72) : undefined
        }))
      }))
    }
  };
  if (headerText) {
    interactive.header = { type: 'text', text: headerText };
  }

  try {
    await axios.post(getUrl(), {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive
    }, { headers: getHeaders() });
  } catch (err) {
    console.error('Error enviando lista:', err.response?.data || err.message);
  }
}

// Enviar imagen con caption
async function sendImage(to, imageUrl, caption) {
  try {
    await axios.post(getUrl(), {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, caption }
    }, { headers: getHeaders() });
  } catch (err) {
    console.error('Error enviando imagen:', err.response?.data || err.message);
  }
}

// Marcar mensaje como leído
async function markAsRead(messageId) {
  try {
    await axios.post(getUrl(), {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    }, { headers: getHeaders() });
  } catch (err) {
    // No es crítico si falla
  }
}

module.exports = { sendText, sendButtons, sendList, sendImage, markAsRead };
