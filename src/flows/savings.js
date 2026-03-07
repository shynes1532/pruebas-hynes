const wa = require('../services/whatsapp');
const { getDb } = require('../models/database');
const { getAllVehicles, getModelGroups } = require('./catalog');

// Planes de ahorro FIAT - datos sobrepauta Abril 2026
const SAVINGS_PLANS = [
  {
    id: 'plan_mobi',
    model: 'Mobi',
    version: 'Trekking 1.0',
    movil: '$26.541.725',
    cuota_sin_iva: '$123.803',
    cuota_total: '$168.897',
    sellado_tdf: '$5.308',
    suscripcion: '$410.000',
    plazo: '84 cuotas',
    grupo: 'Grupo 84'
  },
  {
    id: 'plan_cronos',
    model: 'Cronos',
    version: 'Stile 1.3 GSE MY23',
    movil: '$26.100.680',
    cuota_sin_iva: '$121.747',
    cuota_total: '$166.093',
    sellado_tdf: '$5.220',
    suscripcion: '$410.000',
    plazo: '84 cuotas',
    grupo: 'Grupo 84'
  },
  {
    id: 'plan_argo',
    model: 'Argo',
    version: 'Drive 1.3L MT',
    movil: '$29.055.824',
    cuota_sin_iva: '$135.527',
    cuota_total: '$184.899',
    sellado_tdf: '$5.811',
    suscripcion: '$450.000',
    plazo: '84 cuotas',
    grupo: 'Grupo 84'
  },
  {
    id: 'plan_cronos_like',
    model: 'Cronos',
    version: 'Like 1.3 GSE',
    movil: '$30.178.786',
    cuota_sin_iva: '$140.765',
    cuota_total: '$192.044',
    sellado_tdf: '$6.036',
    suscripcion: '$460.000',
    plazo: '84 cuotas',
    grupo: 'Grupo 84'
  },
  {
    id: 'plan_pulse',
    model: 'Pulse',
    version: 'Drive 1.3L MT',
    movil: '$35.488.523',
    cuota_sin_iva: '$165.528',
    cuota_total: '$225.831',
    sellado_tdf: '$7.098',
    suscripcion: '$530.000',
    plazo: '84 cuotas',
    grupo: 'Grupo 84'
  },
  {
    id: 'plan_strada',
    model: 'Strada',
    version: 'Freedom C/S 1.3 MT',
    movil: '$35.039.391',
    cuota_sin_iva: '$163.432',
    cuota_total: '$223.032',
    sellado_tdf: '$7.008',
    suscripcion: '$520.000',
    plazo: '84 cuotas',
    grupo: 'Grupo 84'
  }
];

// Documentación requerida para plan de ahorro
const DOCS_SUSCRIPCION = `📋 *Documentación requerida:*
• DNI (frente y dorso)
• Constancia de CUIL/CUIT
• Último recibo de sueldo o monotributo
• Servicio a tu nombre (luz, gas, etc.)
• CBU para débito automático`;

const DOCS_ADJUDICADO = `📋 *Documentación para retiro:*
• DNI titular
• Constancia de CUIL/CUIT
• Comprobante de domicilio
• Libre deuda del plan
• Formulario 08 (se gestiona en el concesionario)`;

// Paso 1: Mostrar opciones principales del Plan Ahorro
async function showSavingsOptions(phone) {
  await wa.sendButtons(
    phone,
    '🏦 *Plan de Ahorro FIAT*\n\nEl Plan de Ahorro te permite acceder a tu 0km en cuotas accesibles, con posibilidad de licitación para retirarlo antes.\n\n¿Cuál es tu situación?',
    [
      { id: 'savings_subscriber', title: 'Ya soy Suscriptor' },
      { id: 'savings_awarded', title: 'Soy Adjudicado' },
      { id: 'savings_new', title: 'Quiero Suscribirme' }
    ],
    'Plan Ahorro FIAT'
  );
}

// Flujo: Ya soy suscriptor
async function showSubscriberInfo(phone) {
  const msg = `📊 *Información para Suscriptores*\n\n` +
    `Si ya tenés un plan activo, podés acelerar tu adjudicación mediante *licitación*.\n\n` +
    `💡 *¿Qué es la licitación?*\n` +
    `Es un mecanismo donde ofrecés un monto adicional (% del valor del vehículo) para acceder antes a tu 0km.\n\n` +
    `📈 *Tips para licitar:*\n` +
    `• Consultá el valor de licitación promedio de tu grupo\n` +
    `• Podés licitar desde el 30% del valor móvil\n` +
    `• La licitación se descuenta de las últimas cuotas\n\n` +
    `¿Querés que un asesor te contacte para ayudarte con tu licitación?`;

  await wa.sendText(phone, msg);

  await wa.sendButtons(
    phone,
    '¿Qué querés hacer?',
    [
      { id: 'savings_contact_lic', title: 'Consultar licitación' },
      { id: 'savings_select_plan', title: 'Ver planes' },
      { id: 'menu', title: 'Menú principal' }
    ]
  );
}

