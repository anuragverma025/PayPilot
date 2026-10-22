import mongoose from 'mongoose';
import { CatalogService } from '../services/catalog.service.js';

export const getHealth = async (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const meta = await CatalogService.getCatalogMeta();

  res.status(200).json({
    status: 'ok',
    service: 'PayPilot Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      type: 'MongoDB',
      connected: isMongoConnected,
      mode: isMongoConnected ? 'database' : 'in-memory-fallback'
    },
    catalog: {
      category: meta.category,
      totalProducts: meta.totalProducts,
      isSampleData: meta.isSampleData,
      notice: meta.sampleDataNotice
    }
  });
};
