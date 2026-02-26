require('dotenv').config();
const { getDb, initialize } = require('./models/database');

initialize();
const db = getDb();

console.log('Cargando datos de ejemplo...\n');

// Limpiar tabla de vehículos
db.prepare('DELETE FROM vehicles').run();

const vehicles = [
  // Toyota
  {
    brand: 'Toyota', model: 'Corolla', year: 2025, version: 'XEi CVT',
    price: 32500, category: 'sedan', fuel: 'nafta', transmission: 'automatica',
    engine: '2.0L 4 cilindros', horsepower: 170,
    color_options: 'Blanco, Negro, Gris Plata, Rojo',
    features: '- Pantalla tactil 9"\n- Apple CarPlay / Android Auto\n- Camara de retroceso\n- Sensores de estacionamiento\n- 7 airbags\n- Control de crucero'
  },
  {
    brand: 'Toyota', model: 'Corolla Cross', year: 2025, version: 'XEi CVT',
    price: 39900, category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '2.0L 4 cilindros', horsepower: 170,
    color_options: 'Blanco Perla, Negro, Gris, Azul',
    features: '- Pantalla 10.5"\n- Toyota Safety Sense\n- Techo solar\n- Butaca electrica\n- 7 airbags\n- Arranque sin llave'
  },
  {
    brand: 'Toyota', model: 'Hilux', year: 2025, version: 'SRV 4x4 AT',
    price: 52000, category: 'pickup', fuel: 'diesel', transmission: 'automatica',
    engine: '2.8L Turbo Diesel', horsepower: 204,
    color_options: 'Blanco, Negro, Gris Oscuro, Marron',
    features: '- Pantalla 8"\n- Control de traccion\n- Diferencial trasero bloqueante\n- 7 airbags\n- Camara 360\n- Asientos de cuero'
  },
  {
    brand: 'Toyota', model: 'Yaris', year: 2025, version: 'XLS CVT',
    price: 24500, category: 'hatchback', fuel: 'nafta', transmission: 'automatica',
    engine: '1.5L 4 cilindros', horsepower: 107,
    color_options: 'Blanco, Rojo, Negro, Azul, Gris',
    features: '- Pantalla 7"\n- 6 airbags\n- Control de estabilidad\n- Camara de retroceso\n- Aire acondicionado automatico'
  },
  // Volkswagen
  {
    brand: 'Volkswagen', model: 'Taos', year: 2025, version: 'Comfortline AT',
    price: 38000, category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.4L TSI Turbo', horsepower: 150,
    color_options: 'Blanco, Negro, Gris Platino, Azul',
    features: '- VW Play 10"\n- Climatizador bizona\n- Asistente de estacionamiento\n- 6 airbags\n- Techo panoramico\n- Faros LED'
  },
  {
    brand: 'Volkswagen', model: 'Amarok', year: 2025, version: 'V6 Highline AT',
    price: 58000, category: 'pickup', fuel: 'diesel', transmission: 'automatica',
    engine: '3.0L V6 TDI', horsepower: 258,
    color_options: 'Blanco, Negro, Gris Indio, Azul Starlight',
    features: '- Pantalla 12"\n- Asientos ventilados\n- Camara 360\n- Matrix LED\n- Diferencial trasero bloqueante\n- Navegacion GPS'
  },
  {
    brand: 'Volkswagen', model: 'Polo', year: 2025, version: 'Track TSI AT',
    price: 23000, category: 'hatchback', fuel: 'nafta', transmission: 'automatica',
    engine: '1.0L TSI Turbo', horsepower: 116,
    color_options: 'Blanco, Negro, Rojo, Azul, Plata',
    features: '- VW Play 8"\n- Climatizador automatico\n- 6 airbags\n- Sensor de lluvia\n- Control de crucero\n- Faros LED'
  },
  // Chevrolet
  {
    brand: 'Chevrolet', model: 'Tracker', year: 2025, version: 'Premier AT',
    price: 36500, category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.2L Turbo', horsepower: 133,
    color_options: 'Blanco, Negro, Gris, Rojo, Azul',
    features: '- MyLink 8"\n- Wi-Fi integrado\n- Alerta de colision frontal\n- 6 airbags\n- OnStar\n- Camara de retroceso'
  },
  {
    brand: 'Chevrolet', model: 'Cruze', year: 2025, version: 'Premier AT',
    price: 33500, category: 'sedan', fuel: 'nafta', transmission: 'automatica',
    engine: '1.4L Turbo', horsepower: 153,
    color_options: 'Blanco, Negro, Gris, Rojo Royale',
    features: '- MyLink 8"\n- Apple CarPlay / Android Auto\n- Asientos de cuero\n- Sensor de estacionamiento\n- 6 airbags\n- Alerta de cambio de carril'
  },
  {
    brand: 'Chevrolet', model: 'S10', year: 2025, version: 'High Country 4x4 AT',
    price: 54000, category: 'pickup', fuel: 'diesel', transmission: 'automatica',
    engine: '2.8L Duramax Diesel', horsepower: 200,
    color_options: 'Blanco, Negro, Gris Satin, Azul',
    features: '- MyLink 9"\n- Asientos de cuero\n- Camara de retroceso\n- Hill Descent\n- 6 airbags\n- Diferencial bloqueante'
  },
  // Ford
  {
    brand: 'Ford', model: 'Ranger', year: 2025, version: 'Limited 4x4 AT',
    price: 56000, category: 'pickup', fuel: 'diesel', transmission: 'automatica',
    engine: '3.0L V6 Turbo Diesel', horsepower: 250,
    color_options: 'Blanco, Negro, Gris, Azul Lightning',
    features: '- SYNC 4 - Pantalla 12"\n- Camara 360\n- Asistente de remolque\n- 8 airbags\n- Matrix LED\n- Modos de conduccion'
  },
  {
    brand: 'Ford', model: 'Territory', year: 2025, version: 'Titanium AT',
    price: 37000, category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.5L Turbo EcoBoost', horsepower: 143,
    color_options: 'Blanco, Negro, Gris, Azul',
    features: '- SYNC 3 - Pantalla 10"\n- Techo panoramico\n- Butaca electrica\n- 6 airbags\n- Sensores de estacionamiento\n- Arranque sin llave'
  }
];

const insert = db.prepare(`
  INSERT INTO vehicles (brand, model, year, version, price, category, fuel, transmission, engine, horsepower, color_options, features)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((items) => {
  for (const v of items) {
    insert.run(v.brand, v.model, v.year, v.version, v.price, v.category, v.fuel, v.transmission, v.engine, v.horsepower, v.color_options, v.features);
  }
});

insertMany(vehicles);

console.log(`Insertados ${vehicles.length} vehiculos de ejemplo.\n`);

// Mostrar resumen
const summary = db.prepare(`
  SELECT brand, COUNT(*) as count FROM vehicles GROUP BY brand ORDER BY brand
`).all();

console.log('Resumen por marca:');
summary.forEach(s => {
  console.log(`  ${s.brand}: ${s.count} modelos`);
});

console.log('\nDatos de ejemplo cargados exitosamente.');
console.log('Ejecuta "npm start" para iniciar el bot.');
