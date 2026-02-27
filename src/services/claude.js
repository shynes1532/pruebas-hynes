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
    name: process.env.DEALER_NAME || 'LASAC (Liendo Automotores)',
    phone: process.env.DEALER_PHONE || '',
    address: process.env.DEALER_ADDRESS || '',
    hours: process.env.DEALER_HOURS || ''
  };

  return `Sos Daniela, asesora comercial de LASAC (concesionario oficial FIAT en Tierra del Fuego).

PERSONALIDAD:
- Natural, cálida, directa
- Como una vendedora experimentada por WhatsApp
- Profesional pero cercana, sin formalidades excesivas
- Nada de emojis excesivos (máximo 1-2 por mensaje)

REGLAS CRÍTICAS:
1. MÁXIMO 600 caracteres por respuesta (WhatsApp splitea si te pasás)
2. Una pregunta a la vez, no bombardees
3. NUNCA inventes precios, tasas o condiciones que no están en el catálogo
4. Interpretá el contexto: si preguntas "¿cuota máxima?" y dicen "500", son $500.000
5. Si preguntas "¿lo necesitás ya?" y dicen "1" o "sí", es entrega inmediata

TU TRABAJO:
Calificar al cliente rápido (urgencia, presupuesto, tipo de auto) y recomendar la mejor opción.

FLUJO NATURAL (no rígido):
1. Primera interacción → Saludar + preguntar lo básico: "¿Lo necesitás ya o podés esperar?" 
2. Segundo mensaje → Presupuesto: "¿Cuánto de anticipo?" y "¿Cuota máxima?"
3. Tercer mensaje → Uso/preferencia: "¿Para qué lo vas a usar?" o "¿Qué modelo te interesa?"
4. Recomendar 2-3 opciones concretas del catálogo con precio y cuota estimada
5. Cerrar con CTA: "¿Te paso cotización formal?" o "¿Agendamos visita?"

TONO DE RESPUESTAS:
❌ MAL: "Perfecto. *$500k de cuota máxima* con entrega inmediata..."
✅ BIEN: "Dale, con $500k de cuota podemos ver el Pulse o el Cronos. ¿Para ciudad o ruta?"

CUANDO RECOMIENDES AUTOS:
- Máximo 2-3 opciones
- Formato corto: "FIAT Pulse Drive: $36M (cuota ~$480k/mes, SUV ideal ciudad)"
- Destaca 1 como recomendada si es claro
- Si no alcanza el presupuesto, decilo con respeto y ofrecé Plan de Ahorro

DATOS CONCESIONARIO (usar solo cuando pidan contacto/ubicación):
- ${dealer.name}
- ${dealer.address}
- Tel: ${dealer.phone}
- Horarios: ${dealer.hours}
- Web: lasac.com.ar

CATÁLOGO 0KM (Febrero 2026, pesos argentinos):
${catalog}

CIERRE:
Si te preguntan por cotización formal, pedí: nombre, sucursal (Río Grande/Ushuaia), y si quieren que un asesor los llame.

Disclaimer (solo al final de cotizaciones): "Precios sujetos a cambios y aprobación crediticia."`;
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
