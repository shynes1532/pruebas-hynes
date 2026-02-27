const wa = require('../services/whatsapp');
const { getDb } = require('../models/database');
const { getAllVehicles, getVehicleById } = require('./catalog');

const FINANCING_OPTIONS = [
  { months: 12, rate: 0.45, id: 'fin_12' },
  { months: 24, rate: 0.55, id: 'fin_24' },
  { months: 36, rate: 0.65, id: 'fin_36' },
  { months: 48, rate: 0.70, id: 'fin_48' },
  { months: 60, rate: 0.75, id: 'fin_60' }
];

const DOWN_PAYMENT_OPTIONS = [
  { percent: 20, id: 'down_20', label: '20% de anticipo' },
  { percent: 30, id: 'down_30', label: '30% de anticipo' },
  { percent: 50, id: 'down_50', label: '50% de anticipo' }
];

async function askVehicle(phone) {
  const vehicles = getAllVehicles();

  if (vehicles.length === 0) {
    await wa.sendText(phone, 'No hay vehículos disponibles en este momento. Un asesor se contactará con vos.\n\nEscribí *menu* para volver.');
    return;
  }

  const rows = vehicles.slice(0, 10).map(v => ({
    id: `qv_${v.id}`,
    title: `${v.brand} ${v.model}`,
    description: `${v.version} - $${(v.price/1000000).toFixed(1)}M`
  }));

  await wa.sendList(
    phone,
    '¿Qué vehículo te gustaría cotizar?\n\nSeleccioná uno de la lista:',
    'Ver modelos',
    [{ title: 'Modelos disponibles', rows }],
    '💰 Cotización'
  );
}

async function askName(phone, vehicle) {
  const msg = vehicle
    ? `Genial, vas a cotizar el *${vehicle.brand} ${vehicle.model} ${vehicle.year}* (${formatPrice(vehicle.price, vehicle.currency)}).\n\n¿Cuál es tu nombre completo? ✏️`
    : '¿Cuál es tu nombre completo? ✏️';
  await wa.sendText(phone, msg);
}

async function askDownPayment(phone) {
  await wa.sendButtons(
    phone,
    '¿Qué porcentaje de anticipo te gustaría dar?',
    DOWN_PAYMENT_OPTIONS.map(d => ({
      id: d.id,
      title: d.label
    }))
  );
}

async function askFinancingMonths(phone) {
  const rows = FINANCING_OPTIONS.map(f => ({
    id: f.id,
    title: `${f.months} cuotas`,
    description: `Tasa anual: ${(f.rate * 100).toFixed(0)}%`
  }));

  await wa.sendList(
    phone,
    '¿En cuántas cuotas querés financiar?\n\nSeleccioná un plan:',
    'Ver planes',
    [{ title: 'Planes de financiamiento', rows }],
    '📊 Planes disponibles'
  );
}

function calculateFinancing(price, downPaymentPercent, months, annualRate) {
  const downPayment = price * (downPaymentPercent / 100);
  const financeAmount = price - downPayment;
  const monthlyRate = annualRate / 12;
  // Fórmula cuota fija (sistema francés)
  const monthly = financeAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const totalFinancing = monthly * months;

  return {
    downPayment: Math.round(downPayment),
    financeAmount: Math.round(financeAmount),
    monthly: Math.round(monthly),
    totalFinancing: Math.round(totalFinancing),
    totalCost: Math.round(downPayment + totalFinancing)
  };
}

