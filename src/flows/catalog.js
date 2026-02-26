const wa = require('../services/whatsapp');
const { getDb } = require('../models/database');

// Obtener categorías disponibles
function getCategories() {
  const db = getDb();
  return db.prepare(
    'SELECT DISTINCT category FROM vehicles WHERE available = 1 ORDER BY category'
  ).all().map(r => r.category);
}

// Obtener vehículos por categoría
function getVehiclesByCategory(category) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM vehicles WHERE category = ? AND available = 1 ORDER BY brand, model'
  ).all(category);
}

// Obtener vehículo por ID
function getVehicleById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
}

// Obtener todos los vehículos disponibles
function getAllVehicles() {
  const db = getDb();
  return db.prepare('SELECT * FROM vehicles WHERE available = 1 ORDER BY brand, model').all();
}

const CATEGORY_LABELS = {
  sedan: '🚗 Sedán',
  suv: '🚙 SUV / Camioneta',
  hatchback: '🏎️ Hatchback',
  pickup: '🛻 Pickup',
  coupe: '🏎️ Coupé',
  van: '🚐 Van / Utilitario'
};

async function showCategories(phone) {
  const categories = getCategories();

  if (categories.length === 0) {
    await wa.sendText(phone, 'Por el momento no tenemos vehículos cargados en el catálogo. Un asesor se comunicará con vos pronto.\n\nEscribí *menu* para volver.');
    return;
  }

  const rows = categories.map(cat => ({
    id: `cat_${cat}`,
    title: CATEGORY_LABELS[cat] || cat,
    description: `Ver modelos ${cat}`
  }));

  // Agregar opción de ver todos
  rows.unshift({
    id: 'cat_all',
    title: '📋 Ver Todos',
    description: 'Ver todos los modelos disponibles'
  });

  await wa.sendList(
    phone,
    '¿Qué tipo de vehículo estás buscando?\n\nSeleccioná una categoría para ver los modelos disponibles:',
    'Ver categorías',
    [{ title: 'Categorías', rows }],
    '🚗 Nuestro Catálogo'
  );
}

async function showVehicleList(phone, category) {
  const vehicles = category === 'all' ? getAllVehicles() : getVehiclesByCategory(category);

  if (vehicles.length === 0) {
    await wa.sendText(phone, 'No encontramos vehículos en esa categoría. Probá con otra.\n\nEscribí *menu* para volver.');
    return;
  }

  const rows = vehicles.slice(0, 10).map(v => ({
    id: `vehicle_${v.id}`,
    title: `${v.brand} ${v.model}`,
    description: `${v.year} - ${v.version} | ${formatPrice(v.price, v.currency)}`
  }));

  const label = category === 'all' ? 'Todos los modelos' : (CATEGORY_LABELS[category] || category);

  await wa.sendList(
    phone,
    `Estos son nuestros modelos disponibles en *${label}*:\n\nSeleccioná uno para ver la ficha completa:`,
    'Ver modelos',
    [{ title: label, rows }]
  );
}

