const { getDb } = require('../models/database');
const wa = require('../services/whatsapp');
const claude = require('../services/claude');
const menuFlow = require('../flows/menu');
const catalogFlow = require('../flows/catalog');
const appointmentFlow = require('../flows/appointment');
const quoteFlow = require('../flows/quote');
const faqFlow = require('../flows/faq');

// Obtener o crear estado del usuario
function getUserState(phone) {
  const db = getDb();
  let state = db.prepare('SELECT * FROM user_states WHERE phone = ?').get(phone);
  if (!state) {
    db.prepare(
      'INSERT INTO user_states (phone, current_flow, flow_step, flow_data) VALUES (?, ?, ?, ?)'
    ).run(phone, 'main_menu', 'welcome', '{}');
    state = { phone, current_flow: 'main_menu', flow_step: 'welcome', flow_data: '{}' };
  }
  return { ...state, flow_data: JSON.parse(state.flow_data || '{}') };
}

function updateUserState(phone, flow, step, data) {
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO user_states (phone, current_flow, flow_step, flow_data, last_activity) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
  ).run(phone, flow, step, JSON.stringify(data || {}));
}

// Guardar mensaje en el historial
function logMessage(phone, direction, message, messageType, flowState) {
  const db = getDb();
  db.prepare(
    'INSERT INTO conversations (phone, direction, message, message_type, flow_state) VALUES (?, ?, ?, ?, ?)'
  ).run(phone, direction, message, messageType || 'text', flowState);
}

// Registrar o actualizar lead
function upsertLead(phone, name, vehicleInterest) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM leads WHERE phone = ?').get(phone);
  if (existing) {
    const updates = [];
    const params = [];
    if (name && !existing.name) { updates.push('name = ?'); params.push(name); }
    if (vehicleInterest) { updates.push('vehicle_interest = ?'); params.push(vehicleInterest); }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(phone);
      db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE phone = ?`).run(...params);
    }
  } else {
    db.prepare(
      'INSERT INTO leads (phone, name, vehicle_interest) VALUES (?, ?, ?)'
    ).run(phone, name, vehicleInterest);
  }
}

// Extraer texto del mensaje segun tipo
function extractText(message) {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'interactive':
      if (message.interactive?.type === 'button_reply') {
        return message.interactive.button_reply.id;
      }
      if (message.interactive?.type === 'list_reply') {
        return message.interactive.list_reply.id;
      }
      return '';
    default:
      return '';
  }
}

// Verificar si el mensaje es texto libre (no un boton/lista interactiva)
function isFreeText(message) {
  return message.type === 'text';
}

// Handler principal
async function handleIncoming(phone, message, profileName) {
  // Marcar como leido
  if (message.id) {
    wa.markAsRead(message.id);
  }

  const text = extractText(message);
  if (!text) return;

  const inputLower = text.toLowerCase().trim();

  // Registrar lead
  upsertLead(phone, profileName, null);

  // Guardar mensaje entrante
  const state = getUserState(phone);
  logMessage(phone, 'incoming', text, message.type, `${state.current_flow}:${state.flow_step}`);

  // Comandos globales que siempre funcionan
  if (['menu', 'menú', 'inicio'].includes(inputLower)) {
    updateUserState(phone, 'main_menu', 'welcome', {});
    await menuFlow.showMainMenu(phone, profileName);
    return;
  }

  if (['0', 'volver', 'atras', 'atrás', 'back'].includes(inputLower)) {
    updateUserState(phone, 'main_menu', 'show', {});
    await menuFlow.showMainMenu(phone);
    return;
  }

  // Si es texto libre y el usuario esta en el menu principal o bienvenida,
  // intentar responder con Claude AI
  const isText = isFreeText(message);
  const flow = state.current_flow;

  if (isText && (flow === 'main_menu' || state.flow_step === 'welcome')) {
    // Saludos -> mostrar menu
    if (['hola', 'hi', 'hello', 'buenas', 'buen dia', 'buenos dias', 'que tal', 'buenas tardes', 'buenas noches'].includes(inputLower)) {
      updateUserState(phone, 'main_menu', 'welcome', {});
      await menuFlow.showMainMenu(phone, profileName);
      return;
    }

    // Intentar responder con Claude
    const aiResponse = await tryClaudeResponse(phone, text);
    if (aiResponse) {
      logMessage(phone, 'outgoing', aiResponse, 'text', 'claude_ai');
      await wa.sendText(phone, aiResponse);
      // Ofrecer menu despues de la respuesta de IA
      await wa.sendButtons(
        phone,
        'Tambien podes usar nuestro menu interactivo:',
        [
          { id: 'menu_catalog', title: 'Ver Catalogo' },
          { id: 'menu_quote', title: 'Cotizar' },
          { id: 'menu_appointment', title: 'Agendar Cita' }
        ]
      );
      return;
    }

    // Si no hay IA, mostrar menu
    await menuFlow.showMainMenu(phone, profileName);
    return;
  }

  // Router de flujos estructurados (botones, listas, pasos de flujo)
  const context = { phone, text, inputLower, state, profileName, updateUserState, logMessage, upsertLead };

  try {
    switch (flow) {
      case 'main_menu':
        await menuFlow.handle(context);
        break;
      case 'catalog':
        await catalogFlow.handle(context);
        break;
      case 'appointment':
        await appointmentFlow.handle(context);
        break;
      case 'quote':
        await quoteFlow.handle(context);
        break;
      case 'faq':
        await faqFlow.handle(context);
        break;
      default:
        // Ultimo recurso: intentar IA o mostrar menu
        if (isText) {
          const aiResponse = await tryClaudeResponse(phone, text);
          if (aiResponse) {
            logMessage(phone, 'outgoing', aiResponse, 'text', 'claude_ai');
            await wa.sendText(phone, aiResponse);
            return;
          }
        }
        await menuFlow.showMainMenu(phone, profileName);
        break;
    }
  } catch (err) {
    console.error(`❌ Error en flujo ${flow}/${state.flow_step}:`, err);
    // Resetear al menú principal para que el usuario no quede trabado
    updateUserState(phone, 'main_menu', 'show', {});
    await wa.sendText(phone, '⚠️ Ocurrió un error. Vamos a reiniciar.\n\nEscribí *menu* para volver al menú principal.');
  }
}

// Intentar obtener respuesta de Claude
async function tryClaudeResponse(phone, userMessage) {
  try {
    const history = claude.getRecentHistory(phone, 10);
    const response = await claude.getResponse(userMessage, history);
    return response;
  } catch (err) {
    console.error('Error en Claude AI:', err.message);
    return null;
  }
}

module.exports = { handleIncoming };
