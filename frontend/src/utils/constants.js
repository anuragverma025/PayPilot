export const WORKFLOW_STEPS = [
  { id: 'needs', label: 'Understand needs', number: 1 },
  { id: 'match', label: 'Match products', number: 2 },
  { id: 'compare', label: 'Compare options', number: 3 },
  { id: 'review', label: 'Review order', number: 4 },
  { id: 'checkout', label: 'Checkout', number: 5 }
];

export const EXAMPLE_QUERIES = [
  {
    label: '🤖 Coding & AI under ₹75,000',
    prompt: 'I need a laptop for CS coding and AI projects under ₹75,000 with 16GB RAM and dedicated NVIDIA GPU',
    search: '',
    maxBudget: 75000,
    minRam: 16,
    gpuType: 'dedicated',
    targetUseCase: 'ai-ml'
  },
  {
    label: '🔋 Long Battery for College (< ₹60k)',
    prompt: 'Looking for a college laptop under ₹60,000 with 16GB RAM, fast CPU, and 10+ hours battery life',
    search: '',
    maxBudget: 60000,
    minRam: 16,
    gpuType: 'integrated',
    prioritizeBattery: true
  },
  {
    label: '🎓 Budget CS Student (< ₹40k)',
    prompt: 'Affordable programming laptop under ₹40,000 for daily coursework with SSD',
    search: '',
    maxBudget: 40000,
    minRam: 8,
    gpuType: 'any'
  },
  {
    label: '🔧 Upgradable RAM (< ₹80k)',
    prompt: 'Find a development laptop under ₹80,000 with user-upgradable SO-DIMM RAM slots and multi-core CPU',
    search: '',
    maxBudget: 80000,
    minRam: 16,
    upgradableOnly: true
  },
  {
    label: '⚡ Test Clarification Dialog',
    prompt: 'I want to buy a good laptop',
    search: '',
    maxBudget: 85000,
    minRam: 8
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
