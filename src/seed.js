require('dotenv').config();
const { getDb, initialize } = require('./models/database');
const vehicles = require('./data/vehicles.json');

async function main() {
await initialize();
const db = getDb();

console.log('Cargando catalogo FIAT - Liendo Automotores...\n');

// Limpiar tabla de vehículos
db.prepare('DELETE FROM vehicles').run();

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
