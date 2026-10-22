import { OrderService } from '../services/order.service.js';
import { createOrderDraftSchema } from '../validators/order.validator.js';

/**
 * POST /api/orders/draft
 * Create or calculate an order review draft with authoritative catalog prices
 */
export async function createOrderDraft(req, res, next) {
  try {
    const validated = createOrderDraftSchema.parse(req.body);
    const draft = await OrderService.createOrderDraft(validated);

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
 * Retrieve order details by ID, order number, or PayPal order ID
 */
export async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    const order = await OrderService.getOrderById(id);

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
