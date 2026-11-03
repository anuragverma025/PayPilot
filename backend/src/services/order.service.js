import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { CatalogService } from './catalog.service.js';
import { config } from '../config/index.js';
import { generateGuestToken, hashGuestToken } from '../utils/token.util.js';

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
  static async createOrderDraft({ productId, quantity = 1, buyer = {}, shippingAddress = {}, approvalConfirmed = false, currency, guestToken, userId = null }) {
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

    // 3. Secure Guest Token issuance or binding
    // If client supplied an existing valid guestToken from their session, re-use it to bind multiple orders.
    // Otherwise, generate a fresh cryptographically secure guest token.
    const issuedGuestToken = (guestToken && typeof guestToken === 'string' && guestToken.trim().length >= 16)
      ? guestToken.trim()
      : generateGuestToken();
    const guestTokenHash = hashGuestToken(issuedGuestToken);

    const orderData = {
      orderNumber,
      userId: userId ? String(userId) : null,
      isHidden: false,
      hiddenAt: null,
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
      shippingAddress: {
        recipientName: shippingAddress?.recipientName || '',
        addressLine1: shippingAddress?.addressLine1 || '',
        addressLine2: shippingAddress?.addressLine2 || '',
        city: shippingAddress?.city || '',
        state: shippingAddress?.state || '',
        postalCode: shippingAddress?.postalCode || '',
        countryCode: (shippingAddress?.countryCode || '').toUpperCase()
      },
      finalShippingAddress: null,
      guestTokenHash,
      timeline: [
        {
          action: 'ORDER_DRAFT_CREATED',
          timestamp: new Date(),
          details: {
            unitPrice,
            quantity: qty,
            total,
            currency: orderCurrency,
            authoritativeProduct: product.id,
            userId: userId || null
          }
        }
      ]
    };

    if (this.isMongoConnected()) {
      try {
        const order = await Order.create(orderData);
        const obj = order.toObject();
        // Return issuedGuestToken in the creation response (and never save raw token to db)
        return { ...obj, guestToken: issuedGuestToken };
      } catch (err) {
        console.warn('MongoDB order creation failed, falling back to in-memory store:', err.message);
      }
    }

    // Fallback in-memory
    const inMemOrder = {
      ...orderData,
      _id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      guestToken: issuedGuestToken
    };
    memoryOrders.set(inMemOrder._id, inMemOrder);
    memoryOrders.set(inMemOrder.orderNumber, inMemOrder);
    return inMemOrder;
  }

  /**
   * Retrieve orders owned by a verified user or guest token, with optional status filter.
   * Excludes soft-deleted/hidden orders.
   * If caller is unauthenticated (neither userId nor valid guestToken provided), returns [].
   */
  static async getOrders(filters = {}) {
    const { status, guestToken, userId, limit = 50 } = filters;

    const hasUser = Boolean(userId && String(userId).trim().length > 0);
    const hasGuest = Boolean(guestToken && typeof guestToken === 'string' && guestToken.trim().length >= 16);

    // Strict ownership isolation: If neither user ID nor valid guest token provided, return empty list
    if (!hasUser && !hasGuest) {
      return [];
    }

    const query = {
      isHidden: { $ne: true }
    };

    if (hasUser) {
      query.userId = String(userId).trim();
    } else {
      query.guestTokenHash = hashGuestToken(guestToken);
      query.userId = { $in: [null, undefined] };
    }

    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    if (this.isMongoConnected()) {
      try {
        const orders = await Order.find(query)
          .select('-guestTokenHash')
          .sort({ createdAt: -1 })
          .limit(Math.min(limit, 100))
          .lean();
        return orders;
      } catch (err) {
        console.warn('MongoDB orders list failed, falling back to memory store:', err.message);
      }
    }

    // In-memory fallback: robustly deduplicate by order ID/number
    const seen = new Set();
    const uniqueOrders = [];
    for (const ord of memoryOrders.values()) {
      if (!ord) continue;
      const key = String(ord._id || ord.orderNumber);
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueOrders.push(ord);
      }
    }

    return uniqueOrders
      .filter((o) => {
        if (o.isHidden === true) return false;
        if (hasUser) {
          if (!o.userId || String(o.userId) !== String(userId).trim()) return false;
        } else {
          // Strict user isolation: unauthenticated guests can never access user-associated orders
          if (o.userId) return false;
          const tokenHash = hashGuestToken(guestToken);
          if (!o.guestTokenHash || o.guestTokenHash !== tokenHash) return false;
        }
        if (query.status && o.status !== query.status) return false;
        return true;
      })
      .map(({ guestTokenHash: _, ...rest }) => rest)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, limit);
  }

  /**
   * Retrieve order by ID or orderNumber, with optional guest token / user ownership enforcement.
   * Supports both authContext object ({ userId, guestToken }) or raw guestToken string for backward compatibility.
   */
  static async getOrderById(idOrNumber, authContext = null) {
    if (!idOrNumber) return null;

    let order = null;

    if (this.isMongoConnected()) {
      try {
        const query = mongoose.Types.ObjectId.isValid(idOrNumber)
          ? { $or: [{ _id: idOrNumber }, { orderNumber: idOrNumber }, { paypalOrderId: idOrNumber }] }
          : { $or: [{ orderNumber: idOrNumber }, { paypalOrderId: idOrNumber }] };

        order = await Order.findOne(query).lean();
      } catch (err) {
        console.warn('MongoDB order lookup failed, checking in-memory store:', err.message);
      }
    }

    if (!order) {
      order =
        memoryOrders.get(idOrNumber) ||
        Array.from(memoryOrders.values()).find(
          (o) => o.orderNumber === idOrNumber || o.paypalOrderId === idOrNumber || o._id === idOrNumber
        ) ||
        null;
    }

    if (!order) return null;

    // If caller provided authContext, strictly verify ownership
    if (authContext !== undefined && authContext !== null) {
      const candidateUserId = typeof authContext === 'object' ? authContext.userId : null;
      const candidateGuestToken = typeof authContext === 'string' ? authContext : authContext.guestToken;

      // Only enforce ownership if at least one candidate identity is provided
      if (candidateUserId || candidateGuestToken) {
        let isAuthorized = false;

        // 1. Check user ownership
        if (candidateUserId && order.userId && String(order.userId) === String(candidateUserId)) {
          isAuthorized = true;
        }

        // 2. Check guest token ownership (strictly for guest/unclaimed orders without userId)
        if (!isAuthorized && candidateGuestToken && !order.userId) {
          const candidateHash = hashGuestToken(candidateGuestToken);
          if (order.guestTokenHash && order.guestTokenHash === candidateHash) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          const error = new Error('Access denied: You do not have permission to view this order.');
          error.code = 'ORDER_FORBIDDEN';
          error.status = 403;
          throw error;
        }
      }
    }

    // Strip internal guestTokenHash from returned data
    const { guestTokenHash: _, ...sanitized } = order;
    return sanitized;
  }

  /**
   * Soft-delete / hide an order from normal order history.
   * Requires strict caller ownership verification (user or guest).
   * Does NOT erase payment records, PayPal IDs, amounts, or audit trails.
   */
  static async hideOrder(idOrNumber, authContext = {}) {
    if (!idOrNumber) {
      const error = new Error('Order reference is required.');
      error.code = 'BAD_REQUEST';
      error.status = 400;
      throw error;
    }

    const userId = authContext?.userId || null;
    const guestToken = authContext?.guestToken || null;

    if (!userId && (!guestToken || guestToken.trim().length < 16)) {
      const error = new Error('Authentication required to hide an order from history.');
      error.code = 'UNAUTHORIZED';
      error.status = 401;
      throw error;
    }

    // Fetch order directly without pre-filtering to verify caller ownership
    let rawOrder = null;
    if (this.isMongoConnected()) {
      try {
        const query = mongoose.Types.ObjectId.isValid(idOrNumber)
          ? { $or: [{ _id: idOrNumber }, { orderNumber: idOrNumber }] }
          : { orderNumber: idOrNumber };
        rawOrder = await Order.findOne(query).lean();
      } catch (err) {
        console.warn('MongoDB hideOrder lookup failed:', err.message);
      }
    }

    if (!rawOrder) {
      rawOrder =
        memoryOrders.get(idOrNumber) ||
        Array.from(memoryOrders.values()).find(
          (o) => o.orderNumber === idOrNumber || o._id === idOrNumber
        ) ||
        null;
    }

    if (!rawOrder) {
      const error = new Error(`Order '${idOrNumber}' not found.`);
      error.code = 'ORDER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Ownership verification
    let isAuthorized = false;
    if (userId && rawOrder.userId && String(rawOrder.userId) === String(userId)) {
      isAuthorized = true;
    }
    if (!isAuthorized && guestToken && rawOrder.guestTokenHash && !rawOrder.userId) {
      const candidateHash = hashGuestToken(guestToken);
      if (rawOrder.guestTokenHash === candidateHash) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const error = new Error('Access denied: You do not have permission to hide this order.');
      error.code = 'ORDER_FORBIDDEN';
      error.status = 403;
      throw error;
    }

    const now = new Date();
    const timelineEvent = {
      action: 'ORDER_HIDDEN_FROM_HISTORY',
      timestamp: now,
      details: {
        hiddenBy: userId ? `user:${userId}` : 'guest',
        preservedStatus: rawOrder.status,
        paypalOrderId: rawOrder.paypalOrderId || null,
        paypalCaptureId: rawOrder.paypalCaptureId || null
      }
    };

    return await this.updateOrder(
      rawOrder._id || rawOrder.orderNumber,
      { isHidden: true, hiddenAt: now },
      timelineEvent
    );
  }

  /**
   * Claim guest orders into an authenticated user account.
   * Requires proof of raw guest session token (NEVER by email alone).
   */
  static async claimGuestOrders({ guestToken, userId }) {
    if (!guestToken || typeof guestToken !== 'string' || guestToken.trim().length < 16) {
      const error = new Error('Valid guest session token is required to claim orders.');
      error.code = 'INVALID_GUEST_TOKEN';
      error.status = 400;
      throw error;
    }
    if (!userId) {
      const error = new Error('User ID is required to claim orders.');
      error.code = 'UNAUTHORIZED';
      error.status = 401;
      throw error;
    }

    const tokenHash = hashGuestToken(guestToken.trim());
    let claimedCount = 0;

    if (this.isMongoConnected()) {
      try {
        const matching = await Order.find({ guestTokenHash: tokenHash }).lean();
        for (const ord of matching) {
          // If already owned by another user, don't overwrite
          if (!ord.userId || String(ord.userId) === String(userId)) {
            await Order.findByIdAndUpdate(ord._id, {
              $set: { userId: String(userId) },
              $push: {
                timeline: {
                  action: 'GUEST_ORDER_CLAIMED_BY_USER',
                  timestamp: new Date(),
                  details: { userId: String(userId) }
                }
              }
            });
            claimedCount++;
          }
        }
        return { claimedCount };
      } catch (err) {
        console.warn('MongoDB claimGuestOrders failed, checking in-memory store:', err.message);
      }
    }

    // In-memory fallback
    const seen = new Set();
    const uniqueOrders = [];
    for (const ord of memoryOrders.values()) {
      if (!ord) continue;
      const key = String(ord._id || ord.orderNumber);
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueOrders.push(ord);
      }
    }
    for (const ord of uniqueOrders) {
      if (ord.guestTokenHash === tokenHash) {
        if (!ord.userId || String(ord.userId) === String(userId)) {
          ord.userId = String(userId);
          ord.timeline = ord.timeline || [];
          ord.timeline.push({
            action: 'GUEST_ORDER_CLAIMED_BY_USER',
            timestamp: new Date(),
            details: { userId: String(userId) }
          });
          claimedCount++;
        }
      }
    }

    return { claimedCount };
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
    if (updates.shippingAddress) {
      updates.shippingAddress = { ...updates.shippingAddress };
    }
    if (updates.finalShippingAddress) {
      updates.finalShippingAddress = { ...updates.finalShippingAddress };
    }

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
   * Set an in-memory order (utility for tests only)
   */
  static setMemoryOrder(key, order) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test helper setMemoryOrder cannot be used in production.');
    }
    memoryOrders.set(key, order);
  }

  /**
   * Clear in-memory orders (utility for tests only)
   */
  static clearMemoryOrders() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test helper clearMemoryOrders cannot be used in production.');
    }
    memoryOrders.clear();
  }
}
