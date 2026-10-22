import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true },
    priceINR: { type: Number, required: true, index: true },
    priceUSD: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    category: { type: String, default: 'laptop', index: true },
    targetAudience: [{ type: String }],
    isSampleData: { type: Boolean, default: true },
    sampleDataNotice: {
      type: String,
      default: 'Verified sample record compiled for PayPilot hackathon demonstration.'
    },
    hasVerifiedImage: { type: Boolean, default: false },
    imageUrl: { type: String, default: null },
    imageAlt: { type: String },
    processor: {
      brand: { type: String, required: true },
      model: { type: String, required: true },
      cores: { type: Number },
      threads: { type: Number },
      baseClockGHz: { type: Number },
      maxClockGHz: { type: Number },
      tier: { type: String, enum: ['entry', 'mid', 'high', 'flagship'], default: 'mid' }
    },
    ram: {
      capacityGB: { type: Number, required: true, index: true },
      type: { type: String },
      isUpgradable: { type: Boolean, default: false },
      maxSupportedGB: { type: Number }
    },
    storage: {
      capacityGB: { type: Number, required: true },
      type: { type: String },
      isUpgradable: { type: Boolean, default: false },
      extraSlot: { type: Boolean, default: false }
    },
    display: {
      sizeInches: { type: Number, required: true },
      resolution: { type: String },
      refreshRateHz: { type: Number, default: 60 },
      brightnessNits: { type: Number },
      panelType: { type: String }
    },
    gpu: {
      type: { type: String, enum: ['integrated', 'dedicated'], default: 'integrated' },
      brand: { type: String },
      model: { type: String },
      vramGB: { type: Number, default: 0 }
    },
    battery: {
      capacityWattHours: { type: Number },
      claimedHours: { type: Number },
      realWorldHoursEstimate: { type: Number }
    },
    weightKg: { type: Number },
    os: { type: String },
    keyboard: { type: String },
    ports: [{ type: String }],
    strengths: [{ type: String }],
    tradeOffs: [{ type: String }],
    imageUrl: { type: String }
  },
  {
    timestamps: true
  }
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
