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
  sedan: '🚗 Sedan',
  suv: '🚙 SUV',
  hatchback: '🏎️ Hatchback',
  pickup: '🛻 Pickup',
  coupe: '🏎️ Coupe',
  van: '🚐 Utilitario'
};

// Obtener modelos agrupados (para cuando hay muchos vehiculos)
function getModelGroups() {
  const db = getDb();
  return db.prepare(`
    SELECT model, category, COUNT(*) as versions, MIN(price) as min_price, MAX(price) as max_price
    FROM vehicles WHERE available = 1
    GROUP BY model ORDER BY min_price
  `).all();
}

// Obtener versiones de un modelo
function getVehiclesByModel(model) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM vehicles WHERE model = ? AND available = 1 ORDER BY price'
  ).all(model);
}

async function showCategories(phone) {
  const models = getModelGroups();

  if (models.length === 0) {
    await wa.sendText(phone, 'Por el momento no tenemos vehiculos cargados en el catalogo. Un asesor se comunicara con vos pronto.\n\nEscribi *menu* para volver.');
    return;
  }

  const rows = models.slice(0, 10).map(m => {
    const priceLabel = `Desde $${(m.min_price / 1000000).toFixed(1)}M`;
    const catLabel = CATEGORY_LABELS[m.category] || m.category;
    return {
      id: `model_${m.model}`,
      title: `FIAT ${m.model}`,
      description: `${catLabel} | ${m.versions} ver. | ${priceLabel}`
    };
  });

  await wa.sendList(
    phone,
    'Estos son nuestros modelos FIAT 0km disponibles.\n\nSelecciona un modelo para ver versiones y precios:',
    'Ver modelos',
    [{ title: 'Modelos FIAT', rows }],
    'Catalogo FIAT 0km'
  );
}

async function showModelVersions(phone, modelName) {
  const vehicles = getVehiclesByModel(modelName);

  if (vehicles.length === 0) {
    await wa.sendText(phone, 'No encontramos versiones de ese modelo. Escribi *menu* para volver.');
    return;
  }

  if (vehicles.length === 1) {
    // Si hay una sola version, mostrar directo el detalle
    await showVehicleDetail(phone, vehicles[0].id);
    return;
  }

  const rows = vehicles.slice(0, 10).map(v => ({
    id: `vehicle_${v.id}`,
    title: v.version.substring(0, 24),
    description: `$${v.price.toLocaleString('es-AR')} | ${v.transmission}`
  }));

  await wa.sendList(
    phone,
    `*FIAT ${modelName}* - Versiones disponibles:\n\nSelecciona una version para ver la ficha completa:`,
    'Ver versiones',
    [{ title: `FIAT ${modelName}`, rows }]
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
  const cur = currency || 'ARS';
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
        vehicle_info: `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.version}`,
        vehicle_price: vehicle.price,
        vehicle_currency: vehicle.currency || 'ARS'
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
      // Seleccion de modelo
      if (text.startsWith('model_')) {
        const modelName = text.replace('model_', '');
        updateUserState(phone, 'catalog', 'show_versions', { model: modelName });
        await showModelVersions(phone, modelName);
      } else {
        await showCategories(phone);
      }
      break;

    case 'show_versions':
      // Seleccion de version
      if (text.startsWith('vehicle_')) {
        const vehicleId = parseInt(text.replace('vehicle_', ''));
        updateUserState(phone, 'catalog', 'show_detail', { vehicle_id: vehicleId });
        await showVehicleDetail(phone, vehicleId, updateUserState, upsertLead);
      } else if (text === 'menu_catalog') {
        updateUserState(phone, 'catalog', 'show_categories', {});
        await showCategories(phone);
      } else {
        await showModelVersions(phone, state.flow_data.model);
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

module.exports = { showCategories, showModelVersions, showVehicleDetail, handle, getVehicleById, getAllVehicles, getVehiclesByModel, getModelGroups };
