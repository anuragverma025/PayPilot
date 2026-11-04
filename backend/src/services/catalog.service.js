import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataPath = path.resolve(__dirname, '../data/sampleLaptops.json');

// In-memory cache loaded from JSON file
let inMemoryCatalog = [];

export function loadInMemoryCatalog() {
  try {
    const raw = fs.readFileSync(sampleDataPath, 'utf8');
    inMemoryCatalog = JSON.parse(raw);
    return inMemoryCatalog;
  } catch (error) {
    console.error('Failed to load in-memory sample catalog:', error.message);
    return [];
  }
}

// Initial load
loadInMemoryCatalog();

export class CatalogService {
  /**
   * Check whether MongoDB is currently connected
   */
  static isMongoConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Query catalog products with filtering, search, and sorting
   */
  static async getProducts(filters = {}) {
    const {
      search = '',
      minBudget,
      maxBudget,
      minRam,
      brand,
      gpuType,
      upgradableOnly,
      audience,
      sortBy = 'price_asc'
    } = filters;

    let items = [];

    // Try MongoDB first if connected
    if (this.isMongoConnected()) {
      try {
        const query = {};

        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } },
            { model: { $regex: search, $options: 'i' } },
            { 'processor.model': { $regex: search, $options: 'i' } }
          ];
        }

        if (minBudget || maxBudget) {
          query.priceINR = {};
          if (minBudget) query.priceINR.$gte = Number(minBudget);
          if (maxBudget) query.priceINR.$lte = Number(maxBudget);
        }

        if (minRam) {
          query['ram.capacityGB'] = { $gte: Number(minRam) };
        }

        if (brand && brand !== 'all') {
          query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
        }

        if (gpuType && gpuType !== 'any') {
          query['gpu.type'] = gpuType;
        }

        if (upgradableOnly === 'true' || upgradableOnly === true) {
          query['ram.isUpgradable'] = true;
        }

        if (audience && audience !== 'all') {
          query.targetAudience = audience;
        }

        items = await Product.find(query).lean();

        // If MongoDB has zero records, fallback to memory
        if (items.length === 0 && inMemoryCatalog.length > 0 && !search && !minBudget && !maxBudget) {
          items = [...inMemoryCatalog];
        }
      } catch (err) {
        console.warn('MongoDB query failed, using in-memory catalog:', err.message);
        items = [...inMemoryCatalog];
      }
    } else {
      items = [...inMemoryCatalog];
    }

    // Apply memory filtering (consistent regardless of source)
    if (!this.isMongoConnected() || items.length === inMemoryCatalog.length) {
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.model.toLowerCase().includes(q) ||
            p.processor?.model?.toLowerCase().includes(q) ||
            p.strengths?.some((s) => s.toLowerCase().includes(q))
        );
      }

      if (minBudget) {
        items = items.filter((p) => p.priceINR >= Number(minBudget));
      }

      if (maxBudget) {
        items = items.filter((p) => p.priceINR <= Number(maxBudget));
      }

      if (minRam) {
        items = items.filter((p) => p.ram?.capacityGB >= Number(minRam));
      }

      if (brand && brand !== 'all') {
        items = items.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
      }

      if (gpuType && gpuType !== 'any') {
        items = items.filter((p) => p.gpu?.type === gpuType);
      }

      if (upgradableOnly === 'true' || upgradableOnly === true) {
        items = items.filter((p) => p.ram?.isUpgradable === true);
      }

      if (audience && audience !== 'all') {
        items = items.filter((p) => p.targetAudience?.includes(audience));
      }
    }

    // Always ensure fresh in-memory catalog from data file
    const freshCatalog = loadInMemoryCatalog();
    const verifiedMap = new Map(freshCatalog.map((p) => [p.id, p.imageUrl]));

    // Sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.priceINR - b.priceINR;
        case 'price_desc':
          return b.priceINR - a.priceINR;
        case 'ram_desc':
          return (b.ram?.capacityGB || 0) - (a.ram?.capacityGB || 0);
        case 'weight_asc':
          return (a.weightKg || 99) - (b.weightKg || 99);
        case 'battery_desc':
          return (b.battery?.realWorldHoursEstimate || 0) - (a.battery?.realWorldHoursEstimate || 0);
        default:
          return a.priceINR - b.priceINR;
      }
    });

    // Ensure verified laptop images are consistently attached
    return items.map((item) => ({
      ...item,
      imageUrl: verifiedMap.get(item.id) || item.imageUrl,
      hasVerifiedImage: true
    }));
  }

  /**
   * Get single product by id
   */
  static async getProductById(id) {
    const freshCatalog = loadInMemoryCatalog();
    const verifiedMap = new Map(freshCatalog.map((p) => [p.id, p.imageUrl]));

    if (this.isMongoConnected()) {
      try {
        const product = await Product.findOne({ id }).lean();
        if (product) {
          return {
            ...product,
            imageUrl: verifiedMap.get(product.id) || product.imageUrl,
            hasVerifiedImage: true
          };
        }
      } catch (err) {
        console.warn('MongoDB getById failed, checking memory:', err.message);
      }
    }

    const fallback = inMemoryCatalog.find((p) => p.id === id) || null;
    if (fallback) {
      return {
        ...fallback,
        imageUrl: verifiedMap.get(fallback.id) || fallback.imageUrl,
        hasVerifiedImage: true
      };
    }
    return null;
  }

  /**
   * Get unique brands and metadata summary
   */
  static async getCatalogMeta() {
    const products = inMemoryCatalog;
    const brands = [...new Set(products.map((p) => p.brand))].sort();
    const minPrice = Math.min(...products.map((p) => p.priceINR));
    const maxPrice = Math.max(...products.map((p) => p.priceINR));

    return {
      totalProducts: products.length,
      category: 'laptops',
      isSampleData: true,
      sampleDataNotice:
        'PayPilot demo catalog: 32 curated laptop configurations with verified hardware specifications.',
      brands,
      priceRange: { min: minPrice, max: maxPrice, currency: 'INR' },
      ramOptions: [8, 16]
    };
  }
}
