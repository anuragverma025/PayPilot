const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Helper to perform API requests with structured error handling
 */
async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = json?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.details = json?.error?.details || null;
      throw error;
    }

    return json;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Unable to connect to PayPilot backend at ${API_BASE_URL}. Ensure the server is running.`);
    }
    throw err;
  }
}

export const api = {
  /**
   * Health check and metadata
   */
  getHealth: () => fetchJson('/health'),

  /**
   * Fetch products with query filters
   */
  getProducts: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.maxBudget) params.append('maxBudget', filters.maxBudget);
    if (filters.minBudget) params.append('minBudget', filters.minBudget);
    if (filters.minRam) params.append('minRam', filters.minRam);
    if (filters.brand && filters.brand !== 'All') params.append('brand', filters.brand);
    if (filters.gpuType && filters.gpuType !== 'any') params.append('gpuType', filters.gpuType);
    if (filters.upgradableOnly) params.append('upgradableOnly', 'true');
    if (filters.sortBy) params.append('sortBy', filters.sortBy);

    const qs = params.toString();
    return fetchJson(`/products${qs ? `?${qs}` : ''}`);
  },

  /**
   * Fetch product by id
   */
  getProductById: (id) => fetchJson(`/products/${id}`),

  /**
   * Fetch catalog metadata
   */
  getCatalogMeta: () => fetchJson('/products/meta'),

  /**
   * Rank products deterministically based on requirements
   */
  rankProducts: (requirements) =>
    fetchJson('/products/rank', {
      method: 'POST',
      body: JSON.stringify(requirements)
    }),

  /**
   * Compare 2 or 3 products
   */
  compareProducts: (productIds) =>
    fetchJson('/compare', {
      method: 'POST',
      body: JSON.stringify({ productIds })
    }),

  /**
   * Ask the AI Shopping Assistant for a grounded Shopping Decision Report
   */
  askAssistant: (message) =>
    fetchJson('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    })
};
