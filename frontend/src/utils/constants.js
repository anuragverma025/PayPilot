export const WORKFLOW_STEPS = [
  { id: 'needs', label: 'Understand needs', number: 1 },
  { id: 'match', label: 'Match products', number: 2 },
  { id: 'compare', label: 'Compare options', number: 3 },
  { id: 'review', label: 'Review order', number: 4 },
  { id: 'checkout', label: 'Checkout', number: 5 }
];

export const EXAMPLE_QUERIES = [
  {
    label: 'Coding & AI under ₹75,000',
    search: '',
    maxBudget: 75000,
    minRam: 16,
    gpuType: 'dedicated',
    targetUseCase: 'ai-ml'
  },
  {
    label: 'Long battery for college under ₹60,000',
    search: '',
    maxBudget: 60000,
    minRam: 16,
    gpuType: 'integrated',
    prioritizeBattery: true
  },
  {
    label: 'Budget CS student pick under ₹40,000',
    search: '',
    maxBudget: 40000,
    minRam: 8,
    gpuType: 'any'
  },
  {
    label: 'Max RAM & Upgradability under ₹80,000',
    search: '',
    maxBudget: 80000,
    minRam: 16,
    upgradableOnly: true
  }
];

export const BRAND_OPTIONS = [
  'All',
  'Lenovo',
  'Acer',
  'ASUS',
  'HP',
  'Apple',
  'Dell',
  'MSI',
  'Samsung',
  'Framework'
];
