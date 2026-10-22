import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.resolve(__dirname, '../data/sampleLaptops.json');

const list = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const additional = [
  {
    id: 'lap-framework-13',
    name: 'Framework Laptop 13 (Intel Core Ultra)',
    brand: 'Framework',
    model: 'Laptop 13 DIY / Pre-built Edition',
    priceINR: 108000,
    priceUSD: 1299,
    currency: 'INR',
    category: 'laptop',
    targetAudience: ['coding', 'college', 'everyday'],
    isSampleData: true,
    sampleDataNotice: 'Verified sample record compiled for PayPilot hackathon demonstration.',
    processor: {
      brand: 'Intel',
      model: 'Core Ultra 5 125H',
      cores: 14,
      threads: 18,
      baseClockGHz: 1.2,
      maxClockGHz: 4.5,
      tier: 'high'
    },
    ram: {
      capacityGB: 16,
      type: 'DDR5-5600 SO-DIMM',
      isUpgradable: true,
      maxSupportedGB: 96
    },
    storage: {
      capacityGB: 512,
      type: 'PCIe Gen4 NVMe SSD',
      isUpgradable: true,
      extraSlot: false
    },
    display: {
      sizeInches: 13.5,
      resolution: '2880x1920 (2.8K 3:2)',
      refreshRateHz: 120,
      brightnessNits: 500,
      panelType: 'Matte Anti-glare 100% sRGB'
    },
    gpu: {
      type: 'integrated',
      brand: 'Intel',
      model: 'Intel Arc Graphics',
      vramGB: 0
    },
    battery: {
      capacityWattHours: 61,
      claimedHours: 10,
      realWorldHoursEstimate: 7.5
    },
    weightKg: 1.3,
    os: 'Fedora / Ubuntu / Windows 11',
    keyboard: 'Modular Backlit Keyboard with captive screws',
    ports: ['4x Modular Expansion Cards (USB-C, USB-A, HDMI, MicroSD)', 'Audio Jack'],
    strengths: [
      'Unmatched right-to-repair: every single part is user-replaceable with QR code guides',
      'Modular swappable IO ports and up to 96GB DDR5 RAM upgrade capacity',
      'Superb 3:2 aspect ratio display designed specifically for reading code'
    ],
    tradeOffs: [
      'Import logistics and availability may be constrained compared to major OEMs',
      'Integrated GPU not suited for heavy local neural network training'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'lap-dell-inspiron-14-5430',
    name: 'Dell Inspiron 14 5430 (Core i7)',
    brand: 'Dell',
    model: 'Inspiron 14 5430 Platinum Silver',
    priceINR: 76990,
    priceUSD: 925,
    currency: 'INR',
    category: 'laptop',
    targetAudience: ['coding', 'college', 'everyday'],
    isSampleData: true,
    sampleDataNotice: 'Verified sample record compiled for PayPilot hackathon demonstration.',
    processor: {
      brand: 'Intel',
      model: 'Core i7-1360P',
      cores: 12,
      threads: 16,
      baseClockGHz: 2.2,
      maxClockGHz: 5.0,
      tier: 'high'
    },
    ram: {
      capacityGB: 16,
      type: 'LPDDR5-4800',
      isUpgradable: false,
      maxSupportedGB: 16
    },
    storage: {
      capacityGB: 1024,
      type: 'PCIe NVMe M.2 SSD (1TB)',
      isUpgradable: true,
      extraSlot: false
    },
    display: {
      sizeInches: 14.0,
      resolution: '2560x1600 (2.5K 16:10)',
      refreshRateHz: 60,
      brightnessNits: 300,
      panelType: 'WVA Anti-glare ComfortView Plus'
    },
    gpu: {
      type: 'integrated',
      brand: 'Intel',
      model: 'Iris Xe Graphics',
      vramGB: 0
    },
    battery: {
      capacityWattHours: 54,
      claimedHours: 8,
      realWorldHoursEstimate: 6.0
    },
    weightKg: 1.53,
    os: 'Windows 11 Home',
    keyboard: 'Backlit Keyboard with Fingerprint Reader',
    ports: ['1x Thunderbolt 4 (DisplayPort/PD)', '2x USB-A 3.2 Gen 1', '1x HDMI 1.4', 'SD Card Reader', 'Audio Jack'],
    strengths: [
      'Sharp 16:10 2.5K high-resolution display with ComfortView blue light filter',
      'High-performance 12-core Core i7-1360P and 1TB SSD included standard',
      'Upward-firing stereo speakers with Waves MaxxAudio Pro'
    ],
    tradeOffs: [
      'Soldered LPDDR5 memory cannot be expanded',
      'No discrete GPU for local deep learning models'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'lap-asus-tuf-f15-budget',
    name: 'ASUS TUF Gaming F15 (Core i5, RTX 2050)',
    brand: 'ASUS',
    model: 'FX506HF-HN024W',
    priceINR: 49990,
    priceUSD: 600,
    currency: 'INR',
    category: 'laptop',
    targetAudience: ['coding', 'ai-ml', 'gaming'],
    isSampleData: true,
    sampleDataNotice: 'Verified sample record compiled for PayPilot hackathon demonstration.',
    processor: {
      brand: 'Intel',
      model: 'Core i5-11400H',
      cores: 6,
      threads: 12,
      baseClockGHz: 2.7,
      maxClockGHz: 4.5,
      tier: 'mid'
    },
    ram: {
      capacityGB: 16,
      type: 'DDR4-3200',
      isUpgradable: true,
      maxSupportedGB: 32
    },
    storage: {
      capacityGB: 512,
      type: 'PCIe Gen3 NVMe SSD',
      isUpgradable: true,
      extraSlot: true
    },
    display: {
      sizeInches: 15.6,
      resolution: '1920x1080 (FHD IPS)',
      refreshRateHz: 144,
      brightnessNits: 250,
      panelType: 'IPS Anti-glare'
    },
    gpu: {
      type: 'dedicated',
      brand: 'NVIDIA',
      model: 'GeForce RTX 2050 4GB',
      vramGB: 4
    },
    battery: {
      capacityWattHours: 48,
      claimedHours: 5,
      realWorldHoursEstimate: 3.5
    },
    weightKg: 2.3,
    os: 'Windows 11 Home',
    keyboard: 'RGB Backlit Chiclet Keyboard with Overstroke technology',
    ports: ['1x Thunderbolt 4', '3x USB-A 3.2 Gen 1', '1x HDMI 2.0b', '1x RJ-45 LAN', 'Audio Jack'],
    strengths: [
      'Dedicated NVIDIA RTX GPU under ₹50,000 providing CUDA acceleration for beginner ML students',
      'Thunderbolt 4 support rare at this entry budget level',
      'Dual SO-DIMM RAM slots and dual M.2 SSD slots'
    ],
    tradeOffs: [
      'Older 11th Gen Intel CPU architecture with lower battery endurance',
      'Heavier at 2.3kg with basic 45% NTSC color display'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1595327656903-2f54e3dce0dd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'lap-lenovo-ideapad1-budget',
    name: 'Lenovo IdeaPad 1 15 (Ryzen 3)',
    brand: 'Lenovo',
    model: 'IdeaPad 1 15AMN7 Cloud Grey',
    priceINR: 34990,
    priceUSD: 420,
    currency: 'INR',
    category: 'laptop',
    targetAudience: ['college', 'everyday'],
    isSampleData: true,
    sampleDataNotice: 'Verified sample record compiled for PayPilot hackathon demonstration.',
    processor: {
      brand: 'AMD',
      model: 'Ryzen 3 7320U',
      cores: 4,
      threads: 8,
      baseClockGHz: 2.4,
      maxClockGHz: 4.1,
      tier: 'entry'
    },
    ram: {
      capacityGB: 8,
      type: 'LPDDR5-5500',
      isUpgradable: false,
      maxSupportedGB: 8
    },
    storage: {
      capacityGB: 512,
      type: 'PCIe 4.0 NVMe SSD',
      isUpgradable: true,
      extraSlot: false
    },
    display: {
      sizeInches: 15.6,
      resolution: '1920x1080 (FHD)',
      refreshRateHz: 60,
      brightnessNits: 220,
      panelType: 'TN Anti-glare'
    },
    gpu: {
      type: 'integrated',
      brand: 'AMD',
      model: 'Radeon 610M',
      vramGB: 0
    },
    battery: {
      capacityWattHours: 42,
      claimedHours: 8,
      realWorldHoursEstimate: 5.5
    },
    weightKg: 1.58,
    os: 'Windows 11 Home',
    keyboard: 'Non-backlit Keyboard with Numeric Keypad',
    ports: ['1x USB-C 3.2 Gen 1 (data only)', '1x USB-A 3.2 Gen 1', '1x USB-A 2.0', '1x HDMI 1.4b', 'SD Card Reader', 'Audio Jack'],
    strengths: [
      'Very affordable ₹34,990 entry laptop for note-taking, reading documentation, and Git basics',
      'Modern 6nm Mendocino architecture with low power consumption and fast LPDDR5 RAM',
      'Physical webcam privacy shutter'
    ],
    tradeOffs: [
      'Fixed 8GB soldered RAM cannot be upgraded',
      'TN display panel has narrow viewing angles'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'lap-lenovo-ideapad-slim3-12450h',
    name: 'Lenovo IdeaPad Slim 3 15 (Core i5-12450H)',
    brand: 'Lenovo',
    model: 'Slim 3 15IAH8 Arctic Grey',
    priceINR: 51990,
    priceUSD: 625,
    currency: 'INR',
    category: 'laptop',
    targetAudience: ['coding', 'college', 'everyday'],
    isSampleData: true,
    sampleDataNotice: 'Verified sample record compiled for PayPilot hackathon demonstration.',
    processor: {
      brand: 'Intel',
      model: 'Core i5-12450H',
      cores: 8,
      threads: 12,
      baseClockGHz: 2.0,
      maxClockGHz: 4.4,
      tier: 'mid'
    },
    ram: {
      capacityGB: 16,
      type: 'LPDDR5-4800',
      isUpgradable: false,
      maxSupportedGB: 16
    },
    storage: {
      capacityGB: 512,
      type: 'PCIe 4.0 NVMe SSD',
      isUpgradable: true,
      extraSlot: false
    },
    display: {
      sizeInches: 15.6,
      resolution: '1920x1080 (FHD IPS)',
      refreshRateHz: 60,
      brightnessNits: 300,
      panelType: 'IPS Anti-glare'
    },
    gpu: {
      type: 'integrated',
      brand: 'Intel',
      model: 'Intel UHD Graphics',
      vramGB: 0
    },
    battery: {
      capacityWattHours: 47,
      claimedHours: 7,
      realWorldHoursEstimate: 5.0
    },
    weightKg: 1.62,
    os: 'Windows 11 Home',
    keyboard: 'Backlit Keyboard with Numeric Keypad and Fingerprint Reader',
    ports: ['1x USB-C 3.2 Gen 1 (PD and DisplayPort)', '2x USB-A 3.2 Gen 1', '1x HDMI 1.4', 'SD Card Reader', 'Audio Jack'],
    strengths: [
      'High-power 45W H-series Core i5-12450H processor provides quick compiler performance',
      'Bright 300 nits IPS panel with blue light reduction',
      'Full-function USB-C port with Power Delivery and DisplayPort'
    ],
    tradeOffs: [
      'Soldered LPDDR5 RAM cannot be upgraded past 16GB',
      'No discrete GPU for CUDA-accelerated tasks'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'lap-msi-thin-15',
    name: 'MSI Thin 15 (Core i7, RTX 3050)',
    brand: 'MSI',
    model: 'Thin 15 B12UCX-1448IN',
    priceINR: 59990,
    priceUSD: 720,
    currency: 'INR',
    category: 'laptop',
    targetAudience: ['coding', 'ai-ml', 'gaming'],
    isSampleData: true,
    sampleDataNotice: 'Verified sample record compiled for PayPilot hackathon demonstration.',
    processor: {
      brand: 'Intel',
      model: 'Core i7-12650H',
      cores: 10,
      threads: 16,
      baseClockGHz: 2.3,
      maxClockGHz: 4.7,
      tier: 'high'
    },
    ram: {
      capacityGB: 16,
      type: 'DDR4-3200',
      isUpgradable: true,
      maxSupportedGB: 64
    },
    storage: {
      capacityGB: 512,
      type: 'NVMe PCIe Gen4 SSD',
      isUpgradable: true,
      extraSlot: true
    },
    display: {
      sizeInches: 15.6,
      resolution: '1920x1080 (FHD IPS-Level)',
      refreshRateHz: 144,
      brightnessNits: 250,
      panelType: 'IPS-Level'
    },
    gpu: {
      type: 'dedicated',
      brand: 'NVIDIA',
      model: 'GeForce RTX 3050 4GB (45W TGP)',
      vramGB: 4
    },
    battery: {
      capacityWattHours: 52.4,
      claimedHours: 5.5,
      realWorldHoursEstimate: 3.8
    },
    weightKg: 1.86,
    os: 'Windows 11 Home',
    keyboard: 'Single Backlit Red Keyboard',
    ports: ['1x USB-C 3.2 Gen 1 (DP)', '3x USB-A 3.2 Gen 1', '1x HDMI', '1x RJ-45 LAN', 'Audio Jack'],
    strengths: [
      '10-core Core i7-12650H with RTX 3050 under ₹60,000',
      'Under 1.9kg (1.86kg) thin profile for a gaming laptop',
      'Two DDR4 RAM slots upgradable to 64GB'
    ],
    tradeOffs: [
      'Red-only backlight may not suit professional settings',
      '45W TGP limits GPU peak rendering performance'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'lap-apple-mba-m2-base',
    name: 'Apple MacBook Air 13" (M2, 8GB)',
    brand: 'Apple',
    model: 'MacBook Air 13 Midnight M2',
    priceINR: 89900,
    priceUSD: 1080,
    currency: 'INR',
    category: 'laptop',
    targetAudience: ['coding', 'college', 'everyday'],
    isSampleData: true,
    sampleDataNotice: 'Verified sample record compiled for PayPilot hackathon demonstration.',
    processor: {
      brand: 'Apple',
      model: 'Apple M2 (8-Core CPU)',
      cores: 8,
      threads: 8,
      baseClockGHz: 2.4,
      maxClockGHz: 3.49,
      tier: 'high'
    },
    ram: {
      capacityGB: 8,
      type: 'Unified Memory',
      isUpgradable: false,
      maxSupportedGB: 8
    },
    storage: {
      capacityGB: 256,
      type: 'Apple NVMe SSD',
      isUpgradable: false,
      extraSlot: false
    },
    display: {
      sizeInches: 13.6,
      resolution: '2560x1664 (Liquid Retina)',
      refreshRateHz: 60,
      brightnessNits: 500,
      panelType: 'IPS Wide Color P3'
    },
    gpu: {
      type: 'integrated',
      brand: 'Apple',
      model: 'Apple 8-core GPU + Neural Engine',
      vramGB: 0
    },
    battery: {
      capacityWattHours: 52.6,
      claimedHours: 18,
      realWorldHoursEstimate: 13.0
    },
    weightKg: 1.24,
    os: 'macOS Sequoia',
    keyboard: 'Magic Keyboard with Touch ID',
    ports: ['2x Thunderbolt / USB 4', '1x MagSafe 3', 'Audio Jack'],
    strengths: [
      'Accessible entry into Apple Silicon ecosystem with 13+ hour battery life',
      'Silent fanless thermal design and slim 11.3mm profile',
      'High-res 500 nits Liquid Retina display'
    ],
    tradeOffs: [
      '8GB memory can swap under multiple heavy Docker containers or emulator instances',
      '256GB base storage fills up rapidly with large SDKs and datasets'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'lap-lenovo-loq-amd-4060',
    name: 'Lenovo LOQ 15 (Ryzen 7, RTX 4060)',
    brand: 'Lenovo',
    model: 'LOQ 15ARP9 Luna Grey',
    priceINR: 84990,
    priceUSD: 1020,
    currency: 'INR',
    category: 'laptop',
    targetAudience: ['coding', 'ai-ml', 'gaming'],
    isSampleData: true,
    sampleDataNotice: 'Verified sample record compiled for PayPilot hackathon demonstration.',
    processor: {
      brand: 'AMD',
      model: 'Ryzen 7 7435HS',
      cores: 8,
      threads: 16,
      baseClockGHz: 3.1,
      maxClockGHz: 4.5,
      tier: 'high'
    },
    ram: {
      capacityGB: 16,
      type: 'DDR5-4800',
      isUpgradable: true,
      maxSupportedGB: 32
    },
    storage: {
      capacityGB: 512,
      type: 'PCIe 4.0 NVMe SSD',
      isUpgradable: true,
      extraSlot: true
    },
    display: {
      sizeInches: 15.6,
      resolution: '1920x1080 (FHD IPS)',
      refreshRateHz: 144,
      brightnessNits: 300,
      panelType: 'IPS 100% sRGB G-Sync'
    },
    gpu: {
      type: 'dedicated',
      brand: 'NVIDIA',
      model: 'GeForce RTX 4060 8GB (105W TGP)',
      vramGB: 8
    },
    battery: {
      capacityWattHours: 60,
      claimedHours: 5.5,
      realWorldHoursEstimate: 3.5
    },
    weightKg: 2.38,
    os: 'Windows 11 Home',
    keyboard: 'Full-size White Backlit Keyboard with 1.5mm travel',
    ports: ['1x USB-C 3.2 Gen 2 (140W PD/DP)', '3x USB-A 3.2 Gen 1', '1x HDMI 2.1', '1x RJ-45 LAN', 'Audio Jack'],
    strengths: [
      'Full 8GB RTX 4060 under ₹85,000 makes it the top value machine for running quantized 8B local LLMs',
      '100% sRGB color-accurate 144Hz panel with G-Sync',
      'High build quality with dual DDR5 and dual NVMe slots'
    ],
    tradeOffs: [
      'Ryzen 7 7435HS has no integrated GPU; dedicated RTX runs continuously, reducing battery life to approx 3-3.5 hours',
      'Heavier laptop requiring carrying the 170W power brick'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&auto=format&fit=crop&q=80'
  }
];

const merged = [...list, ...additional];
fs.writeFileSync(catalogPath, JSON.stringify(merged, null, 2), 'utf8');
console.log('Successfully expanded catalog. Total products:', merged.length);
