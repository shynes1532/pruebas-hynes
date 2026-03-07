const wa = require('../services/whatsapp');
const { getDb } = require('../models/database');
const { getAllVehicles, getModelGroups } = require('./catalog');

// Paso 1: Datos personales
async function askPersonalName(phone) {
  await wa.sendText(phone, `💳 *Crédito Automotor FIAT*\n\nVamos a completar tu solicitud en 4 pasos simples.\n\n*Paso 1 de 4: Datos Personales*\n\n¿Cuál es tu *nombre completo*? ✏️`);
}

async function askDni(phone) {
  await wa.sendText(phone, '¿Cuál es tu *número de DNI*? (sin puntos)');
}

async function askEmail(phone) {
  await wa.sendText(phone, '¿Cuál es tu *email* de contacto? ✉️');
}

async function askContactPhone(phone) {
  await wa.sendText(phone, '📞 ¿A qué *número de teléfono* podemos llamarte?\n\n(Si es este mismo número de WhatsApp, escribí "este")');
}

// Paso 2: Datos laborales
async function askEmploymentType(phone) {
  await wa.sendButtons(
    phone,
    '*Paso 2 de 4: Datos Laborales*\n\n¿Cuál es tu situación laboral?',
    [
      { id: 'emp_relacion', title: 'Relación de dependencia' },
      { id: 'emp_monotributo', title: 'Monotributista' },
      { id: 'emp_autonomo', title: 'Autónomo' }
    ],
    'Datos Laborales'
  );
}

async function askIncome(phone) {
  await wa.sendText(phone, '💰 ¿Cuál es tu *ingreso mensual neto* aproximado?\n\n(Ej: 1500000)');
}

async function askSeniority(phone) {
  await wa.sendButtons(
    phone,
    '¿Cuánto tiempo llevás en tu trabajo actual?',
    [
      { id: 'sen_menos1', title: 'Menos de 1 año' },
      { id: 'sen_1a3', title: '1 a 3 años' },
      { id: 'sen_mas3', title: 'Más de 3 años' }
    ]
  );
}

// Paso 3: Vehículo de interés
async function askVehicleInterest(phone) {
  const models = getModelGroups();
  const rows = models.slice(0, 10).map(m => ({
    id: `credit_model_${m.model}`,
    title: `FIAT ${m.model}`,
    description: `Desde $${(m.min_price / 1000000).toFixed(1)}M | ${m.versions} ver.`
  }));

  await wa.sendList(
    phone,
    '*Paso 3 de 4: Vehículo*\n\n¿Qué modelo te interesa financiar?\n\nSeleccioná uno:',
    'Ver modelos',
    [{ title: 'Modelos FIAT', rows }],
    'Elegí un modelo'
  );
}

async function askDownPaymentCredit(phone) {
  await wa.sendButtons(
    phone,
    '¿Con qué anticipo contás?',
    [
      { id: 'cdown_20', title: '20% o menos' },
      { id: 'cdown_30', title: 'Entre 20% y 40%' },
      { id: 'cdown_50', title: 'Más del 40%' }
    ]
  );
}

async function askCreditTerm(phone) {
  await wa.sendButtons(
    phone,
    '¿En cuántas cuotas te gustaría financiar?',
    [
      { id: 'cterm_12', title: '12 cuotas' },
      { id: 'cterm_24', title: '24 cuotas' },
      { id: 'cterm_48', title: '48 cuotas' }
    ]
  );
}

