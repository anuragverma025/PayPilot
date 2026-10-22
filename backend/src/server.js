import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config/index.js';
import { seedCatalog } from './utils/seedCatalog.js';

async function startServer() {
  console.log(`Starting PayPilot Backend [${config.env}]...`);

  // Try connecting to MongoDB
  try {
    console.log(`Connecting to MongoDB at: ${config.mongoUri}...`);
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 4000 });
    console.log('MongoDB connection established successfully.');
    // Seed initial records if needed
    await seedCatalog();
  } catch (err) {
    console.warn(`[PayPilot Notice] MongoDB connection not available (${err.message}).`);
    console.warn('PayPilot is running seamlessly with verified in-memory fallback catalog data.');
  }

  // Start HTTP Server
  const server = app.listen(config.port, () => {
    console.log(`PayPilot API is active on port ${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/api/health`);
    console.log(`Products endpoint: http://localhost:${config.port}/api/products`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      console.log('PayPilot server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