// Flujo: Soy adjudicado
async function showAwardedInfo(phone) {
  const msg = `🎉 *¡Felicitaciones por tu adjudicación!*\n\n` +
    `Para retirar tu 0km, seguí estos pasos:\n\n` +
    `1️⃣ Confirmá la versión y color con tu asesor\n` +
    `2️⃣ Presentá la documentación requerida\n` +
    `3️⃣ Abonál el sellado y gastos de entrega\n` +
    `4️⃣ Coordinamos fecha de entrega\n\n` +
    DOCS_ADJUDICADO + `\n\n` +
    `📞 Un asesor te va a contactar para coordinar todo.`;

  await wa.sendText(phone, msg);

  await wa.sendButtons(
    phone,
    '¿Necesitás algo más?',
    [
      { id: 'savings_contact_adj', title: 'Coordinar entrega' },
      { id: 'savings_select_plan', title: 'Ver planes' },
      { id: 'menu', title: 'Menú principal' }
    ]
  );
}

// Flujo: Quiero suscribirme - mostrar planes disponibles
async function showPlansList(phone) {
  const rows = SAVINGS_PLANS.map(p => ({
    id: p.id,
    title: `FIAT ${p.model}`,
    description: `${p.version} | Cuota: ${p.cuota_sin_iva}`
  }));

  await wa.sendList(
    phone,
    '📋 *Planes de Ahorro disponibles*\n\nSeleccioná un plan para ver el detalle con cuotas, sellado TDF y suscripción:',
    'Ver planes',
    [{ title: 'Planes Ahorro FIAT', rows }],
    'Planes Abril 2026'
  );
}

// Mostrar detalle de un plan específico
async function showPlanDetail(phone, planId) {
  const plan = SAVINGS_PLANS.find(p => p.id === planId);
  if (!plan) {
    await showPlansList(phone);
    return;
  }

  const msg = `🚗 *Plan Ahorro FIAT ${plan.model}*\n` +
    `📌 ${plan.version}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💰 *Valor Móvil:* ${plan.movil}\n` +
    `📅 *Plazo:* ${plan.plazo}\n` +
    `📊 *${plan.grupo}*\n\n` +
    `💳 *Cuota s/IVA:* ${plan.cuota_sin_iva}\n` +
    `💳 *Cuota Total Cliente:* ${plan.cuota_total}\n` +
    `🏷️ *Sellado TDF:* ${plan.sellado_tdf}\n` +
    `📝 *Suscripción:* ${plan.suscripcion}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ _Valores sobrepauta Abril 2026. Sujetos a actualización mensual._\n` +
    `_El sellado TDF aplica para Tierra del Fuego._`;

  await wa.sendText(phone, msg);

  await wa.sendButtons(
    phone,
    '¿Qué querés hacer?',
    [
      { id: 'savings_subscribe_' + planId, title: 'Suscribirme' },
      { id: 'savings_select_plan', title: 'Ver otros planes' },
      { id: 'menu', title: 'Menú principal' }
    ]
  );
}

// Solicitar datos para suscripción
async function askSubscriptionName(phone, planId) {
  const plan = SAVINGS_PLANS.find(p => p.id === planId);
  const planName = plan ? `FIAT ${plan.model} ${plan.version}` : 'Plan seleccionado';

  await wa.sendText(phone, `✅ Vas a suscribirte al *${planName}*.\n\nPara avanzar, necesitamos algunos datos.\n\n¿Cuál es tu *nombre completo*? ✏️`);
}

async function askSubscriptionPhone(phone) {
  await wa.sendText(phone, '📞 ¿A qué *número de teléfono* podemos llamarte?\n\n(Si es este mismo, escribí "este")');
}

async function showSubscriptionSummary(phone, data) {
  const plan = SAVINGS_PLANS.find(p => p.id === data.plan_id);
  const planName = plan ? `FIAT ${plan.model} ${plan.version}` : data.plan_id;

  let msg = `📄 *SOLICITUD DE SUSCRIPCIÓN*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `🚗 *Plan:* ${planName}\n`;
  if (plan) {
    msg += `💳 *Cuota Total:* ${plan.cuota_total}\n`;
    msg += `📝 *Suscripción:* ${plan.suscripcion}\n`;
  }
  msg += `\n👤 *Nombre:* ${data.name}\n`;
  msg += `📞 *Teléfono:* ${data.contact_phone}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += DOCS_SUSCRIPCION + `\n\n`;
  msg += `✅ Un asesor de LASAC se va a comunicar con vos para completar la suscripción.\n`;
  msg += `\n_Escribí *menu* para volver al menú principal._`;

  await wa.sendText(phone, msg);

  // Guardar en DB
  try {
    saveSavingsRequest(phone, data, planName);
  } catch (err) {
    console.error('Error guardando solicitud plan ahorro:', err);
  }
}

