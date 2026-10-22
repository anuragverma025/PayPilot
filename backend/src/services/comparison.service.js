import { CatalogService } from './catalog.service.js';

export class ComparisonService {
  /**
   * Compare 2 or 3 products side-by-side
   * @param {string[]} productIds - Array of 2 to 3 product IDs
   */
  static async compareProducts(productIds) {
    if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 3) {
      throw new Error('Comparison requires between 2 and 3 product IDs');
    }

    const products = [];
    for (const id of productIds) {
      const product = await CatalogService.getProductById(id);
      if (!product) {
        throw new Error(`Product with ID '${id}' was not found in catalog`);
      }
      products.push(product);
    }

    // Spec Matrix Rows
    const matrix = [
      {
        attribute: 'Price (INR)',
        key: 'priceINR',
        values: products.map((p) => `₹${p.priceINR.toLocaleString('en-IN')}`),
        bestIndex: products.reduce((minIdx, p, idx, arr) => (p.priceINR < arr[minIdx].priceINR ? idx : minIdx), 0)
      },
      {
        attribute: 'Processor (CPU)',
        key: 'processor',
        values: products.map((p) => `${p.processor.brand} ${p.processor.model} (${p.processor.cores} cores)`),
        bestIndex: null
      },
      {
        attribute: 'RAM Memory',
        key: 'ram',
        values: products.map((p) => `${p.ram.capacityGB}GB ${p.ram.type}`),
        bestIndex: products.reduce((maxIdx, p, idx, arr) => (p.ram.capacityGB > arr[maxIdx].ram.capacityGB ? idx : maxIdx), 0)
      },
      {
        attribute: 'RAM Upgradability',
        key: 'ramUpgradability',
        values: products.map((p) => (p.ram.isUpgradable ? `Upgradable (up to ${p.ram.maxSupportedGB}GB)` : 'Soldered (Non-upgradable)')),
        bestIndex: null
      },
      {
        attribute: 'Storage',
        key: 'storage',
        values: products.map((p) => `${p.storage.capacityGB >= 1024 ? '1TB' : p.storage.capacityGB + 'GB'} ${p.storage.type}`),
        bestIndex: products.reduce((maxIdx, p, idx, arr) => (p.storage.capacityGB > arr[maxIdx].storage.capacityGB ? idx : maxIdx), 0)
      },
      {
        attribute: 'Display',
        key: 'display',
        values: products.map((p) => `${p.display.sizeInches}" ${p.display.resolution} (${p.display.refreshRateHz}Hz)`),
        bestIndex: null
      },
      {
        attribute: 'GPU (Graphics)',
        key: 'gpu',
        values: products.map((p) => (p.gpu.type === 'dedicated' ? `${p.gpu.model} (${p.gpu.vramGB}GB VRAM)` : `${p.gpu.model} (Integrated)`)),
        bestIndex: products.findIndex((p) => p.gpu.type === 'dedicated') !== -1 
          ? products.reduce((maxIdx, p, idx, arr) => (p.gpu.vramGB > arr[maxIdx].gpu.vramGB ? idx : maxIdx), 0) 
          : null
      },
      {
        attribute: 'Real-world Battery',
        key: 'battery',
        values: products.map((p) => `~${p.battery.realWorldHoursEstimate} hrs (${p.battery.capacityWattHours}Wh)`),
        bestIndex: products.reduce((maxIdx, p, idx, arr) => (p.battery.realWorldHoursEstimate > arr[maxIdx].battery.realWorldHoursEstimate ? idx : maxIdx), 0)
      },
      {
        attribute: 'Chassis Weight',
        key: 'weightKg',
        values: products.map((p) => `${p.weightKg} kg`),
        bestIndex: products.reduce((minIdx, p, idx, arr) => (p.weightKg < arr[minIdx].weightKg ? idx : minIdx), 0)
      },
      {
        attribute: 'Operating System',
        key: 'os',
        values: products.map((p) => p.os),
        bestIndex: null
      }
    ];

    // Compute key difference summary bullets
    const differences = [];
    const minPriceProd = products.reduce((min, p) => (p.priceINR < min.priceINR ? p : min), products[0]);
    const maxPriceProd = products.reduce((max, p) => (p.priceINR > max.priceINR ? p : max), products[0]);

    if (maxPriceProd.id !== minPriceProd.id) {
      const priceDiff = maxPriceProd.priceINR - minPriceProd.priceINR;
      differences.push({
        aspect: 'Price Difference',
        detail: `${minPriceProd.name} is ₹${priceDiff.toLocaleString('en-IN')} more affordable than ${maxPriceProd.name}.`
      });
    }

    // Check GPU divergence
    const hasDedicated = products.filter((p) => p.gpu.type === 'dedicated');
    const hasIntegrated = products.filter((p) => p.gpu.type === 'integrated');
    if (hasDedicated.length > 0 && hasIntegrated.length > 0) {
      differences.push({
        aspect: 'Compute & AI Capability',
        detail: `${hasDedicated.map((p) => p.name).join(', ')} has dedicated NVIDIA graphics for local ML & CUDA, while ${hasIntegrated.map((p) => p.name).join(', ')} relies on integrated graphics.`
      });
    }

    // Check RAM upgradeability
    const upgradableProds = products.filter((p) => p.ram.isUpgradable);
    const solderedProds = products.filter((p) => !p.ram.isUpgradable);
    if (upgradableProds.length > 0 && solderedProds.length > 0) {
      differences.push({
        aspect: 'Upgradability',
        detail: `${upgradableProds.map((p) => p.name).join(', ')} allows future RAM expansion, whereas ${solderedProds.map((p) => p.name).join(', ')} has permanent soldered RAM.`
      });
    }

    // Portability comparison
    const lightestProd = products.reduce((light, p) => (p.weightKg < light.weightKg ? p : light), products[0]);
    const heaviestProd = products.reduce((heavy, p) => (p.weightKg > heavy.weightKg ? p : heavy), products[0]);
    if (heaviestProd.weightKg - lightestProd.weightKg >= 0.5) {
      differences.push({
        aspect: 'Portability',
        detail: `${lightestProd.name} (${lightestProd.weightKg}kg) is significantly lighter for daily campus travel than ${heaviestProd.name} (${heaviestProd.weightKg}kg).`
      });
    }

    return {
      products,
      matrix,
      differences,
      verdict: {
        budgetWinner: minPriceProd.id,
        batteryWinner: products.reduce((max, p) => (p.battery.realWorldHoursEstimate > max.battery.realWorldHoursEstimate ? p : max), products[0]).id,
        lightestPick: lightestProd.id
      }
    };
  }
}
