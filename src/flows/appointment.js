const wa = require('../services/whatsapp');
const { getDb } = require('../models/database');

// Próximos 5 días hábiles
function getAvailableDates() {
  const dates = [];
  const now = new Date();
  let day = new Date(now);
  day.setDate(day.getDate() + 1); // Empezar desde mañana

  while (dates.length < 5) {
    const dow = day.getDay();
    if (dow !== 0) { // Excluir domingos
      dates.push({
        value: day.toISOString().split('T')[0],
        label: formatDate(day)
      });
    }
    day.setDate(day.getDate() + 1);
  }
  return dates;
}

function formatDate(date) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

const TIME_SLOTS = [
  { id: 'slot_09', title: '09:00 - 10:00', description: 'Turno mañana temprano' },
  { id: 'slot_10', title: '10:00 - 11:00', description: 'Turno mañana' },
  { id: 'slot_11', title: '11:00 - 12:00', description: 'Turno media mañana' },
  { id: 'slot_14', title: '14:00 - 15:00', description: 'Turno siesta' },
  { id: 'slot_15', title: '15:00 - 16:00', description: 'Turno tarde temprano' },
  { id: 'slot_16', title: '16:00 - 17:00', description: 'Turno tarde' },
  { id: 'slot_17', title: '17:00 - 18:00', description: 'Último turno' }
];

async function askType(phone) {
  await wa.sendButtons(
    phone,
    '¿Qué tipo de cita querés agendar?',
    [
      { id: 'appt_test_drive', title: '🏎️ Test Drive' },
      { id: 'appt_visit', title: '🏢 Visita al salón' },
      { id: 'appt_service', title: '🔧 Servicio técnico' }
    ],
    '📅 Agendar Cita'
  );
}

async function askName(phone) {
  await wa.sendText(phone, '¿Cuál es tu nombre completo? ✏️');
}

async function askDate(phone) {
  const dates = getAvailableDates();
  const rows = dates.map(d => ({
    id: `date_${d.value}`,
    title: d.label,
    description: d.value
  }));

  await wa.sendList(
    phone,
    '¿Qué día te viene mejor?\n\nSeleccioná una fecha disponible:',
    'Ver fechas',
    [{ title: 'Fechas disponibles', rows }],
    '📅 Elegí una fecha'
  );
}

async function askTime(phone) {
  await wa.sendList(
    phone,
    '¿En qué horario preferís?\n\nSeleccioná un turno:',
    'Ver horarios',
    [{ title: 'Turnos disponibles', rows: TIME_SLOTS }],
    '🕐 Elegí un horario'
  );
}

async function confirmAppointment(phone, data) {
  const typeLabels = {
    test_drive: '🏎️ Test Drive',
    visit: '🏢 Visita al salón',
    service: '🔧 Servicio técnico'
  };

  let msg = `✅ *¡Cita confirmada!*\n\n`;
  msg += `📋 *Resumen:*\n`;
  msg += `  👤 Nombre: ${data.name}\n`;
  msg += `  📌 Tipo: ${typeLabels[data.type] || data.type}\n`;
  if (data.vehicle_info) msg += `  🚗 Vehículo: ${data.vehicle_info}\n`;
  msg += `  📅 Fecha: ${data.date}\n`;
  msg += `  🕐 Horario: ${data.time_slot}\n`;
  msg += `\n📍 ${process.env.DEALER_ADDRESS || 'Te esperamos en nuestro salón'}\n`;
  msg += `\nSi necesitás reprogramar, escribí *menu* y volvé a agendar.\n`;
  msg += `\n¡Te esperamos! 🤝`;

  await wa.sendText(phone, msg);
}

function saveAppointment(data) {
  const db = getDb();
  db.prepare(
    `INSERT INTO appointments (phone, name, appointment_type, vehicle_id, vehicle_info, date, time_slot, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`
  ).run(data.phone, data.name, data.type, data.vehicle_id || null, data.vehicle_info || null, data.date, data.time_slot);
}

async function handle(context) {
  const { phone, text, inputLower, state, updateUserState, upsertLead } = context;
  const step = state.flow_step;
  const data = state.flow_data || {};

  switch (step) {
    case 'ask_type':
      if (text === 'appt_test_drive') {
        data.type = 'test_drive';
      } else if (text === 'appt_visit') {
        data.type = 'visit';
      } else if (text === 'appt_service') {
        data.type = 'service';
      } else {
        await askType(phone);
        return;
      }
      updateUserState(phone, 'appointment', 'ask_name', data);
      await askName(phone);
      break;

    case 'ask_name':
      if (inputLower.length < 2 || inputLower.length > 100) {
        await wa.sendText(phone, 'Por favor ingresá tu nombre completo:');
        return;
      }
      data.name = text.trim();
      upsertLead(phone, data.name, data.vehicle_info);
      updateUserState(phone, 'appointment', 'ask_date', data);
      await askDate(phone);
      break;

    case 'ask_date':
      if (text.startsWith('date_')) {
        data.date = text.replace('date_', '');
        updateUserState(phone, 'appointment', 'ask_time', data);
        await askTime(phone);
      } else {
        await askDate(phone);
      }
      break;

    case 'ask_time':
      const slot = TIME_SLOTS.find(s => s.id === text);
      if (slot) {
        data.time_slot = slot.title;
        data.phone = phone;
        // Guardar en base de datos
        saveAppointment(data);
        // Confirmar al usuario
        await confirmAppointment(phone, data);
        // Volver al menú
        updateUserState(phone, 'main_menu', 'show', {});
      } else {
        await askTime(phone);
      }
      break;

    default:
      await askType(phone);
      break;
  }
}

module.exports = { askType, askName, askDate, askTime, handle };
