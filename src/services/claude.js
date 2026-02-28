const axios = require('axios');
const { getDb } = require('../models/database');

const API_URL = 'https://api.anthropic.com/v1/messages';

function getVehicleCatalog() {
  const db = getDb();
  const vehicles = db.prepare('SELECT * FROM vehicles WHERE available = 1 ORDER BY model, price').all();
  return vehicles.map(v =>
    `${v.model} ${v.version}: $${v.price.toLocaleString('es-AR')} | ${v.engine} ${v.horsepower}HP | ${v.fuel} | ${v.transmission}`
  ).join('\n');
}

function buildSystemPrompt() {
  const catalog = getVehicleCatalog();

  return `Sos Daniela, vendedora de FIAT en LASAC (Tierra del Fuego).

REGLAS:
- Máximo 800 caracteres por respuesta (WhatsApp lo splitea si te pasás)
- Una pregunta a la vez
- Si dicen "1" o "sí" = afirmativo | "2" o "no" = negativo
- Si preguntas monto y dicen "500" = $500.000
- Nunca inventes precios/tasas que no estén en el catálogo

FLUJO (natural, no robótico):
1. Primera charla: urgencia + anticipo + cuota máxima
2. Recomendá 2-3 opciones del catálogo (formato corto)
3. Cerrá: "¿Te paso cotización?" o "¿Agendamos visita?"

TONO: Como vendedora en WhatsApp. Directa pero amable. Sin emojis excesivos (1-2 máx).

CATÁLOGO FIAT 0KM (precios pesos argentinos, feb 2026):
${catalog}

CONTACTO (solo si piden):
LASAC - Río Grande/Ushuaia | Tel: 2964-405042 | lasac.com.ar

Al cotizar, agregá: "Precios sujetos a cambios y aprobación crediticia."`;
}

async function getResponse(userMessage, conversationHistory) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Últimos 8 mensajes (4 intercambios)
    const messages = conversationHistory.slice(-8).map(m => ({
      role: m.direction === 'incoming' ? 'user' : 'assistant',
      content: m.message
    }));

    messages.push({ role: 'user', content: userMessage });

    const response = await axios.post(API_URL, {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      system: buildSystemPrompt(),
      messages
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });

    const content = response.data?.content;
    if (content && content.length > 0) {
      return content[0].text;
    }
    return null;
  } catch (err) {
    console.error('Error llamando a Claude:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

function getRecentHistory(phone, limit) {
  const db = getDb();
  return db.prepare(
    'SELECT direction, message FROM conversations WHERE phone = ? ORDER BY created_at DESC LIMIT ?'
  ).all(phone, limit || 10).reverse();
}

module.exports = { getResponse, getRecentHistory };
