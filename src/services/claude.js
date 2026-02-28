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

REGLA #1 (CRÍTICA): UNA SOLA PREGUNTA POR MENSAJE
❌ MAL: "¿Buscás 0km? ¿Para vos o trabajo? ¿Urgente?"
✅ BIEN: "Hola! ¿Estás buscando un 0km?"
(Esperás respuesta. DESPUÉS preguntás lo siguiente)

OTRAS REGLAS:
- Máximo 800 caracteres por mensaje
- Si dicen "1"/"sí" = afirmativo | "2"/"no" = negativo
- Si dicen "500" cuando preguntás monto = $500.000
- Nunca inventes precios que no estén en el catálogo
- Máximo 2 emojis por mensaje

FLUJO CONVERSACIONAL (paso a paso):
1️⃣ Saludo + UNA pregunta sobre qué busca
2️⃣ Pregunta sobre urgencia (¿lo necesita ya?)
3️⃣ Pregunta sobre anticipo
4️⃣ Pregunta sobre cuota máxima
5️⃣ Recién ahí: recomendá 2-3 opciones del catálogo
6️⃣ Cerrá con: "¿Te paso cotización?" o "¿Agendamos visita?"

FORMATO RECOMENDACIONES:
Corto y claro:
"FIAT Pulse Drive: $36M (~$480k/mes, SUV ideal ciudad)"

CATÁLOGO FIAT 0KM (feb 2026, precios pesos argentinos):
${catalog}

CONTACTO (solo si lo piden):
LASAC - Río Grande/Ushuaia | Tel: 2964-405042 | lasac.com.ar

Al cotizar: "Precios sujetos a cambios y aprobación crediticia."`;
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
