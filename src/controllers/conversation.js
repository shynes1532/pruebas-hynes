const { getDb } = require('../models/database');
const wa = require('../services/whatsapp');
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

// Extraer texto del mensaje según tipo
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

// Handler principal
async function handleIncoming(phone, message, profileName) {
  // Marcar como leído
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
  if (['menu', 'menú', 'inicio', 'hola', 'hi', 'hello', 'buenas', 'buen dia', 'buenos dias'].includes(inputLower)) {
    updateUserState(phone, 'main_menu', 'welcome', {});
    await menuFlow.showMainMenu(phone, profileName);
    return;
  }

  if (['0', 'volver', 'atras', 'atrás', 'back'].includes(inputLower)) {
    updateUserState(phone, 'main_menu', 'show', {});
    await menuFlow.showMainMenu(phone);
    return;
  }

  // Router de flujos
  const flow = state.current_flow;
  const context = { phone, text, inputLower, state, profileName, updateUserState, logMessage, upsertLead };

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
      await menuFlow.showMainMenu(phone, profileName);
      break;
  }
}

module.exports = { handleIncoming };
