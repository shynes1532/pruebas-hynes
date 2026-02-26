require('dotenv').config();
const { getDb, initialize } = require('./models/database');

async function main() {
await initialize();
const db = getDb();

console.log('Cargando catalogo FIAT - Liendo Automotores...\n');

// Limpiar tabla de vehículos
db.prepare('DELETE FROM vehicles').run();

const vehicles = [
  // MOBI
  {
    brand: 'FIAT', model: 'Mobi', year: 2026, version: 'Trekking 1.0',
    price: 26541725, currency: 'ARS', category: 'hatchback', fuel: 'nafta', transmission: 'manual',
    engine: '1.0L 3 cilindros', horsepower: 75,
    color_options: 'Consultar colores disponibles',
    features: '- Aire acondicionado\n- Direccion asistida\n- Cierre centralizado\n- Alzacristales electricos\n- Radio con Bluetooth y USB\n- Barras de techo'
  },
  // ARGO
  {
    brand: 'FIAT', model: 'Argo', year: 2026, version: 'Drive 1.3L MT',
    price: 29055824, currency: 'ARS', category: 'hatchback', fuel: 'nafta', transmission: 'manual',
    engine: '1.3L Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 7"\n- Apple CarPlay / Android Auto\n- Aire acondicionado\n- 4 airbags\n- Control de estabilidad\n- Sensor de retroceso'
  },
  {
    brand: 'FIAT', model: 'Argo', year: 2026, version: 'Drive 1.3L CVT',
    price: 31569922, currency: 'ARS', category: 'hatchback', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 7"\n- Apple CarPlay / Android Auto\n- Transmision CVT\n- 4 airbags\n- Control de estabilidad\n- Sensor de retroceso'
  },
  // CRONOS
  {
    brand: 'FIAT', model: 'Cronos', year: 2026, version: 'Stile 1.3 GSE MY23',
    price: 26100680, currency: 'ARS', category: 'sedan', fuel: 'nafta', transmission: 'manual',
    engine: '1.3L GSE Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Aire acondicionado\n- Direccion asistida\n- Radio con Bluetooth\n- 2 airbags\n- Cierre centralizado\n- Baul 525 litros'
  },
  {
    brand: 'FIAT', model: 'Cronos', year: 2026, version: 'Like 1.3 GSE',
    price: 30178786, currency: 'ARS', category: 'sedan', fuel: 'nafta', transmission: 'manual',
    engine: '1.3L GSE Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 7"\n- Apple CarPlay / Android Auto\n- Aire acondicionado\n- 4 airbags\n- Control de estabilidad\n- Baul 525 litros'
  },
  {
    brand: 'FIAT', model: 'Cronos', year: 2026, version: 'Drive 1.3 GSE Pack Plus',
    price: 35812288, currency: 'ARS', category: 'sedan', fuel: 'nafta', transmission: 'manual',
    engine: '1.3L GSE Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 7"\n- Apple CarPlay / Android Auto\n- Camara de retroceso\n- 4 airbags\n- Control de crucero\n- Llantas de aleacion\n- Baul 525 litros'
  },
  {
    brand: 'FIAT', model: 'Cronos', year: 2026, version: 'Drive 1.3L GSE CVT Pack Plus',
    price: 36015797, currency: 'ARS', category: 'sedan', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L GSE Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 7"\n- Apple CarPlay / Android Auto\n- Transmision CVT\n- Camara de retroceso\n- 4 airbags\n- Control de crucero\n- Llantas de aleacion'
  },
  {
    brand: 'FIAT', model: 'Cronos', year: 2026, version: 'Precision 1.3 GSE CVT',
    price: 37273853, currency: 'ARS', category: 'sedan', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L GSE Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 7"\n- Apple CarPlay / Android Auto\n- Transmision CVT\n- Camara de retroceso\n- 6 airbags\n- Climatizador automatico\n- Llantas de aleacion R16\n- Tapizado de cuero'
  },
  // PULSE
  {
    brand: 'FIAT', model: 'Pulse', year: 2026, version: 'Drive 1.3L MT',
    price: 35488523, currency: 'ARS', category: 'suv', fuel: 'nafta', transmission: 'manual',
    engine: '1.3L Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 8.4"\n- Apple CarPlay / Android Auto inalambrico\n- Camara de retroceso\n- 4 airbags\n- Control de estabilidad\n- Sensor de lluvia'
  },
  {
    brand: 'FIAT', model: 'Pulse', year: 2026, version: 'Drive 1.3L CVT',
    price: 36691077, currency: 'ARS', category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 8.4"\n- Apple CarPlay / Android Auto inalambrico\n- Transmision CVT\n- Camara de retroceso\n- 4 airbags\n- Control de estabilidad'
  },
  {
    brand: 'FIAT', model: 'Pulse', year: 2026, version: 'Audace 1.0T CVT',
    price: 39540204, currency: 'ARS', category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.0L Turbo 200', horsepower: 130,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 10.1"\n- Cluster digital 7"\n- Apple CarPlay / Android Auto inalambrico\n- 6 airbags\n- Faros LED\n- Llantas R17\n- Techo bicolor'
  },
  {
    brand: 'FIAT', model: 'Pulse', year: 2026, version: 'Impetus 1.0T CVT',
    price: 41204373, currency: 'ARS', category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.0L Turbo 200', horsepower: 130,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 10.1"\n- Cluster digital 7"\n- Apple CarPlay / Android Auto inalambrico\n- 6 airbags\n- Faros Full LED\n- Llantas R17\n- Climatizador digital\n- Tapizado de cuero'
  },
  {
    brand: 'FIAT', model: 'Pulse', year: 2026, version: 'Abarth Turbo 270 AT6',
    price: 43145099, currency: 'ARS', category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Turbo 270', horsepower: 185,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 10.1"\n- Cluster digital 7"\n- Motor Turbo 270\n- Caja AT6\n- 6 airbags\n- Suspension deportiva\n- Escape deportivo\n- Llantas R17 Abarth'
  },
  {
    brand: 'FIAT', model: 'Pulse', year: 2026, version: 'Abarth T270 Stranger Things',
    price: 43266395, currency: 'ARS', category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Turbo 270', horsepower: 185,
    color_options: 'Edicion especial Stranger Things',
    features: '- Edicion limitada Stranger Things\n- Pantalla tactil 10.1"\n- Motor Turbo 270\n- Caja AT6\n- 6 airbags\n- Detalles exclusivos\n- Suspension deportiva'
  },
  // FASTBACK
  {
    brand: 'FIAT', model: 'Fastback', year: 2026, version: 'Turbo 270 AT6',
    price: 43882202, currency: 'ARS', category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Turbo 270', horsepower: 185,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 10.1"\n- Cluster digital 7"\n- Motor Turbo 270\n- Caja AT6\n- 6 airbags\n- Techo solar\n- Faros Full LED\n- Llantas R17\n- Asientos de cuero'
  },
  {
    brand: 'FIAT', model: 'Fastback', year: 2026, version: 'Abarth Turbo 270 AT6',
    price: 47763654, currency: 'ARS', category: 'suv', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Turbo 270', horsepower: 185,
    color_options: 'Consultar colores disponibles',
    features: '- Pantalla tactil 10.1"\n- Cluster digital 7"\n- Motor Turbo 270 Abarth\n- Caja AT6\n- 6 airbags\n- Suspension deportiva\n- Escape deportivo\n- Llantas R18 Abarth\n- Techo solar'
  },
  // FIAT 600
  {
    brand: 'FIAT', model: '600', year: 2026, version: 'MHEV 1.2 AT',
    price: 49676388, currency: 'ARS', category: 'suv', fuel: 'hibrido', transmission: 'automatica',
    engine: '1.2L MHEV Hibrido', horsepower: 136,
    color_options: 'Consultar colores disponibles',
    features: '- Motor hibrido MHEV\n- Pantalla tactil 10.25"\n- Cluster digital 7"\n- 6 airbags\n- Faros Full LED\n- ADAS\n- Carga inalambrica\n- Climatizador bizona'
  },
  // FIORINO
  {
    brand: 'FIAT', model: 'Fiorino', year: 2026, version: 'Endurance 1.4 MT5',
    price: 31384446, currency: 'ARS', category: 'van', fuel: 'nafta', transmission: 'manual',
    engine: '1.4L Fire Evo', horsepower: 88,
    color_options: 'Blanco',
    features: '- Capacidad de carga 650 kg\n- Volumen de carga 3.050 litros\n- Puerta lateral corrediza\n- Puertas traseras batientes\n- Aire acondicionado\n- Direccion asistida'
  },
  // STRADA
  {
    brand: 'FIAT', model: 'Strada', year: 2026, version: 'Freedom C/S 1.3 MT',
    price: 35039391, currency: 'ARS', category: 'pickup', fuel: 'nafta', transmission: 'manual',
    engine: '1.3L Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Cabina simple\n- Pantalla tactil 7"\n- Aire acondicionado\n- 2 airbags\n- Capacidad de carga 720 kg\n- Barras de techo'
  },
  {
    brand: 'FIAT', model: 'Strada', year: 2026, version: 'Freedom 1.3 8V CD',
    price: 39783693, currency: 'ARS', category: 'pickup', fuel: 'nafta', transmission: 'manual',
    engine: '1.3L Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Cabina doble\n- Pantalla tactil 7"\n- Apple CarPlay / Android Auto\n- 4 airbags\n- Capacidad de carga 650 kg\n- Control de estabilidad'
  },
  {
    brand: 'FIAT', model: 'Strada', year: 2026, version: 'Volcano 1.3 8V CD CVT',
    price: 44263291, currency: 'ARS', category: 'pickup', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Firefly', horsepower: 99,
    color_options: 'Consultar colores disponibles',
    features: '- Cabina doble\n- Pantalla tactil 7"\n- Transmision CVT\n- Apple CarPlay / Android Auto\n- 4 airbags\n- Llantas de aleacion\n- Camara de retroceso'
  },
  {
    brand: 'FIAT', model: 'Strada', year: 2026, version: 'Ranch T200 CD CVT',
    price: 47734979, currency: 'ARS', category: 'pickup', fuel: 'nafta', transmission: 'automatica',
    engine: '1.0L Turbo 200', horsepower: 130,
    color_options: 'Consultar colores disponibles',
    features: '- Cabina doble\n- Motor Turbo 200\n- Transmision CVT\n- Pantalla 8.4"\n- 6 airbags\n- Llantas R16\n- Camara de retroceso\n- Barras de techo'
  },
  {
    brand: 'FIAT', model: 'Strada', year: 2026, version: 'Ultra 1.0T 12V CD CVT',
    price: 47867331, currency: 'ARS', category: 'pickup', fuel: 'nafta', transmission: 'automatica',
    engine: '1.0L Turbo 200', horsepower: 130,
    color_options: 'Consultar colores disponibles',
    features: '- Cabina doble\n- Motor Turbo 200\n- Transmision CVT\n- Pantalla 8.4"\n- 6 airbags\n- Faros LED\n- Llantas R16 diamantadas\n- Tapizado premium'
  },
  // TORO
  {
    brand: 'FIAT', model: 'Toro', year: 2026, version: 'Freedom T270 AT6 4x2',
    price: 49740618, currency: 'ARS', category: 'pickup', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Turbo 270', horsepower: 185,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo 270\n- Caja AT6\n- Pantalla 8.4"\n- 6 airbags\n- Control de traccion\n- Capacidad de carga 1.000 kg\n- Gancho de remolque'
  },
  {
    brand: 'FIAT', model: 'Toro', year: 2026, version: 'Volcano T270 AT6 4x2',
    price: 55421563, currency: 'ARS', category: 'pickup', fuel: 'nafta', transmission: 'automatica',
    engine: '1.3L Turbo 270', horsepower: 185,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo 270\n- Caja AT6\n- Pantalla 10.1"\n- 6 airbags\n- Llantas R18\n- Asientos de cuero\n- Climatizador digital bizona\n- Camara de retroceso'
  },
  {
    brand: 'FIAT', model: 'Toro', year: 2026, version: 'Volcano TD350 AT9 4x4',
    price: 59616096, currency: 'ARS', category: 'pickup', fuel: 'diesel', transmission: 'automatica',
    engine: '2.0L Turbo Diesel 350', horsepower: 170,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo Diesel 350\n- Caja AT9 de 9 marchas\n- Traccion 4x4\n- Pantalla 10.1"\n- 6 airbags\n- Llantas R18\n- Asientos de cuero\n- Modos de conduccion'
  },
  {
    brand: 'FIAT', model: 'Toro', year: 2026, version: 'Ultra TD350 AT9 4x4',
    price: 66040247, currency: 'ARS', category: 'pickup', fuel: 'diesel', transmission: 'automatica',
    engine: '2.0L Turbo Diesel 350', horsepower: 170,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo Diesel 350\n- Caja AT9 de 9 marchas\n- Traccion 4x4\n- Pantalla 10.1"\n- Cluster digital 7"\n- 6 airbags\n- Techo solar\n- Asientos de cuero ventilados\n- ADAS completo'
  },
  // TITANO
  {
    brand: 'FIAT', model: 'Titano', year: 2026, version: 'Endurance MT 4x2',
    price: 52530186, currency: 'ARS', category: 'pickup', fuel: 'diesel', transmission: 'manual',
    engine: '2.2L Turbo Diesel', horsepower: 200,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo Diesel 2.2L\n- Traccion 4x2\n- Pantalla 8"\n- 6 airbags\n- Capacidad de carga 1.100 kg\n- Control de estabilidad\n- Aire acondicionado'
  },
  {
    brand: 'FIAT', model: 'Titano', year: 2026, version: 'Endurance MT 4x4',
    price: 55513191, currency: 'ARS', category: 'pickup', fuel: 'diesel', transmission: 'manual',
    engine: '2.2L Turbo Diesel', horsepower: 200,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo Diesel 2.2L\n- Traccion 4x4\n- Pantalla 8"\n- 6 airbags\n- Capacidad de carga 1.100 kg\n- Reductora\n- Diferencial trasero bloqueante'
  },
  {
    brand: 'FIAT', model: 'Titano', year: 2026, version: 'Freedom MT 4x4',
    price: 60990518, currency: 'ARS', category: 'pickup', fuel: 'diesel', transmission: 'manual',
    engine: '2.2L Turbo Diesel', horsepower: 200,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo Diesel 2.2L\n- Traccion 4x4\n- Pantalla 10.1"\n- 6 airbags\n- Llantas de aleacion R17\n- Camara de retroceso\n- Control de crucero\n- Reductora'
  },
  {
    brand: 'FIAT', model: 'Titano', year: 2026, version: 'Freedom Plus AT 4x4',
    price: 66834357, currency: 'ARS', category: 'pickup', fuel: 'diesel', transmission: 'automatica',
    engine: '2.2L Turbo Diesel', horsepower: 200,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo Diesel 2.2L\n- Caja automatica 6AT\n- Traccion 4x4\n- Pantalla 10.1"\n- 6 airbags\n- Llantas R17\n- Asientos de cuero\n- ADAS\n- Reductora'
  },
  {
    brand: 'FIAT', model: 'Titano', year: 2026, version: 'Ranch AT 4x4',
    price: 72057161, currency: 'ARS', category: 'pickup', fuel: 'diesel', transmission: 'automatica',
    engine: '2.2L Turbo Diesel', horsepower: 200,
    color_options: 'Consultar colores disponibles',
    features: '- Motor Turbo Diesel 2.2L\n- Caja automatica 6AT\n- Traccion 4x4\n- Pantalla 10.1"\n- Cluster digital\n- 6 airbags\n- Llantas R18\n- Asientos de cuero ventilados\n- Techo solar\n- ADAS completo\n- Diferencial bloqueante'
  }
];

const insert = db.prepare(`
  INSERT INTO vehicles (brand, model, year, version, price, currency, category, fuel, transmission, engine, horsepower, color_options, features)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((items) => {
  for (const v of items) {
    insert.run(v.brand, v.model, v.year, v.version, v.price, v.currency, v.category, v.fuel, v.transmission, v.engine, v.horsepower, v.color_options, v.features);
  }
});

insertMany(vehicles);

console.log(`Insertados ${vehicles.length} vehiculos FIAT.\n`);

// Mostrar resumen
const summary = db.prepare(`
  SELECT model, COUNT(*) as count, MIN(price) as min_price, MAX(price) as max_price
  FROM vehicles GROUP BY model ORDER BY min_price
`).all();

console.log('Catalogo FIAT - Liendo Automotores:');
summary.forEach(s => {
  const minP = (s.min_price / 1000000).toFixed(1);
  const maxP = (s.max_price / 1000000).toFixed(1);
  const range = s.count > 1 ? `$${minP}M - $${maxP}M (${s.count} versiones)` : `$${minP}M`;
  console.log(`  FIAT ${s.model}: ${range}`);
});

console.log('\nDatos cargados exitosamente.');
console.log('Ejecuta "npm start" para iniciar el bot.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