async function showQuoteResult(phone, data) {
  const calc = calculateFinancing(data.vehicle_price, data.down_percent, data.months, data.rate);

  let msg = `📄 *COTIZACIÓN*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `🚗 *${data.vehicle_info}*\n`;
  msg += `💰 Precio de lista: ${formatPrice(data.vehicle_price, 'ARS')}\n\n`;
  msg += `📊 *Plan de financiamiento:*\n`;
  msg += `  💵 Anticipo (${data.down_percent}%): ${formatPrice(calc.downPayment, 'ARS')}\n`;
  msg += `  📋 Monto a financiar: ${formatPrice(calc.financeAmount, 'ARS')}\n`;
  msg += `  📅 Plazo: ${data.months} cuotas\n`;
  msg += `  📈 Tasa anual: ${(data.rate * 100).toFixed(0)}%\n\n`;
  msg += `💳 *Cuota mensual: ${formatPrice(calc.monthly, 'ARS')}*\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⚠️ _Valores estimados sujetos a aprobación crediticia._\n`;
  msg += `_Un asesor se contactará con vos para confirmar la cotización._`;

  await wa.sendText(phone, msg);

  // Guardar cotización en DB
  try {
    saveQuote(phone, data, calc);
  } catch (err) {
    console.error('❌ Error guardando cotización:', err);
  }

  // Botones de acción post-cotización
  await wa.sendButtons(
    phone,
    '¿Qué querés hacer ahora?',
    [
      { id: `appt_vehicle_${data.vehicle_id}`, title: '📅 Agendar visita' },
      { id: 'menu_quote', title: '💰 Otra cotización' },
      { id: 'menu', title: '🏠 Menú principal' }
    ]
  );
}

function saveQuote(phone, data, calc) {
  const db = getDb();
  db.prepare(
    `INSERT INTO quotes (phone, name, vehicle_id, vehicle_info, vehicle_price, down_payment, financing_months, monthly_payment, interest_rate, total_financing, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generada')`
  ).run(phone, data.name, data.vehicle_id, data.vehicle_info, data.vehicle_price, calc.downPayment, data.months, calc.monthly, data.rate, calc.totalFinancing);
}

function formatPrice(price, currency) {
  if (currency === 'USD') return `USD ${price.toLocaleString('es-AR')}`;
  return `$ ${price.toLocaleString('es-AR')}`;
}

async function handle(context) {
  const { phone, text, inputLower, state, updateUserState, upsertLead } = context;
  const step = state.flow_step;
  const data = state.flow_data || {};

  switch (step) {
    case 'ask_vehicle':
      if (text.startsWith('qv_')) {
        const vehicleId = parseInt(text.replace('qv_', ''));
        const vehicle = getVehicleById(vehicleId);
        if (vehicle) {
          data.vehicle_id = vehicleId;
          data.vehicle_info = `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.version}`;
          data.vehicle_price = vehicle.price;
          updateUserState(phone, 'quote', 'ask_name', data);
          await askName(phone, vehicle);
        } else {
          await askVehicle(phone);
        }
      } else {
        await askVehicle(phone);
      }
      break;

    case 'ask_name':
      if (inputLower.length < 2 || inputLower.length > 100) {
        await wa.sendText(phone, 'Por favor ingresá tu nombre completo:');
        return;
      }
      data.name = text.trim();
      upsertLead(phone, data.name, data.vehicle_info);
      updateUserState(phone, 'quote', 'ask_down_payment', data);
      await askDownPayment(phone);
      break;

    case 'ask_down_payment':
      const downOpt = DOWN_PAYMENT_OPTIONS.find(d => d.id === text);
      if (downOpt) {
        data.down_percent = downOpt.percent;
        updateUserState(phone, 'quote', 'ask_months', data);
        await askFinancingMonths(phone);
      } else {
        await askDownPayment(phone);
      }
      break;

    case 'ask_months':
      const finOpt = FINANCING_OPTIONS.find(f => f.id === text);
      if (finOpt) {
        data.months = finOpt.months;
        data.rate = finOpt.rate;
        updateUserState(phone, 'quote', 'result', data);
        await showQuoteResult(phone, data);
        updateUserState(phone, 'main_menu', 'show', {});
      } else {
        await askFinancingMonths(phone);
      }
      break;

    default:
      await askVehicle(phone);
      break;
  }
}

module.exports = { askVehicle, askName, handle };
