/**
 * Format currency in Indian Rupees
 */
export function formatINR(amount) {
  if (typeof amount !== 'number') return '₹0';
  return '₹' + amount.toLocaleString('en-IN');
}

/**
 * Format USD
 */
export function formatUSD(amount) {
  if (typeof amount !== 'number') return '$0';
  return '$' + amount.toLocaleString('en-US');
}

/**
 * Format RAM spec
 */
export function formatRAM(ram) {
  if (!ram) return 'N/A';
  return `${ram.capacityGB}GB ${ram.type || ''}`.trim();
}

/**
 * Format Storage spec
 */
export function formatStorage(storage) {
  if (!storage) return 'N/A';
  const size = storage.capacityGB >= 1024 ? `${storage.capacityGB / 1024}TB` : `${storage.capacityGB}GB`;
  return `${size} SSD`;
}
