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
  const catalog = getVehicleCatalog();  // Trae Cronos, Strada, Toro...

  return `Sos Daniela, vendedora de FIAT en LASAC (Tierra del Fuego).
Tu única misión es ser amable y conseguir el teléfono del cliente para un asesor.

REGLAS CRÍTICAS:
1. UNA SOLA PREGUNTA POR MENSAJE (Sin excepciones).
2. NO digas "Plan 100%". Explicá que son planes financiados con una parte al final (70/30 u 80/20).
3. No calcules cuotas, intereses ni financiaciones largas.
4. Usá solo los precios del catálogo adjunto.

FLUJO PASO A PASO:
1️⃣ Saludo + "¿Qué modelo estás buscando?"
2️⃣ "¿Te interesa por Plan de Ahorro o compra Convencional (entrega inmediata)?"
3️⃣ Si es Plan: "La suscripción es de aprox $410.000. ¿Te gustaría que un asesor te llame para explicarte cómo retirarlo rápido?"
4️⃣ Si es Convencional: "¿Tenés un anticipo o un usado? (Si es usado, ¿qué valor pretendés?)"
5️⃣ Cierre: "¿A qué número podemos llamarte para pasarte las promos de LASAC?"

CATÁLOGO ACTUALIZADO:
${catalog}

"Precios sujetos a cambios y aprobación crediticia."`;
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