async function showVehicleDetail(phone, vehicleId, updateUserState, upsertLead) {
  const vehicle = getVehicleById(vehicleId);
  if (!vehicle) {
    await wa.sendText(phone, 'No encontramos ese vehículo. Escribí *menu* para volver.');
    return;
  }

  // Registrar interés del lead
  if (upsertLead) {
    upsertLead(phone, null, `${vehicle.brand} ${vehicle.model} ${vehicle.year}`);
  }

  let msg = `🚗 *${vehicle.brand} ${vehicle.model} ${vehicle.year}*\n`;
  msg += `📌 Versión: ${vehicle.version}\n\n`;
  msg += `💰 *Precio: ${formatPrice(vehicle.price, vehicle.currency)}*\n\n`;
  msg += `📋 *Especificaciones:*\n`;
  if (vehicle.engine) msg += `  ⚙️ Motor: ${vehicle.engine}\n`;
  if (vehicle.horsepower) msg += `  🏇 Potencia: ${vehicle.horsepower} HP\n`;
  msg += `  ⛽ Combustible: ${vehicle.fuel}\n`;
  msg += `  🔧 Transmisión: ${vehicle.transmission}\n`;
  if (vehicle.color_options) msg += `  🎨 Colores: ${vehicle.color_options}\n`;
  if (vehicle.features) msg += `\n✨ *Equipamiento:*\n${vehicle.features}\n`;

  await wa.sendText(phone, msg);

  // Enviar imagen si existe
  if (vehicle.image_url) {
    await wa.sendImage(phone, vehicle.image_url, `${vehicle.brand} ${vehicle.model} ${vehicle.year}`);
  }

  // Botones de acción
  await wa.sendButtons(
    phone,
    '¿Qué te gustaría hacer con este vehículo?',
    [
      { id: `quote_vehicle_${vehicle.id}`, title: '💰 Cotizar' },
      { id: `appt_vehicle_${vehicle.id}`, title: '📅 Agendar Test Drive' },
      { id: 'menu_catalog', title: '🔙 Ver más autos' }
    ]
  );
}

function formatPrice(price, currency) {
  const cur = currency || 'USD';
  if (cur === 'USD') return `USD ${price.toLocaleString('es-AR')}`;
  return `$ ${price.toLocaleString('es-AR')}`;
}

async function handle(context) {
  const { phone, text, inputLower, state, updateUserState, upsertLead } = context;

  // Si viene de un botón de cotizar desde detalle
  if (text.startsWith('quote_vehicle_')) {
    const vehicleId = parseInt(text.replace('quote_vehicle_', ''));
    const vehicle = getVehicleById(vehicleId);
    if (vehicle) {
      updateUserState(phone, 'quote', 'ask_name', {
        vehicle_id: vehicleId,
        vehicle_info: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`
      });
      const quoteFlow = require('./quote');
      await quoteFlow.askName(phone, vehicle);
      return;
    }
  }

  // Si viene de un botón de test drive desde detalle
  if (text.startsWith('appt_vehicle_')) {
    const vehicleId = parseInt(text.replace('appt_vehicle_', ''));
    const vehicle = getVehicleById(vehicleId);
    if (vehicle) {
      updateUserState(phone, 'appointment', 'ask_name', {
        type: 'test_drive',
        vehicle_id: vehicleId,
        vehicle_info: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`
      });
      const appointmentFlow = require('./appointment');
      await appointmentFlow.askName(phone);
      return;
    }
  }

  const step = state.flow_step;

  switch (step) {
    case 'show_categories':
      // Selección de categoría
      if (text.startsWith('cat_')) {
        const category = text.replace('cat_', '');
        updateUserState(phone, 'catalog', 'show_vehicles', { category });
        await showVehicleList(phone, category);
      } else {
        await showCategories(phone);
      }
      break;

    case 'show_vehicles':
      // Selección de vehículo
      if (text.startsWith('vehicle_')) {
        const vehicleId = parseInt(text.replace('vehicle_', ''));
        updateUserState(phone, 'catalog', 'show_detail', { vehicle_id: vehicleId });
        await showVehicleDetail(phone, vehicleId, updateUserState, upsertLead);
      } else if (text === 'menu_catalog') {
        updateUserState(phone, 'catalog', 'show_categories', {});
        await showCategories(phone);
      } else {
        await showVehicleList(phone, state.flow_data.category || 'all');
      }
      break;

    case 'show_detail':
      if (text === 'menu_catalog') {
        updateUserState(phone, 'catalog', 'show_categories', {});
        await showCategories(phone);
      } else {
        await showCategories(phone);
      }
      break;

    default:
      await showCategories(phone);
      break;
  }
}

module.exports = { showCategories, showVehicleList, showVehicleDetail, handle, getVehicleById, getAllVehicles };
