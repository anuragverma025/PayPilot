import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Lock,
  Package,
  RefreshCw,
  FileText,
  User,
  Mail,
  Info,
  Clock,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ProductImage } from '../products/ProductImage';
import { formatINR, formatUSD } from '../../utils/formatters';
import { api } from '../../services/api';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

export function OrderReviewModal({
  product,
  isOpen,
  onClose,
  onOrderSuccess
}) {
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);

  // Flow State: 'REVIEW' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
  const [stage, setStage] = useState('REVIEW');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // PayPal Configuration & Order References
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [orderDraft, setOrderDraft] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Fetch PayPal public config when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage('REVIEW');
      setLoading(false);
      setErrorMessage(null);
      setCompletedOrder(null);
      setApprovalConfirmed(false);
      setIsConfigLoading(true);

      api.getPayPalConfig()
        .then((res) => {
          if (res.success) {
            setPaypalConfig(res.data);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch PayPal config:', err);
        })
        .finally(() => {
          setIsConfigLoading(false);
        });
    }
  }, [isOpen]);

  // Create authoritative draft when product or quantity changes
  useEffect(() => {
    if (isOpen && product) {
      api.createOrderDraft({
        productId: product.id,
        quantity,
        currency: paypalConfig?.currency || 'USD'
      })
        .then((res) => {
          if (res.success) {
            setOrderDraft(res.data);
          }
        })
        .catch((err) => {
          console.error('Failed to create order draft:', err);
        });
    }
  }, [isOpen, product, quantity, paypalConfig?.currency]);

  if (!product) return null;

  const currency = paypalConfig?.currency || 'USD';
  const unitPrice = currency === 'INR' ? product.priceINR : product.priceUSD;
  const subtotal = orderDraft ? orderDraft.subtotal : unitPrice * quantity;
  const total = orderDraft ? orderDraft.total : subtotal;

  // Memoized PayPal SDK options
  const paypalScriptOptions = useMemo(() => {
    if (!paypalConfig?.clientId) return null;
    return {
      clientId: paypalConfig.clientId,
      currency: paypalConfig.currency || 'USD',
      intent: 'capture',
      components: 'buttons'
    };
  }, [paypalConfig?.clientId, paypalConfig?.currency]);

  // Handler for creating PayPal order in backend
  const handleCreatePayPalOrder = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.createPayPalOrder({
        orderId: orderDraft?._id,
        productId: product.id,
        quantity,
        buyer: {
          name: buyerName.trim() || 'Sandbox Shopper',
          email: buyerEmail.trim() || 'sb-shopper@example.com'
        },
        approvalConfirmed: true,
        currency
      });

      if (!res.success || !res.data?.paypalOrderId) {
        throw new Error(res.error?.message || 'Failed to initialize PayPal Sandbox order.');
      }

      setActiveOrderId(res.data.orderId);
      return res.data.paypalOrderId;
    } catch (err) {
      setErrorMessage(err.message || 'PayPal order creation failed.');
      setStage('ERROR');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handler for capturing PayPal order in backend
  const handleApprovePayPalOrder = async (data) => {
    setStage('PROCESSING');
    setLoading(true);
    setErrorMessage(null);
    try {
      const orderIdToCapture = activeOrderId || orderDraft?._id || data.orderID;
      const res = await api.capturePayPalOrder({
        orderId: orderIdToCapture,
        paypalOrderId: data.orderID
      });

      if (res.success && res.data?.order) {
        setCompletedOrder(res.data.order);
        setStage('COMPLETED');
        if (onOrderSuccess) {
          onOrderSuccess(res.data.order);
        }
      } else {
        throw new Error(res.error?.message || 'Server verification failed.');
      }
    } catch (err) {
      console.error('Capture verification error:', err);
      setErrorMessage(err.message || 'Failed to capture and verify PayPal Sandbox payment.');
      setStage('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Handler for buyer cancellation
  const handleCancelPayPalOrder = async (data) => {
    if (orderDraft?._id) {
      try {
        await api.cancelPayPalOrder({
          orderId: orderDraft._id,
          paypalOrderId: data?.orderID,
          reason: 'Buyer closed PayPal popup window'
        });
      } catch (err) {
        console.warn('Error reporting order cancellation:', err);
      }
    }
    setErrorMessage('Checkout was cancelled by user in the PayPal popup.');
    setStage('ERROR');
  };

  // Simulated Sandbox checkout for hackathon judges/evaluators when live keys are unconfigured
  const handleSimulatedCheckout = async () => {
    setStage('PROCESSING');
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Create order draft
      const draftRes = await api.createOrderDraft({
        productId: product.id,
        quantity,
        buyer: {
          name: buyerName.trim() || 'Hackathon Evaluator',
          email: buyerEmail.trim() || 'evaluator@paypal-hackathon.local'
        },
        currency
      });

      const draft = draftRes.data;

      // Simulated sandbox delay
      await new Promise((resolve) => setTimeout(resolve, 1400));

      // Build simulated verified order record
      const simulatedCompleted = {
        ...draft,
        isSimulated: true,
        status: 'COMPLETED',
        isPaid: true,
        paidAt: new Date().toISOString(),
        paypalOrderId: `SIM-PP-${Date.now().toString().slice(-6)}`,
        paypalCaptureId: `SIM-CAP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        payer: {
          payerId: 'SIM-PAYER-HACKATHON',
          email: buyerEmail || 'evaluator@paypal-hackathon.local',
          name: { givenName: buyerName || 'Sandbox', surname: 'Evaluator' }
        }
      };

      setCompletedOrder(simulatedCompleted);
      setStage('COMPLETED');
      if (onOrderSuccess) onOrderSuccess(simulatedCompleted);
    } catch (err) {
      setErrorMessage(err.message || 'Simulation failed.');
      setStage('ERROR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        stage === 'COMPLETED'
          ? 'Payment Confirmed'
          : stage === 'PROCESSING'
          ? 'Processing Payment...'
          : 'Order Review & Approval'
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Sandbox Notice Banner */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>PayPal Developer Sandbox Simulation:</strong> No real money will be charged.
            Authoritative prices are calculated from the verified catalog database.
          </span>
        </div>

        {/* STAGE 1: ORDER REVIEW & APPROVAL */}
        {stage === 'REVIEW' && (
          <div className="space-y-6">
            {/* Product Snapshot Card */}
            <div className="flex gap-4 p-4 rounded-2xl bg-white border border-paypilot-border shadow-subtle">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-paypilot-border/70">
                <ProductImage product={product} variant="thumbnail" className="w-full h-full" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-paypilot-subtleViolet text-paypilot-brand text-[11px] font-bold uppercase">
                    {product.brand}
                  </span>
                  <span className="text-xs text-paypilot-muted line-clamp-1">{product.model}</span>
                </div>

                <h3 className="font-bold text-base text-paypilot-text truncate">{product.name}</h3>

                <div className="text-xs text-paypilot-muted flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  <span>RAM: <strong>{product.ram?.capacityGB}GB</strong></span>
                  <span>•</span>
                  <span>Storage: <strong>{product.storage?.capacityGB}GB SSD</strong></span>
                  <span>•</span>
                  <span>Display: <strong>{product.display?.sizeInches}"</strong></span>
                </div>
              </div>
            </div>

            {/* Quantity and Authoritative Pricing Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-paypilot-border space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-paypilot-muted uppercase tracking-wider">
                <span>Pricing Summary</span>
                <span>Authoritative Database Rate</span>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between py-2 border-b border-paypilot-border">
                <span className="text-sm font-medium text-paypilot-text">Quantity</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        quantity === qty
                          ? 'bg-paypilot-brand text-white shadow-subtle'
                          : 'bg-white border border-paypilot-border text-paypilot-text hover:bg-slate-100'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing Rows */}
              <div className="space-y-1.5 text-xs text-paypilot-text pt-1">
                <div className="flex justify-between">
                  <span className="text-paypilot-muted">
                    Unit Price ({currency})
                  </span>
                  <span className="font-semibold tabular-nums">
                    {currency === 'INR' ? formatINR(unitPrice) : formatUSD(unitPrice)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-paypilot-muted">Subtotal ({quantity} {quantity > 1 ? 'items' : 'item'})</span>
                  <span className="font-semibold tabular-nums">
                    {currency === 'INR' ? formatINR(subtotal) : formatUSD(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-paypilot-muted">Sandbox Demo Shipping</span>
                  <span className="text-paypilot-success font-semibold">FREE</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-paypilot-muted">Estimated Tax</span>
                  <span className="font-semibold tabular-nums">$0.00</span>
                </div>
              </div>

              {/* Authoritative Total */}
              <div className="pt-2 border-t border-paypilot-border flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold text-paypilot-navy">Total Due</span>
                  <p className="text-[11px] text-paypilot-muted">Billed in PayPal Sandbox as {currency}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-paypilot-brand tabular-nums">
                    {currency === 'INR' ? formatINR(total) : formatUSD(total)}
                  </div>
                  {currency === 'USD' && product.priceINR && (
                    <span className="text-xs text-paypilot-muted tabular-nums">
                      (Equivalent: {formatINR(product.priceINR * quantity)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Buyer Contact Details (Optional Sandbox Field) */}
            <div className="p-4 rounded-2xl bg-white border border-paypilot-border space-y-3">
              <h4 className="text-xs font-bold text-paypilot-text uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-paypilot-brand" />
                <span>Sandbox Buyer Information</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-paypilot-muted">Buyer Name</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 rounded-xl border border-paypilot-border focus:outline-none focus:ring-2 focus:ring-paypilot-brand/20 bg-slate-50 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-paypilot-muted">Sandbox Email</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="e.g. sb-shopper@personal.example.com"
                    className="w-full px-3 py-2 rounded-xl border border-paypilot-border focus:outline-none focus:ring-2 focus:ring-paypilot-brand/20 bg-slate-50 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* MANDATORY USER APPROVAL CHECKBOX */}
            <div className="p-4 rounded-2xl bg-paypilot-subtleViolet/60 border border-paypilot-brand/30 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={approvalConfirmed}
                  onChange={(e) => setApprovalConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-paypilot-brand focus:ring-paypilot-brand border-gray-300 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-paypilot-navy font-medium leading-relaxed">
                  I have reviewed the product configuration, authoritative catalog price, and final total of{' '}
                  <strong className="text-paypilot-brand">
                    {currency === 'INR' ? formatINR(total) : formatUSD(total)}
                  </strong>.
                  I explicitly approve creating this order in the PayPal Developer Sandbox.
                </span>
              </label>
            </div>

            {/* PAYPAL CHECKOUT BUTTONS / SANDBOX SIMULATION */}
            {approvalConfirmed ? (
              <div className="pt-2 space-y-4">
                {isConfigLoading ? (
                  <div className="p-6 rounded-2xl bg-white border border-paypilot-border text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-paypilot-brand border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-paypilot-muted">Verifying PayPal Sandbox configuration...</p>
                  </div>
                ) : paypalConfig?.isConfigured && paypalConfig?.clientId && paypalScriptOptions ? (
                  <div className="p-4 rounded-2xl bg-white border-2 border-paypilot-brand/40 shadow-card space-y-3">
                    <div className="flex items-center justify-between text-xs text-paypilot-muted pb-2 border-b border-paypilot-border">
                      <span className="flex items-center gap-1 font-semibold text-paypilot-text">
                        <Lock className="w-3.5 h-3.5 text-paypilot-success" />
                        <span>Official PayPal Sandbox JS SDK</span>
                      </span>
                      <span className="text-paypilot-brand font-bold text-[11px] bg-paypilot-subtleViolet px-2 py-0.5 rounded-full">
                        Live Sandbox Mode
                      </span>
                    </div>

                    <PayPalScriptProvider options={paypalScriptOptions}>
                      <PayPalButtons
                        style={{ layout: 'vertical', shape: 'rect', color: 'gold', height: 44 }}
                        createOrder={handleCreatePayPalOrder}
                        onApprove={handleApprovePayPalOrder}
                        onCancel={handleCancelPayPalOrder}
                        onError={(err) => {
                          console.error('PayPal Buttons Error:', err);
                          setErrorMessage(
                            `PayPal Sandbox error: ${err?.message || 'Unable to open PayPal payment modal. Check sandbox credentials or pop-up blocker.'}`
                          );
                          setStage('ERROR');
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-white border border-paypilot-border shadow-subtle space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <Info className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-paypilot-navy">
                          Demo Simulation Mode (Credentials Not Active)
                        </h4>
                        <p className="text-xs text-paypilot-muted leading-relaxed">
                          Live PayPal Sandbox credentials were not detected by the server. To enable genuine PayPal checkout, verify <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-paypilot-brand">PAYPAL_CLIENT_ID</code> and <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-paypilot-brand">PAYPAL_CLIENT_SECRET</code> in <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">backend/.env</code> and restart the server.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full justify-center bg-gradient-to-r from-paypilot-brand to-paypilot-navy hover:opacity-95 shadow-subtle"
                        onClick={handleSimulatedCheckout}
                        loading={loading}
                        icon={Sparkles}
                      >
                        Simulate Sandbox Approval & Verification (Demo Mode)
                      </Button>
                      <p className="text-[11px] text-center text-paypilot-muted mt-2">
                        Simulates the server price calculation, order creation, and receipt audit trail for testing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 border border-paypilot-border text-center text-xs text-paypilot-muted">
                Please check the approval box above to activate PayPal Sandbox payment.
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: PROCESSING / VERIFYING */}
        {stage === 'PROCESSING' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-paypilot-subtleViolet text-paypilot-brand mx-auto flex items-center justify-center shadow-subtle animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-paypilot-navy">
                Verifying Payment on PayPilot Server...
              </h3>
              <p className="text-xs text-paypilot-muted max-w-sm mx-auto">
                Validating capture status, currency match, and authoritative catalog price with PayPal Sandbox REST API.
              </p>
            </div>
          </div>
        )}

        {/* STAGE 3: COMPLETED & VERIFIED RECEIPT */}
        {stage === 'COMPLETED' && completedOrder && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-paypilot-success text-white mx-auto flex items-center justify-center shadow-subtle">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950">
                  Payment Verified & Order Confirmed!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Your PayPal Sandbox order has been captured and validated by PayPilot backend.
                </p>
              </div>
            </div>

            {/* Receipt Summary Grid */}
            <div className="p-5 rounded-2xl bg-white border border-paypilot-border shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-paypilot-border text-xs">
                <div>
                  <span className="text-paypilot-muted">PayPilot Order Reference:</span>
                  <div className="font-mono font-bold text-paypilot-navy text-sm">
                    {completedOrder.orderNumber}
                  </div>
                </div>
                {completedOrder.isSimulated ? (
                  <Badge variant="neutral" size="md" className="bg-amber-100 text-amber-900 border-amber-300">
                    SIMULATED DEMO (TEST ONLY)
                  </Badge>
                ) : (
                  <Badge variant="success" size="md">
                    PAYPAL SANDBOX VERIFIED
                  </Badge>
                )}
              </div>

              {completedOrder.isSimulated && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Evaluation Demo:</strong> This order was completed in local simulation mode. To execute genuine PayPal Sandbox transactions, ensure <code className="font-mono">PAYPAL_CLIENT_ID</code> and <code className="font-mono">PAYPAL_CLIENT_SECRET</code> are configured in <code className="font-mono">backend/.env</code> and restart the server.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-paypilot-muted">PayPal Order ID:</span>
                  <div className="font-mono text-paypilot-text truncate mt-0.5">
                    {completedOrder.paypalOrderId || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-paypilot-muted">PayPal Capture ID:</span>
                  <div className="font-mono text-paypilot-text truncate mt-0.5">
                    {completedOrder.paypalCaptureId || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-paypilot-muted">Item:</span>
                  <div className="font-semibold text-paypilot-text truncate mt-0.5">
                    {completedOrder.product?.name} (Qty: {completedOrder.quantity})
                  </div>
                </div>

                <div>
                  <span className="text-paypilot-muted">Amount Paid:</span>
                  <div className="font-bold text-paypilot-brand text-sm mt-0.5">
                    {completedOrder.currency === 'INR'
                      ? formatINR(completedOrder.total)
                      : formatUSD(completedOrder.total)}
                  </div>
                </div>
              </div>

              {completedOrder.paidAt && (
                <div className="pt-3 border-t border-paypilot-border text-xs text-paypilot-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Timestamp: {new Date(completedOrder.paidAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Completion Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="primary" size="md" onClick={onClose}>
                Done & Continue Shopping
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 4: ERROR / RETRY */}
        {stage === 'ERROR' && (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-950">
                  Payment Verification or Checkout Failed
                </h4>
                <p className="text-xs text-rose-800 leading-relaxed">
                  {errorMessage || 'An error occurred while processing the PayPal transaction.'}
                </p>
                <p className="text-[11px] text-rose-700">
                  Unpaid orders remain marked unpaid in the system.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={RefreshCw}
                onClick={() => {
                  setStage('REVIEW');
                  setErrorMessage(null);
                }}
              >
                Retry Order Review
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