// Paso 4: Resumen y envío
async function showCreditSummary(phone, data) {
  const empLabels = {
    relacion: 'Relación de dependencia',
    monotributo: 'Monotributista',
    autonomo: 'Autónomo'
  };

  const senLabels = {
    menos1: 'Menos de 1 año',
    '1a3': '1 a 3 años',
    mas3: 'Más de 3 años'
  };

  const downLabels = {
    '20': '20% o menos',
    '30': 'Entre 20% y 40%',
    '50': 'Más del 40%'
  };

  let msg = `📄 *SOLICITUD DE CRÉDITO AUTOMOTOR*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `*Paso 4 de 4: Resumen*\n\n`;
  msg += `👤 *Datos Personales:*\n`;
  msg += `  Nombre: ${data.name}\n`;
  msg += `  DNI: ${data.dni}\n`;
  msg += `  Email: ${data.email}\n`;
  msg += `  Teléfono: ${data.contact_phone}\n\n`;
  msg += `💼 *Datos Laborales:*\n`;
  msg += `  Situación: ${empLabels[data.employment] || data.employment}\n`;
  msg += `  Ingreso: $${Number(data.income).toLocaleString('es-AR')}\n`;
  msg += `  Antigüedad: ${senLabels[data.seniority] || data.seniority}\n\n`;
  msg += `🚗 *Vehículo:*\n`;
  msg += `  Modelo: FIAT ${data.vehicle_model}\n`;
  msg += `  Anticipo: ${downLabels[data.down_payment] || data.down_payment}\n`;
  msg += `  Plazo: ${data.credit_term} cuotas\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📋 *Documentación necesaria:*\n`;
  msg += `• DNI (frente y dorso)\n`;
  msg += `• Últimos 3 recibos de sueldo\n`;
  msg += `• Servicio a tu nombre\n`;
  msg += `• CBU bancario\n\n`;
  msg += `✅ *¡Solicitud registrada!*\n`;
  msg += `Un asesor financiero de LASAC se va a comunicar con vos a la brevedad para avanzar con la pre-aprobación.\n`;
  msg += `\n⚠️ _Sujeto a aprobación crediticia._`;

  await wa.sendText(phone, msg);

  // Guardar en DB
  try {
    saveCreditRequest(phone, data);
  } catch (err) {
    console.error('Error guardando solicitud de crédito:', err);
  }
}

function saveCreditRequest(phone, data) {
  const db = getDb();
  db.prepare(
    `INSERT INTO credit_requests (phone, name, dni, email, contact_phone, employment_type, monthly_income, seniority, vehicle_model, down_payment, credit_term, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`
  ).run(phone, data.name, data.dni, data.email, data.contact_phone, data.employment, data.income, data.seniority, data.vehicle_model, data.down_payment, data.credit_term);
}

// Handler principal del flujo
async function handle(context) {
  const { phone, text, inputLower, state, updateUserState, upsertLead } = context;
  const step = state.flow_step;
  const data = state.flow_data || {};

  switch (step) {
    // Paso 1: Datos personales
    case 'ask_name':
      if (inputLower.length < 2 || inputLower.length > 100) {
        await wa.sendText(phone, 'Por favor ingresá tu nombre completo:');
        return;
      }
      data.name = text.trim();
      upsertLead(phone, data.name, 'Crédito Automotor');
      updateUserState(phone, 'credit', 'ask_dni', data);
      await askDni(phone);
      break;

    case 'ask_dni':
      const dniClean = text.replace(/\./g, '').trim();
      if (!/^\d{7,8}$/.test(dniClean)) {
        await wa.sendText(phone, 'El DNI debe tener 7 u 8 dígitos. Ingresalo sin puntos:');
        return;
      }
      data.dni = dniClean;
      updateUserState(phone, 'credit', 'ask_email', data);
      await askEmail(phone);
      break;

    case 'ask_email':
      if (!text.includes('@') || !text.includes('.')) {
        await wa.sendText(phone, 'Por favor ingresá un email válido (ej: nombre@email.com):');
        return;
      }
      data.email = text.trim().toLowerCase();
      updateUserState(phone, 'credit', 'ask_phone', data);
      await askContactPhone(phone);
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
      updateUserState(phone, 'credit', 'ask_employment', data);
      await askEmploymentType(phone);
      break;

    // Paso 2: Datos laborales
    case 'ask_employment':
      if (text === 'emp_relacion') {
        data.employment = 'relacion';
      } else if (text === 'emp_monotributo') {
        data.employment = 'monotributo';
      } else if (text === 'emp_autonomo') {
        data.employment = 'autonomo';
      } else {
        await askEmploymentType(phone);
        return;
      }
      updateUserState(phone, 'credit', 'ask_income', data);
      await askIncome(phone);
      break;

    case 'ask_income':
      const incomeClean = text.replace(/\./g, '').replace(/\$/g, '').replace(/,/g, '').trim();
      const incomeNum = parseInt(incomeClean);
      if (isNaN(incomeNum) || incomeNum < 100000) {
        await wa.sendText(phone, 'Por favor ingresá tu ingreso mensual neto (solo números, ej: 1500000):');
        return;
      }
      data.income = incomeNum;
      updateUserState(phone, 'credit', 'ask_seniority', data);
      await askSeniority(phone);
      break;

    case 'ask_seniority':
      if (text === 'sen_menos1') {
        data.seniority = 'menos1';
      } else if (text === 'sen_1a3') {
        data.seniority = '1a3';
      } else if (text === 'sen_mas3') {
        data.seniority = 'mas3';
      } else {
        await askSeniority(phone);
        return;
      }
      updateUserState(phone, 'credit', 'ask_vehicle', data);
      await askVehicleInterest(phone);
      break;

    // Paso 3: Vehículo
    case 'ask_vehicle':
      if (text.startsWith('credit_model_')) {
        data.vehicle_model = text.replace('credit_model_', '');
        updateUserState(phone, 'credit', 'ask_down_payment', data);
        await askDownPaymentCredit(phone);
      } else {
        await askVehicleInterest(phone);
      }
      break;

    case 'ask_down_payment':
      if (text === 'cdown_20') {
        data.down_payment = '20';
      } else if (text === 'cdown_30') {
        data.down_payment = '30';
      } else if (text === 'cdown_50') {
        data.down_payment = '50';
      } else {
        await askDownPaymentCredit(phone);
        return;
      }
      updateUserState(phone, 'credit', 'ask_term', data);
      await askCreditTerm(phone);
      break;

    case 'ask_term':
      if (text === 'cterm_12') {
        data.credit_term = 12;
      } else if (text === 'cterm_24') {
        data.credit_term = 24;
      } else if (text === 'cterm_48') {
        data.credit_term = 48;
      } else {
        await askCreditTerm(phone);
        return;
      }
      // Paso 4: Resumen
      updateUserState(phone, 'credit', 'summary', data);
      await showCreditSummary(phone, data);
      updateUserState(phone, 'main_menu', 'show', {});
      break;

    default:
      await askPersonalName(phone);
      break;
  }
}

module.exports = { askPersonalName, handle };
