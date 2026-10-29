import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    product: {
      productId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      brand: { type: String },
      model: { type: String },
      imageUrl: { type: String },
      unitPrice: { type: Number, required: true },
      specs: {
        processor: { type: String },
        ram: { type: String },
        storage: { type: String },
        display: { type: String }
      }
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    subtotal: {
      type: Number,
      required: true
    },
    shipping: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    approvalConfirmed: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'CREATED', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'PENDING_APPROVAL',
      index: true
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true
    },
    paidAt: {
      type: Date,
      default: null
    },
    paypalOrderId: {
      type: String,
      index: true,
      sparse: true
    },
    paypalCaptureId: {
      type: String,
      index: true,
      sparse: true
    },
    buyer: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      notes: { type: String, default: '' }
    },
    shippingAddress: {
      recipientName: { type: String, default: '' },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      countryCode: { type: String, default: '' }
    },
    finalShippingAddress: {
      recipientName: { type: String, default: '' },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      countryCode: { type: String, default: '' },
      source: { type: String, default: '' }
    },
    guestTokenHash: {
      type: String,
      index: true,
      sparse: true
    },
    payer: {
      payerId: { type: String },
      email: { type: String },
      name: {
        givenName: { type: String },
        surname: { type: String }
      }
    },
    timeline: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed }
      }
    ],
    errorMessage: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
