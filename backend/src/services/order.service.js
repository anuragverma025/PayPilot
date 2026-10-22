import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { CatalogService } from './catalog.service.js';
import { config } from '../config/index.js';

// In-memory order store for testing or offline environments
const memoryOrders = new Map();

export class OrderService {
  /**
   * Check whether MongoDB is currently connected
   */
  static isMongoConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Generate human-readable order number
   */
  static generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create an initial order review draft with authoritative catalog prices
   */
  static async createOrderDraft({ productId, quantity = 1, buyer = {}, approvalConfirmed = false, currency }) {
    // 1. Authoritative product lookup from catalog
    const product = await CatalogService.getProductById(productId);
    if (!product) {
      const error = new Error(`Product with ID '${productId}' not found in catalog.`);
      error.code = 'PRODUCT_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const orderCurrency = currency || config.paypal.currency || 'USD';

    // 2. Authoritative price calculation (never trusting client prices)
    const unitPrice = orderCurrency === 'INR' ? product.priceINR : product.priceUSD;
    const subtotal = Math.round(unitPrice * qty * 100) / 100;
    const shipping = 0; // Free sandbox demo delivery
    const tax = 0;
    const total = subtotal + shipping + tax;

    const orderNumber = this.generateOrderNumber();

    const orderData = {
      orderNumber,
      product: {
        productId: product.id,
        name: product.name,
        brand: product.brand,
        model: product.model,
        imageUrl: product.imageUrl,
        unitPrice,
        specs: {
          processor: product.processor?.model || 'Standard Processor',
          ram: `${product.ram?.capacityGB || 8}GB ${product.ram?.type || 'DDR4'}`,
          storage: `${product.storage?.capacityGB || 512}GB ${product.storage?.type || 'SSD'}`,
          display: `${product.display?.sizeInches || 15.6}" ${product.display?.resolution || 'FHD'}`
        }
      },
      quantity: qty,
      currency: orderCurrency,
      subtotal,
      shipping,
      tax,
      total,
      approvalConfirmed: Boolean(approvalConfirmed),
      status: 'PENDING_APPROVAL',
      isPaid: false,
      paidAt: null,
      buyer: {
        name: buyer?.name || '',
        email: buyer?.email || '',
        notes: buyer?.notes || ''
      },
      timeline: [
        {
          action: 'ORDER_DRAFT_CREATED',
          timestamp: new Date(),
          details: {
            unitPrice,
            quantity: qty,
            total,
            currency: orderCurrency,
            authoritativeProduct: product.id
          }
        }
      ]
    };

    if (this.isMongoConnected()) {
      try {
        const order = await Order.create(orderData);
        return order.toObject();
      } catch (err) {
        console.warn('MongoDB order creation failed, falling back to in-memory store:', err.message);
      }
    }

    // Fallback in-memory
    const inMemOrder = {
      ...orderData,
      _id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryOrders.set(inMemOrder._id, inMemOrder);
    memoryOrders.set(inMemOrder.orderNumber, inMemOrder);
    return inMemOrder;
  }

  /**
   * Retrieve order by ID or orderNumber
   */
  static async getOrderById(idOrNumber) {
    if (!idOrNumber) return null;

    if (this.isMongoConnected()) {
      try {
        const query = mongoose.Types.ObjectId.isValid(idOrNumber)
          ? { $or: [{ _id: idOrNumber }, { orderNumber: idOrNumber }, { paypalOrderId: idOrNumber }] }
          : { $or: [{ orderNumber: idOrNumber }, { paypalOrderId: idOrNumber }] };

        const order = await Order.findOne(query).lean();
        if (order) return order;
      } catch (err) {
        console.warn('MongoDB order lookup failed, checking in-memory store:', err.message);
      }
    }

    return (
      memoryOrders.get(idOrNumber) ||
      Array.from(memoryOrders.values()).find(
        (o) => o.orderNumber === idOrNumber || o.paypalOrderId === idOrNumber || o._id === idOrNumber
      ) ||
      null
    );
  }

  /**
   * Update an order with new data and timeline event
   */
  static async updateOrder(idOrNumber, updateFields, timelineEvent = null) {
    let order = await this.getOrderById(idOrNumber);
    if (!order) {
      const error = new Error(`Order '${idOrNumber}' not found.`);
      error.code = 'ORDER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const updates = { ...updateFields, updatedAt: new Date() };

    if (this.isMongoConnected() && mongoose.Types.ObjectId.isValid(order._id)) {
      try {
        const pushUpdate = timelineEvent ? { $push: { timeline: timelineEvent } } : {};
        const updated = await Order.findByIdAndUpdate(
          order._id,
          { $set: updates, ...pushUpdate },
          { new: true, runValidators: true }
        ).lean();

        if (updated) return updated;
      } catch (err) {
        console.warn('MongoDB order update failed, updating in-memory store:', err.message);
      }
    }

    // In-memory update
    const current = memoryOrders.get(order._id) || order;
    const merged = {
      ...current,
      ...updates,
      timeline: timelineEvent ? [...(current.timeline || []), timelineEvent] : current.timeline || []
    };

    memoryOrders.set(merged._id, merged);
    memoryOrders.set(merged.orderNumber, merged);
    if (merged.paypalOrderId) {
      memoryOrders.set(merged.paypalOrderId, merged);
    }

    return merged;
  }

  /**
   * Clear in-memory orders (utility for tests)
   */
  static clearMemoryOrders() {
    memoryOrders.clear();
  }
}
