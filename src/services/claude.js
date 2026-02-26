const axios = require('axios');
const { getDb } = require('../models/database');

const API_URL = 'https://api.anthropic.com/v1/messages';

function getVehicleCatalog() {
  const db = getDb();
  const vehicles = db.prepare('SELECT * FROM vehicles WHERE available = 1 ORDER BY model, price').all();
  return vehicles.map(v =>
    `- FIAT ${v.model} ${v.version}: $${v.price.toLocaleString('es-AR')} | ${v.engine} ${v.horsepower}HP | ${v.fuel} | ${v.transmission} | Categoria: ${v.category}`
  ).join('\n');
}

function buildSystemPrompt() {
  const catalog = getVehicleCatalog();
  const dealer = {
    name: process.env.DEALER_NAME || 'Liendo Automotores',
    phone: process.env.DEALER_PHONE || '',
    address: process.env.DEALER_ADDRESS || '',
    hours: process.env.DEALER_HOURS || ''
  };

  return `Sos un asesor comercial virtual de ${dealer.name}, concesionario oficial FIAT en ${dealer.address}.

Tu objetivo es ayudar a los clientes a encontrar el vehiculo ideal, responder consultas y guiarlos hacia una compra o visita al salon.

DATOS DEL CONCESIONARIO:
- Nombre: ${dealer.name}
- Direccion: ${dealer.address}
- Telefono: ${dealer.phone}
- Horarios: ${dealer.hours}

CATALOGO ACTUAL DE VEHICULOS 0KM (precios en pesos argentinos - Febrero 2026):
${catalog}

REGLAS IMPORTANTES:
1. Responde siempre en español argentino informal (vos, tenes, queres, etc.)
2. Se conciso: maximo 3-4 oraciones por respuesta (WhatsApp no es para textos largos)
3. Siempre menciona precios reales del catalogo, nunca inventes precios
4. Si el cliente pregunta por algo que no esta en el catalogo, decile que no lo tenemos disponible
5. Cuando el cliente muestre interes en un modelo, sugerile agendar una visita o test drive escribiendo "menu"
6. Nunca menciones que sos una IA o un bot. Sos un asesor del concesionario
7. Si te preguntan por financiamiento, decile que puede cotizar desde el menu escribiendo "menu" > Cotizar
8. No uses markdown ni formato especial, solo texto plano con emojis moderados
9. Si no sabes algo especifico (ej: stock exacto, colores disponibles en este momento), decile que un asesor lo va a contactar para confirmar`;
}

async function getResponse(userMessage, conversationHistory) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return null; // Si no hay API key, no usar IA
  }

  try {
    // Construir mensajes con historial reciente (max 10 mensajes)
    const messages = conversationHistory.slice(-10).map(m => ({
      role: m.direction === 'incoming' ? 'user' : 'assistant',
      content: m.message
    }));

    // Agregar el mensaje actual
    messages.push({ role: 'user', content: userMessage });

    const response = await axios.post(API_URL, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: buildSystemPrompt(),
      messages
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 15000
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

// Obtener historial reciente de conversacion
function getRecentHistory(phone, limit) {
  const db = getDb();
  return db.prepare(
    'SELECT direction, message FROM conversations WHERE phone = ? ORDER BY created_at DESC LIMIT ?'
  ).all(phone, limit || 10).reverse();
}

module.exports = { getResponse, getRecentHistory };
