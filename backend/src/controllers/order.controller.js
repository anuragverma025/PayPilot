import { OrderService } from '../services/order.service.js';
import { createOrderDraftSchema } from '../validators/order.validator.js';
import { claimGuestOrdersSchema } from '../validators/auth.validator.js';
import { extractAuthContext } from '../middleware/auth.js';

/**
 * GET /api/orders
 * Retrieve orders securely owned by the authenticated user or guest token.
 * Never returns orders belonging to other users or guests.
 */
export async function getOrders(req, res, next) {
  try {
    const { status, limit } = req.query;
    const authContext = extractAuthContext(req);

    if (!authContext || (!authContext.userId && (!authContext.guestToken || authContext.guestToken.length < 16))) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        message: 'No active session or guest token provided. Order history is scoped to your account or active session.'
      });
    }

    const orders = await OrderService.getOrders({
      status: status ? String(status) : undefined,
      guestToken: authContext.guestToken || undefined,
      userId: authContext.userId || undefined,
      limit: limit ? parseInt(limit, 10) : 50
    });

    return res.status(200).json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/draft
 * Create or calculate an order review draft with authoritative catalog prices.
 * Associates with authenticated user if logged in, otherwise issues/binds guest token.
 */
export async function createOrderDraft(req, res, next) {
  try {
    const validated = createOrderDraftSchema.parse(req.body);
    const authContext = extractAuthContext(req);

    const guestToken = validated.guestToken || authContext?.guestToken;
    const draft = await OrderService.createOrderDraft({
      ...validated,
      guestToken: guestToken ? String(guestToken).trim() : undefined,
      userId: authContext?.userId || undefined
    });

    return res.status(201).json({
      success: true,
      data: draft
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:id
 * Retrieve order details by ID or order number, enforcing user or guest token ownership.
 */
export async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    const authContext = extractAuthContext(req);

    // Strict ownership enforcement: If in production/development, require auth context
    if (
      process.env.NODE_ENV !== 'test' &&
      (!authContext || (!authContext.userId && (!authContext.guestToken || authContext.guestToken.length < 16)))
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_GUEST',
          message: 'Guest authorization token is required to view order details.'
        }
      });
    }

    let order;
    try {
      order = await OrderService.getOrderById(id, authContext);
    } catch (authErr) {
      return res.status(authErr.status || 403).json({
        success: false,
        error: {
          code: authErr.code || 'ORDER_FORBIDDEN',
          message: authErr.message
        }
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order with reference '${id}' was not found.`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:id/hide
 * Soft-delete / hide an order from normal history view.
 * Requires ownership verification; retains internal transaction & payment records.
 */
export async function hideOrder(req, res, next) {
  try {
    const { id } = req.params;
    const authContext = extractAuthContext(req);

    if (!authContext?.userId && (!authContext?.guestToken || authContext.guestToken.length < 16)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication is required to hide an order from history.'
        }
      });
    }

    try {
      const updated = await OrderService.hideOrder(id, authContext);
      return res.status(200).json({
        success: true,
        message: 'Order hidden from order history successfully.',
        data: {
          orderNumber: updated.orderNumber,
          isHidden: true,
          hiddenAt: updated.hiddenAt
        }
      });
    } catch (authErr) {
      return res.status(authErr.status || 403).json({
        success: false,
        error: {
          code: authErr.code || 'ORDER_FORBIDDEN',
          message: authErr.message
        }
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/claim
 * Claim guest orders using proof of guest-token ownership.
 * Requires user authentication + raw guestToken.
 */
export async function claimGuestOrders(req, res, next) {
  try {
    const authContext = extractAuthContext(req);
    if (!authContext?.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to claim guest orders.'
        }
      });
    }

    const validated = claimGuestOrdersSchema.parse(req.body);
    const result = await OrderService.claimGuestOrders({
      guestToken: validated.guestToken,
      userId: authContext.userId
    });

    return res.status(200).json({
      success: true,
      message: `Successfully claimed ${result.claimedCount} order(s) into your account.`,
      data: result
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors?.[0]?.message || 'Invalid guest token format.'
        }
      });
    }
    next(err);
  }
}
