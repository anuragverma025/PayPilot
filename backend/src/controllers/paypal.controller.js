import { config } from '../config/index.js';
import { PayPalService } from '../services/paypal.service.js';
import { OrderService } from '../services/order.service.js';
import {
  createPayPalOrderSchema,
  capturePayPalOrderSchema,
  cancelPayPalOrderSchema
} from '../validators/order.validator.js';

/**
 * GET /api/paypal/config
 * Expose public PayPal client configuration without secrets
 */
export async function getPayPalConfig(req, res) {
  const isConfigured = PayPalService.isConfigured();
  console.log(`[PayPal Backend] GET /api/paypal/config -> isConfigured: ${isConfigured}, mode: ${config.paypal.mode}, currency: ${config.paypal.currency}`);

  return res.status(200).json({
    success: true,
    data: {
      clientId: isConfigured ? config.paypal.clientId : null,
      currency: config.paypal.currency || 'USD',
      mode: config.paypal.mode || 'sandbox',
      isConfigured
    }
  });
}

/**
 * POST /api/paypal/create-order
 * Create PayPal Sandbox order after explicit buyer review and approval
 */
export async function createOrder(req, res, next) {
  try {
    const validated = createPayPalOrderSchema.parse(req.body);

    // 1. Authoritative order draft creation or lookup
    let order;
    if (validated.orderId) {
      order = await OrderService.getOrderById(validated.orderId);
      if (!order) {
        console.warn(`[PayPal Backend] POST /api/paypal/create-order: Draft order '${validated.orderId}' not found.`);
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: `Order '${validated.orderId}' not found.`
          }
        });
      }
      if (order.status === 'COMPLETED' && order.isPaid) {
        console.warn(`[PayPal Backend] POST /api/paypal/create-order: Order ${order.orderNumber} is already completed and paid.`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'ORDER_ALREADY_COMPLETED',
            message: 'Cannot re-create payment for an order that is already completed and verified.'
          }
        });
      }
      if (validated.buyer) {
        order = await OrderService.updateOrder(order._id, { buyer: validated.buyer });
      }
    } else {
      order = await OrderService.createOrderDraft({
        productId: validated.productId,
        quantity: validated.quantity,
        buyer: validated.buyer,
        approvalConfirmed: validated.approvalConfirmed,
        currency: validated.currency
      });
    }

    console.log(`[PayPal Backend] POST /api/paypal/create-order: Initiating PayPal Sandbox order for draft ${order._id} (${order.orderNumber}), amount: ${order.total} ${order.currency}`);

    // 2. Call PayPal Sandbox REST API
    let paypalOrder;
    try {
      paypalOrder = await PayPalService.createOrder(order);
      console.log(`[PayPal Backend] POST /api/paypal/create-order: PayPal Sandbox order created successfully: ${paypalOrder.id} (Status: ${paypalOrder.status})`);
    } catch (err) {
      console.error(`[PayPal Backend] POST /api/paypal/create-order: PayPal Sandbox API call failed: ${err.message}`);
      // Record failure in order timeline if order was saved
      await OrderService.updateOrder(
        order._id,
        { status: 'FAILED', errorMessage: err.message },
        {
          action: 'PAYPAL_ORDER_CREATION_FAILED',
          timestamp: new Date(),
          details: { error: err.message, code: err.code }
        }
      ).catch(() => null);

      throw err;
    }

    // 3. Link PayPal order ID and transition state to CREATED
    const updatedOrder = await OrderService.updateOrder(
      order._id,
      {
        paypalOrderId: paypalOrder.id,
        status: 'CREATED',
        approvalConfirmed: true
      },
      {
        action: 'PAYPAL_ORDER_CREATED',
        timestamp: new Date(),
        details: {
          paypalOrderId: paypalOrder.id,
          amount: order.total,
          currency: order.currency
        }
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        paypalOrderId: paypalOrder.id,
        amount: updatedOrder.total,
        currency: updatedOrder.currency,
        links: paypalOrder.links || []
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/paypal/capture-order
 * Capture PayPal Sandbox order and verify returned currency & amount on the server
 */
export async function captureOrder(req, res, next) {
  try {
    const validated = capturePayPalOrderSchema.parse(req.body);
    const { orderId, paypalOrderId } = validated;

    console.log(`[PayPal Backend] POST /api/paypal/capture-order: Capturing PayPal order ${paypalOrderId} for internal order ${orderId}`);

    // 1. Look up authoritative database order
    let order = await OrderService.getOrderById(orderId);
    if (!order && paypalOrderId) {
      order = await OrderService.getOrderById(paypalOrderId);
    }
    if (!order) {
      console.warn(`[PayPal Backend] POST /api/paypal/capture-order: Order with ID '${orderId}' not found.`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order with ID '${orderId}' not found.`
        }
      });
    }

    // 2. Idempotency check: if order is already captured and completed, return it safely
    if (order.status === 'COMPLETED' && order.isPaid) {
      console.log(`[PayPal Backend] POST /api/paypal/capture-order: Order ${order.orderNumber} is already COMPLETED (idempotent response).`);
      return res.status(200).json({
        success: true,
        data: {
          order,
          alreadyCaptured: true,
          message: 'Order was already captured and marked paid.'
        }
      });
    }

    // 3. Capture order via PayPal REST API
    let captureResult;
    try {
      captureResult = await PayPalService.captureOrder(paypalOrderId);
      console.log(`[PayPal Backend] POST /api/paypal/capture-order: PayPal REST capture returned status: ${captureResult.status}`);
    } catch (err) {
      console.error(`[PayPal Backend] POST /api/paypal/capture-order: PayPal REST capture failed: ${err.message}`);
      await OrderService.updateOrder(
        order._id,
        { status: 'FAILED', errorMessage: err.message },
        {
          action: 'PAYPAL_CAPTURE_FAILED',
          timestamp: new Date(),
          details: { error: err.message, code: err.code }
        }
      ).catch(() => null);

      throw err;
    }

    // 4. Server-Side Verification of Amount, Currency, and Status
    let verification;
    try {
      verification = PayPalService.verifyCaptureResult(order, captureResult);
      console.log(`[PayPal Backend] POST /api/paypal/capture-order: Capture verified strictly on server: Capture ID = ${verification.captureId}, Amount = ${verification.capturedAmount} ${verification.capturedCurrency}`);
    } catch (verifyErr) {
      console.error(`[PayPal Backend] POST /api/paypal/capture-order: Server verification rejected: ${verifyErr.message}`);
      // Severe: amount or currency mismatch! Mark order as FAILED
      await OrderService.updateOrder(
        order._id,
        { status: 'FAILED', errorMessage: verifyErr.message, isPaid: false },
        {
          action: 'PAYMENT_VERIFICATION_REJECTED',
          timestamp: new Date(),
          details: { error: verifyErr.message, code: verifyErr.code }
        }
      ).catch(() => null);

      throw verifyErr;
    }

    // 5. Verified! Mark order paid and complete
    const payerInfo = verification.payer
      ? {
          payerId: verification.payer.payer_id,
          email: verification.payer.email_address,
          name: {
            givenName: verification.payer.name?.given_name,
            surname: verification.payer.name?.surname
          }
        }
      : undefined;

    const completedOrder = await OrderService.updateOrder(
      order._id,
      {
        status: 'COMPLETED',
        isPaid: true,
        paidAt: new Date(),
        paypalCaptureId: verification.captureId,
        ...(payerInfo ? { payer: payerInfo } : {})
      },
      {
        action: 'ORDER_PAYMENT_VERIFIED',
        timestamp: new Date(),
        details: {
          captureId: verification.captureId,
          capturedAmount: verification.capturedAmount,
          capturedCurrency: verification.capturedCurrency,
          verifiedAt: new Date().toISOString()
        }
      }
    );

    console.log(`[PayPal Backend] POST /api/paypal/capture-order: Order ${completedOrder.orderNumber} marked COMPLETED & PAID.`);

    return res.status(200).json({
      success: true,
      data: {
        order: completedOrder,
        verified: true,
        captureId: verification.captureId
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/paypal/cancel-order
 * Mark an order as cancelled if buyer cancels the checkout modal
 */
export async function cancelOrder(req, res, next) {
  try {
    const validated = cancelPayPalOrderSchema.parse(req.body);
    const { orderId, reason } = validated;

    console.log(`[PayPal Backend] POST /api/paypal/cancel-order: Processing cancellation for order ${orderId}, reason: "${reason || 'Buyer closed popup'}"`);

    const order = await OrderService.getOrderById(orderId);
    if (!order) {
      console.warn(`[PayPal Backend] POST /api/paypal/cancel-order: Order '${orderId}' not found.`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order '${orderId}' not found.`
        }
      });
    }

    // Do not cancel already completed orders
    if (order.status === 'COMPLETED') {
      console.warn(`[PayPal Backend] POST /api/paypal/cancel-order: Cannot cancel already COMPLETED order ${order.orderNumber}.`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_ALREADY_COMPLETED',
          message: 'Cannot cancel an order that has already been captured and paid.'
        }
      });
    }

    const cancelledOrder = await OrderService.updateOrder(
      order._id,
      {
        status: 'CANCELLED',
        errorMessage: reason || 'Checkout cancelled by buyer.'
      },
      {
        action: 'CHECKOUT_CANCELLED_BY_BUYER',
        timestamp: new Date(),
        details: { reason: reason || 'User dismissed PayPal modal' }
      }
    );

    console.log(`[PayPal Backend] POST /api/paypal/cancel-order: Order ${cancelledOrder.orderNumber} successfully marked CANCELLED.`);

    return res.status(200).json({
      success: true,
      data: {
        order: cancelledOrder
      }
    });
  } catch (err) {
    next(err);
  }
}