function saveSavingsRequest(phone, data, planName) {
  const db = getDb();
  db.prepare(
    `INSERT INTO savings_requests (phone, name, contact_phone, plan_id, plan_name, request_type, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`
  ).run(phone, data.name, data.contact_phone, data.plan_id, planName, data.request_type || 'suscripcion');
}

// Handler principal del flujo
async function handle(context) {
  const { phone, text, inputLower, state, updateUserState, upsertLead } = context;
  const step = state.flow_step;
  const data = state.flow_data || {};

  switch (step) {
    case 'show_options':
      if (text === 'savings_subscriber') {
        updateUserState(phone, 'savings', 'subscriber_info', data);
        await showSubscriberInfo(phone);
      } else if (text === 'savings_awarded') {
        updateUserState(phone, 'savings', 'awarded_info', data);
        await showAwardedInfo(phone);
      } else if (text === 'savings_new') {
        updateUserState(phone, 'savings', 'select_plan', data);
        await showPlansList(phone);
      } else {
        await showSavingsOptions(phone);
      }
      break;

    case 'subscriber_info':
      if (text === 'savings_contact_lic') {
        data.request_type = 'licitacion';
        updateUserState(phone, 'savings', 'ask_name', data);
        await wa.sendText(phone, '📞 Para que un asesor te ayude con la licitación, necesitamos tus datos.\n\n¿Cuál es tu *nombre completo*? ✏️');
      } else if (text === 'savings_select_plan') {
        updateUserState(phone, 'savings', 'select_plan', data);
        await showPlansList(phone);
      } else {
        await showSubscriberInfo(phone);
      }
      break;

    case 'awarded_info':
      if (text === 'savings_contact_adj') {
        data.request_type = 'adjudicacion';
        updateUserState(phone, 'savings', 'ask_name', data);
        await wa.sendText(phone, '📞 Para coordinar la entrega de tu 0km, necesitamos tus datos.\n\n¿Cuál es tu *nombre completo*? ✏️');
      } else if (text === 'savings_select_plan') {
        updateUserState(phone, 'savings', 'select_plan', data);
        await showPlansList(phone);
      } else {
        await showAwardedInfo(phone);
      }
      break;

    case 'select_plan':
      if (text.startsWith('plan_')) {
        data.plan_id = text;
        updateUserState(phone, 'savings', 'plan_detail', data);
        await showPlanDetail(phone, text);
      } else {
        await showPlansList(phone);
      }
      break;

    case 'plan_detail':
      if (text.startsWith('savings_subscribe_')) {
        const planId = text.replace('savings_subscribe_', '');
        data.plan_id = planId;
        data.request_type = 'suscripcion';
        updateUserState(phone, 'savings', 'ask_name', data);
        await askSubscriptionName(phone, planId);
      } else if (text === 'savings_select_plan') {
        updateUserState(phone, 'savings', 'select_plan', data);
        await showPlansList(phone);
      } else {
        await showPlanDetail(phone, data.plan_id);
      }
      break;

    case 'ask_name':
      if (inputLower.length < 2 || inputLower.length > 100) {
        await wa.sendText(phone, 'Por favor ingresá tu nombre completo:');
        return;
      }
      data.name = text.trim();
      upsertLead(phone, data.name, `Plan Ahorro - ${data.request_type}`);
      updateUserState(phone, 'savings', 'ask_phone', data);
      await askSubscriptionPhone(phone);
      break;

    case 'ask_phone':
      if (inputLower === 'este' || inputLower === 'si' || inputLower === 'sí') {
        data.contact_phone = phone;
      } else if (inputLower.length < 6 || inputLower.length > 20) {
        await wa.sendText(phone, 'Por favor ingresá un número de teléfono válido:');
        return;
      } else {
        data.contact_phone = text.trim();
      }
      updateUserState(phone, 'savings', 'summary', data);
      await showSubscriptionSummary(phone, data);
      updateUserState(phone, 'main_menu', 'show', {});
      break;

    default:
      await showSavingsOptions(phone);
      break;
  }
}

module.exports = { showSavingsOptions, handle };
