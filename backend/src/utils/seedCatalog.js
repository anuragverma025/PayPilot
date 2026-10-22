import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Product } from '../models/Product.js';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataPath = path.resolve(__dirname, '../data/sampleLaptops.json');

export async function seedCatalog() {
  console.log('--- PayPilot Catalog Seeder ---');
  try {
    console.log(`Connecting to MongoDB at: ${config.mongoUri}...`);
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB successfully.');

    const raw = fs.readFileSync(sampleDataPath, 'utf8');
    const laptops = JSON.parse(raw);
    console.log(`Loaded ${laptops.length} sample laptops from local data file.`);

    console.log('Synchronizing catalog collection in database...');
    // Upsert each item by unique id
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of laptops) {
      const result = await Product.updateOne(
        { id: item.id },
        { $set: item },
        { upsert: true }
      );
      if (result.upsertedCount > 0) insertedCount++;
      else if (result.modifiedCount > 0) updatedCount++;
    }

    console.log(`Seeding complete. New: ${insertedCount}, Updated: ${updatedCount}, Total: ${laptops.length}`);
  } catch (error) {
    console.warn(`[Notice] MongoDB connection could not be established (${error.message}).`);
    console.warn('PayPilot will seamlessly use the in-memory verified catalog file without error.');
  } finally {
    // Only disconnect if running directly as a standalone CLI script
    const isStandaloneScript = process.argv[1] === fileURLToPath(import.meta.url);
    if (isStandaloneScript && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
  }
}

// Run directly if called as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCatalog().then(() => process.exit(0));
}
