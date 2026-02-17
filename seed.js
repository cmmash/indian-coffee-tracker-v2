const fs = require('fs').promises;
const path = require('path');
const { Coffee, PriceHistory, initializeDatabase } = require('./db');

async function seedDatabase() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    
    console.log('Reading seed data...');
    const seedDataPath = path.join(__dirname, 'seed-data.json');
    const seedDataRaw = await fs.readFile(seedDataPath, 'utf-8');
    const seedData = JSON.parse(seedDataRaw);
    
    if (!seedData.coffees || !Array.isArray(seedData.coffees)) {
      throw new Error('Invalid seed data format. Expected { coffees: [...] }');
    }
    
    console.log(`Found ${seedData.coffees.length} coffees to seed...`);
    
    console.log('Clearing existing data...');
    await PriceHistory.destroy({ where: {}, truncate: true, cascade: true });
    await Coffee.destroy({ where: {}, truncate: true, cascade: true });
    
    console.log('Seeding coffees and price history...');
    
    for (const coffeeData of seedData.coffees) {
      const { priceHistory, ...coffeeFields } = coffeeData;
      
      const coffee = await Coffee.create(coffeeFields);
      console.log(`Created coffee: ${coffee.name}`);
      
      if (priceHistory && Array.isArray(priceHistory) && priceHistory.length > 0) {
        const priceHistoryRecords = priceHistory.map(ph => ({
          coffeeId: coffee.id,
          price: ph.price,
          effectiveDate: ph.effectiveDate || new Date()
        }));
        
        await PriceHistory.bulkCreate(priceHistoryRecords);
        console.log(`  Added ${priceHistoryRecords.length} price history records`);
      } else {
        await PriceHistory.create({
          coffeeId: coffee.id,
          price: coffee.currentPrice,
          effectiveDate: new Date()
        });
        console.log(`  Created initial price history record`);
      }
    }
    
    const totalCoffees = await Coffee.count();
    const totalPriceHistory = await PriceHistory.count();
    
    console.log('\n=== Seeding Complete ===');
    console.log(`Total coffees: ${totalCoffees}`);
    console.log(`Total price history records: ${totalPriceHistory}`);
    console.log('Database seeded successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };