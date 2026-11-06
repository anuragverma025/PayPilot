import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  Lock,
  Package,
  RefreshCw,
  FileText,
  User,
  Mail,
  MapPin,
  Info,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Printer,
  LogIn,
  ArrowRight
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ProductImage } from '../products/ProductImage';
import { formatINR, formatUSD } from '../../utils/formatters';
import { api } from '../../services/api';
import { guestSession } from '../../utils/session';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OrderReviewModal({
  product,
  isOpen,
  onClose,
  onOrderSuccess,
  initialQuantity = 1,
  user = null,
  onOpenAuth = null
}) {
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false });
  const [shippingAddress, setShippingAddress] = useState({
    recipientName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: 'US'
  });
  const [shippingTouched, setShippingTouched] = useState({
    recipientName: false,
    addressLine1: false,
    city: false,
    state: false,
    postalCode: false,
    countryCode: false
  });
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
  const activeOrderIdRef = useRef(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Memoized PayPal SDK options (must be called unconditionally at top level)
  const paypalScriptOptions = useMemo(() => {
    if (!paypalConfig?.clientId) return null;
    return {
      clientId: paypalConfig.clientId,
      currency: paypalConfig.currency || 'USD',
      intent: 'capture',
      components: 'buttons'
    };
  }, [paypalConfig?.clientId, paypalConfig?.currency]);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setQuantity(initialQuantity || 1);
      setStage('REVIEW');
      setLoading(false);
      setErrorMessage(null);
      setCompletedOrder(null);
      setApprovalConfirmed(false);
      setTouched({ name: false, email: false });
      setShippingTouched({
        recipientName: false,
        addressLine1: false,
        city: false,
        state: false,
        postalCode: false,
        countryCode: false
      });
      setIsConfigLoading(true);

      api.getPayPalConfig()
        .then((res) => {
          if (res.success && res.data) {
            setPaypalConfig(res.data);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch PayPal config:', err);
        })
        .finally(() => {
          setIsConfigLoading(false);
        });
    } else {
      setStage('REVIEW');
      setErrorMessage(null);
      setApprovalConfirmed(false);
      setTouched({ name: false, email: false });
      activeOrderIdRef.current = null;
    }
  }, [isOpen]);

  // Create authoritative draft when product or quantity changes
  useEffect(() => {
    if (!isOpen || !product?.id || isConfigLoading) return;

    // Prevent duplicate draft creation if the existing draft matches this modal state
    if (
      orderDraft &&
      orderDraft.product?.productId === product.id &&
      orderDraft.quantity === quantity &&
      orderDraft.currency === (paypalConfig?.currency || 'USD')
    ) {
      return;
    }

    api.createOrderDraft({
      productId: product.id,
      quantity,
      currency: paypalConfig?.currency || 'USD',
      guestToken: guestSession.getToken() || undefined
    })
      .then((res) => {
        if (res.success && res.data) {
          setOrderDraft(res.data);
          activeOrderIdRef.current = res.data._id;
          if (res.data.guestToken) {
            guestSession.setToken(res.data.guestToken);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to create order draft:', err);
      });
  }, [isOpen, product?.id, quantity, paypalConfig?.currency, isConfigLoading]);

  // Validation checks
  const isNameValid = buyerName.trim().length >= 2;
  const isEmailValid = EMAIL_REGEX.test(buyerEmail.trim());

  const effectiveRecipientName = shippingAddress.recipientName.trim() || buyerName.trim();
  const isRecipientNameValid = effectiveRecipientName.length >= 2;
  const isAddressLine1Valid = shippingAddress.addressLine1.trim().length >= 3;
  const isCityValid = shippingAddress.city.trim().length >= 1;
  const isStateValid = shippingAddress.state.trim().length >= 1;
  const isPostalCodeValid = shippingAddress.postalCode.trim().length >= 2;
  const isCountryCodeValid = shippingAddress.countryCode.trim().length === 2;

  const isShippingValid =
    isRecipientNameValid &&
    isAddressLine1Valid &&
    isCityValid &&
    isStateValid &&
    isPostalCodeValid &&
    isCountryCodeValid;

  const isFormValid = isNameValid && isEmailValid && isShippingValid;

  const nameError = touched.name && !isNameValid
    ? (buyerName.trim().length === 0 ? 'Buyer full name is required.' : 'Please enter at least 2 characters.')
    : null;

  const emailError = touched.email && !isEmailValid
    ? (buyerEmail.trim().length === 0 ? 'Sandbox email address is required.' : 'Please enter a valid email address (e.g. buyer@example.com).')
    : null;

  const recipientNameError =
    shippingTouched.recipientName && !isRecipientNameValid
      ? 'Recipient name is required (at least 2 characters).'
      : null;

  const addressLine1Error =
    shippingTouched.addressLine1 && !isAddressLine1Valid
      ? (shippingAddress.addressLine1.trim().length === 0
          ? 'Street address is required.'
          : 'Please enter at least 3 characters.')
      : null;

  const cityError =
    shippingTouched.city && !isCityValid ? 'City is required.' : null;

  const stateError =
    shippingTouched.state && !isStateValid ? 'State / Region is required.' : null;

  const postalCodeError =
    shippingTouched.postalCode && !isPostalCodeValid ? 'Postal / ZIP code is required.' : null;

  // If modal is closed or product is missing, return null only AFTER all Hooks have executed
  if (!isOpen || !product) return null;

  const currency = paypalConfig?.currency || 'USD';
  const unitPrice = currency === 'INR' ? product.priceINR : product.priceUSD;
  const subtotal = orderDraft ? orderDraft.subtotal : unitPrice * quantity;
  const total = orderDraft ? orderDraft.total : subtotal;

  // Handler for creating PayPal order in backend
  const handleCreatePayPalOrder = async () => {
    setLoading(true);
    setErrorMessage(null);

    // Validate buyer and shipping fields before communicating with backend
    if (!isFormValid) {
      setTouched({ name: true, email: true });
      setShippingTouched({
        recipientName: true,
        addressLine1: true,
        city: true,
        state: true,
        postalCode: true,
        countryCode: true
      });
      setLoading(false);
      const msg = 'Please fill in all required buyer contact and delivery address fields before proceeding.';
      setErrorMessage(msg);
      throw new Error(msg);
    }

    if (!approvalConfirmed) {
      setLoading(false);
      const msg = 'Explicit buyer approval is required to initiate PayPal Sandbox checkout.';
      setErrorMessage(msg);
      throw new Error(msg);
    }

    const finalShippingAddress = {
      recipientName: effectiveRecipientName,
      addressLine1: shippingAddress.addressLine1.trim(),
      addressLine2: shippingAddress.addressLine2.trim() || undefined,
      city: shippingAddress.city.trim(),
      state: shippingAddress.state.trim(),
      postalCode: shippingAddress.postalCode.trim(),
      countryCode: shippingAddress.countryCode.trim().toUpperCase()
    };

    const orderPayload = {
      orderId: orderDraft?._id,
      productId: product.id,
      quantity,
      buyer: {
        name: buyerName.trim(),
        email: buyerEmail.trim()
      },
      shippingAddress: finalShippingAddress,
      approvalConfirmed: true,
      currency,
      guestToken: guestSession.getToken() || undefined
    };

    console.log('[PayPal Frontend] createOrder initiated:', {
      orderDraftId: orderDraft?._id,
      productId: product.id,
      quantity,
      currency
    });

    try {
      const res = await api.createPayPalOrder(orderPayload);

      if (!res.success || !res.data?.paypalOrderId) {
        throw new Error(res.error?.message || 'Failed to initialize PayPal Sandbox order.');
      }

      activeOrderIdRef.current = res.data.orderId;
      setActiveOrderId(res.data.orderId);

      console.log('[PayPal Frontend] createOrder success:', {
        paypalOrderId: res.data.paypalOrderId,
        internalOrderId: res.data.orderId,
        orderNumber: res.data.orderNumber,
        amount: res.data.amount,
        currency: res.data.currency
      });

      return res.data.paypalOrderId;
    } catch (err) {
      console.error('[PayPal Frontend] createOrder failed:', err.message || err);
      setErrorMessage(err.message || 'PayPal Sandbox order creation failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handler for capturing PayPal order in backend
  const handleApprovePayPalOrder = async (data) => {
    console.log('[PayPal Frontend] onApprove received from PayPal popup:', {
      orderID: data?.orderID,
      payerID: data?.payerID
    });

    setStage('PROCESSING');
    setLoading(true);
    setErrorMessage(null);

    const orderIdToCapture = activeOrderIdRef.current || activeOrderId || orderDraft?._id || data?.orderID;

    console.log('[PayPal Frontend] captureOrder sending request to backend:', {
      internalOrderId: orderIdToCapture,
      paypalOrderId: data?.orderID
    });

    try {
      const res = await api.capturePayPalOrder({
        orderId: orderIdToCapture,
        paypalOrderId: data.orderID
      });

      if (res.success && res.data?.order) {
        console.log('[PayPal Frontend] captureOrder successfully verified by server:', {
          orderNumber: res.data.order.orderNumber,
          captureId: res.data.order.paypalCaptureId,
          total: res.data.order.total,
          currency: res.data.order.currency,
          status: res.data.order.status
        });

        setCompletedOrder(res.data.order);
        setStage('COMPLETED');
        if (onOrderSuccess) {
          onOrderSuccess(res.data.order);
        }
      } else {
        throw new Error(res.error?.message || 'Server verification failed.');
      }
    } catch (err) {
      console.error('[PayPal Frontend] captureOrder failed:', err.message || err);
      setErrorMessage(err.message || 'Failed to capture and verify PayPal Sandbox payment.');
      setStage('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Handler for buyer cancellation
  const handleCancelPayPalOrder = async (data) => {
    const orderIdToCancel = activeOrderIdRef.current || activeOrderId || orderDraft?._id || data?.orderID;
    console.log('[PayPal Frontend] onCancel received from PayPal popup:', {
      internalOrderId: orderIdToCancel,
      paypalOrderId: data?.orderID
    });

    if (orderIdToCancel) {
      try {
        await api.cancelPayPalOrder({
          orderId: orderIdToCancel,
          paypalOrderId: data?.orderID,
          reason: 'Buyer closed PayPal popup window'
        });
        console.log('[PayPal Frontend] cancelOrder recorded by backend.');
      } catch (err) {
        console.warn('[PayPal Frontend] cancelOrder recording warning:', err.message || err);
      }
    }
    setErrorMessage('Checkout was cancelled in the PayPal window. You can review your details and try again.');
  };

  // Simulated Sandbox checkout only when credentials are unconfigured on server
  const handleSimulatedCheckout = async () => {
    if (!isFormValid) {
      setTouched({ name: true, email: true });
      setShippingTouched({
        recipientName: true,
        addressLine1: true,
        city: true,
        state: true,
        postalCode: true,
        countryCode: true
      });
      setErrorMessage('Please fill in required buyer and delivery address fields.');
      return;
    }

    if (!approvalConfirmed) {
      setErrorMessage('Please check the approval box before completing this simulated order.');
      return;
    }

    setStage('PROCESSING');
    setLoading(true);
    setErrorMessage(null);

    const finalShippingAddress = {
      recipientName: effectiveRecipientName,
      addressLine1: shippingAddress.addressLine1.trim(),
      addressLine2: shippingAddress.addressLine2.trim() || undefined,
      city: shippingAddress.city.trim(),
      state: shippingAddress.state.trim(),
      postalCode: shippingAddress.postalCode.trim(),
      countryCode: shippingAddress.countryCode.trim().toUpperCase()
    };

    try {
      const draft = orderDraft || (await api.createOrderDraft({
        productId: product.id,
        quantity,
        buyer: {
          name: buyerName.trim(),
          email: buyerEmail.trim()
        },
        shippingAddress: finalShippingAddress,
        currency
      })).data;

      await new Promise((resolve) => setTimeout(resolve, 1400));

      const simulatedCompleted = {
        ...draft,
        isSimulated: true,
        status: 'COMPLETED',
        isPaid: true,
        paidAt: new Date().toISOString(),
        shippingAddress: finalShippingAddress,
        finalShippingAddress,
        paypalOrderId: `SIM-PP-${Date.now().toString().slice(-6)}`,
        paypalCaptureId: `SIM-CAP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        payer: {
          payerId: 'SIM-PAYER-HACKATHON',
          email: buyerEmail.trim(),
          name: { givenName: buyerName.trim(), surname: '(Sandbox)' }
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

  // Handle user toggling the approval checkbox
  const handleApprovalChange = (e) => {
    const checked = e.target.checked;
    if (checked && !isFormValid) {
      setTouched({ name: true, email: true });
      setShippingTouched({
        recipientName: true,
        addressLine1: true,
        city: true,
        state: true,
        postalCode: true,
        countryCode: true
      });
      setErrorMessage('Please provide your buyer name, sandbox email, and delivery address before confirming approval.');
      setApprovalConfirmed(false);
      return;
    }
    setErrorMessage(null);
    setApprovalConfirmed(checked);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        stage === 'COMPLETED'
          ? 'Payment Confirmed'
          : stage === 'PROCESSING'
          ? 'Verifying Payment...'
          : 'Order Review & Approval'
      }
      maxWidth="max-w-2xl"
    >
      <ErrorBoundary inline title="Checkout Modal Error">
        <div className="space-y-6">
          {/* Sandbox Notice Banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>PayPal Developer Sandbox Simulation:</strong> No real money will be charged.
              Authoritative prices are calculated strictly on the backend.
            </span>
          </div>

          {/* Inline Error Message Banner (if any) */}
          {errorMessage && stage === 'REVIEW' && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

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

              {/* Required Buyer Contact Details with Inline Validation */}
              <div className="p-4 rounded-2xl bg-white border border-paypilot-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-paypilot-text uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-paypilot-brand" />
                    <span>Buyer Contact Information</span>
                  </h4>
                  <span className="text-[11px] text-paypilot-muted">* Required fields</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Buyer Name Field */}
                  <div className="space-y-1">
                    <label className="font-medium text-paypilot-text flex items-center justify-between">
                      <span>Full Name <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => {
                        setBuyerName(e.target.value);
                        if (!touched.name) setTouched((prev) => ({ ...prev, name: true }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                      placeholder="e.g. John Doe"
                      className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 ${
                        nameError
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200 text-rose-900'
                          : 'border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text'
                      }`}
                    />
                    {nameError && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{nameError}</span>
                      </p>
                    )}
                  </div>

                  {/* Buyer Email Field */}
                  <div className="space-y-1">
                    <label className="font-medium text-paypilot-text flex items-center justify-between">
                      <span>Sandbox Email <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => {
                        setBuyerEmail(e.target.value);
                        if (!touched.email) setTouched((prev) => ({ ...prev, email: true }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                      placeholder="e.g. sb-shopper@personal.example.com"
                      className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 ${
                        emailError
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200 text-rose-900'
                          : 'border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text'
                      }`}
                    />
                    {emailError && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{emailError}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Sandbox Buyer Guidance Tip */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-paypilot-muted">
                  <Info className="w-3.5 h-3.5 text-paypilot-brand flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Sandbox Checkout Guide:</strong> When the PayPal popup appears, log in using a <strong>Sandbox Personal (Buyer) account</strong> created in your PayPal Developer Dashboard. Do not use your merchant/seller login, as PayPal blocks self-payment.
                  </span>
                </div>
              </div>

              {/* Order Delivery & Shipping Address with Inline Validation */}
              <div className="p-4 rounded-2xl bg-white border border-paypilot-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-paypilot-text uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-paypilot-brand" />
                    <span>Order Delivery & Shipping Address</span>
                  </h4>
                  <span className="text-[11px] text-paypilot-muted">* Required fields</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Recipient Full Name */}
                  <div className="space-y-1">
                    <label className="font-medium text-paypilot-text flex items-center justify-between">
                      <span>Recipient Full Name <span className="text-rose-500">*</span></span>
                      <span className="text-[11px] text-paypilot-muted">Defaults to buyer name if left blank</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.recipientName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShippingAddress((prev) => ({ ...prev, recipientName: val }));
                        if (!shippingTouched.recipientName) setShippingTouched((prev) => ({ ...prev, recipientName: true }));
                      }}
                      onBlur={() => setShippingTouched((prev) => ({ ...prev, recipientName: true }))}
                      placeholder={buyerName || "e.g. Anurag Verma"}
                      className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 ${
                        recipientNameError
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200 text-rose-900'
                          : 'border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text'
                      }`}
                    />
                    {recipientNameError && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{recipientNameError}</span>
                      </p>
                    )}
                  </div>

                  {/* Address Line 1 */}
                  <div className="space-y-1">
                    <label className="font-medium text-paypilot-text flex items-center justify-between">
                      <span>Address Line 1 <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.addressLine1}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShippingAddress((prev) => ({ ...prev, addressLine1: val }));
                        if (!shippingTouched.addressLine1) setShippingTouched((prev) => ({ ...prev, addressLine1: true }));
                      }}
                      onBlur={() => setShippingTouched((prev) => ({ ...prev, addressLine1: true }))}
                      placeholder="e.g. 123 Tech Park Way"
                      className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 ${
                        addressLine1Error
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200 text-rose-900'
                          : 'border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text'
                      }`}
                    />
                    {addressLine1Error && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{addressLine1Error}</span>
                      </p>
                    )}
                  </div>

                  {/* Address Line 2 */}
                  <div className="space-y-1">
                    <label className="font-medium text-paypilot-text flex items-center justify-between">
                      <span>Address Line 2 <span className="text-paypilot-muted text-[11px] font-normal">(Optional)</span></span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.addressLine2}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShippingAddress((prev) => ({ ...prev, addressLine2: val }));
                      }}
                      placeholder="e.g. Suite 400 or Apt 2B"
                      className="w-full px-3 py-2 rounded-xl border border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text text-xs transition-colors focus:outline-none focus:ring-2"
                    />
                  </div>

                  {/* City, State, Postal Code, Country 2x2 grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* City */}
                    <div className="space-y-1">
                      <label className="font-medium text-paypilot-text flex items-center justify-between">
                        <span>City <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShippingAddress((prev) => ({ ...prev, city: val }));
                          if (!shippingTouched.city) setShippingTouched((prev) => ({ ...prev, city: true }));
                        }}
                        onBlur={() => setShippingTouched((prev) => ({ ...prev, city: true }))}
                        placeholder="e.g. Bengaluru"
                        className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 ${
                          cityError
                            ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200 text-rose-900'
                            : 'border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text'
                        }`}
                      />
                      {cityError && (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{cityError}</span>
                        </p>
                      )}
                    </div>

                    {/* State */}
                    <div className="space-y-1">
                      <label className="font-medium text-paypilot-text flex items-center justify-between">
                        <span>State / Region <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShippingAddress((prev) => ({ ...prev, state: val }));
                          if (!shippingTouched.state) setShippingTouched((prev) => ({ ...prev, state: true }));
                        }}
                        onBlur={() => setShippingTouched((prev) => ({ ...prev, state: true }))}
                        placeholder="e.g. Karnataka"
                        className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 ${
                          stateError
                            ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200 text-rose-900'
                            : 'border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text'
                        }`}
                      />
                      {stateError && (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{stateError}</span>
                        </p>
                      )}
                    </div>

                    {/* Postal Code */}
                    <div className="space-y-1">
                      <label className="font-medium text-paypilot-text flex items-center justify-between">
                        <span>Postal / ZIP Code <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.postalCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShippingAddress((prev) => ({ ...prev, postalCode: val }));
                          if (!shippingTouched.postalCode) setShippingTouched((prev) => ({ ...prev, postalCode: true }));
                        }}
                        onBlur={() => setShippingTouched((prev) => ({ ...prev, postalCode: true }))}
                        placeholder="e.g. 560001"
                        className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 ${
                          postalCodeError
                            ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200 text-rose-900'
                            : 'border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text'
                        }`}
                      />
                      {postalCodeError && (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{postalCodeError}</span>
                        </p>
                      )}
                    </div>

                    {/* Country Code */}
                    <div className="space-y-1">
                      <label className="font-medium text-paypilot-text flex items-center justify-between">
                        <span>Country <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        value={shippingAddress.countryCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShippingAddress((prev) => ({ ...prev, countryCode: val }));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-paypilot-border bg-slate-50 focus:ring-paypilot-brand/20 text-paypilot-text text-xs transition-colors focus:outline-none focus:ring-2"
                      >
                        <option value="IN">India (IN)</option>
                        <option value="US">United States (US)</option>
                        <option value="GB">United Kingdom (GB)</option>
                        <option value="CA">Canada (CA)</option>
                        <option value="AU">Australia (AU)</option>
                        <option value="DE">Germany (DE)</option>
                        <option value="SG">Singapore (SG)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-paypilot-muted">
                  <Info className="w-3.5 h-3.5 text-paypilot-brand flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Order-Specific Shipping:</strong> This address is saved directly to your internal PayPilot order and forwarded to PayPal Orders v2 API so each order maintains its own delivery destination.
                  </span>
                </div>
              </div>

              {/* MANDATORY USER APPROVAL CHECKBOX */}
              <div className={`p-4 rounded-2xl border space-y-2 transition-colors ${
                approvalConfirmed
                  ? 'bg-paypilot-subtleViolet/80 border-paypilot-brand'
                  : 'bg-paypilot-subtleViolet/40 border-paypilot-brand/30'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={approvalConfirmed}
                    onChange={handleApprovalChange}
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
              {isFormValid && approvalConfirmed ? (
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

                      <ErrorBoundary inline title="PayPal Sandbox SDK Encountered an Issue">
                        <PayPalScriptProvider options={paypalScriptOptions}>
                          <PayPalButtons
                            style={{ layout: 'vertical', shape: 'rect', color: 'gold', height: 44 }}
                            createOrder={handleCreatePayPalOrder}
                            onApprove={handleApprovePayPalOrder}
                            onCancel={handleCancelPayPalOrder}
                            onError={(err) => {
                              console.error('[PayPal Frontend] onError triggered from PayPal SDK:', {
                                message: err?.message,
                                stack: err?.stack,
                                name: err?.name,
                                details: err
                              });
                              setErrorMessage(
                                `PayPal Sandbox error: ${err?.message || 'Unable to open PayPal payment modal. Check sandbox credentials or pop-up blocker.'}`
                              );
                            }}
                          />
                        </PayPalScriptProvider>
                      </ErrorBoundary>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-white border border-paypilot-border shadow-subtle space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                          <Info className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-paypilot-navy">
                            Demo Simulation Mode (Sandbox Credentials Unconfigured)
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
                <div className="p-4 rounded-xl bg-slate-50 border border-paypilot-border text-center text-xs text-paypilot-muted space-y-1">
                  {!isFormValid ? (
                    <p>Please enter your buyer name and valid email address above to enable checkout approval.</p>
                  ) : (
                    <p>Please check the approval box above to activate PayPal Sandbox payment.</p>
                  )}
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

                  {/* Delivery Destination */}
                  {(completedOrder.finalShippingAddress?.addressLine1 || completedOrder.shippingAddress?.addressLine1) && (
                    <div className="col-span-2 pt-2 border-t border-paypilot-border">
                      <span className="text-paypilot-muted flex items-center justify-between">
                        <span>Delivery Destination:</span>
                        {completedOrder.finalShippingAddress?.addressLine1 && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            PayPal Verified
                          </span>
                        )}
                      </span>
                      <div className="font-medium text-paypilot-text mt-0.5">
                        {(completedOrder.finalShippingAddress || completedOrder.shippingAddress).recipientName && (
                          <strong className="block text-paypilot-navy">
                            {(completedOrder.finalShippingAddress || completedOrder.shippingAddress).recipientName}
                          </strong>
                        )}
                        {[(completedOrder.finalShippingAddress || completedOrder.shippingAddress).addressLine1,
                          (completedOrder.finalShippingAddress || completedOrder.shippingAddress).addressLine2,
                          (completedOrder.finalShippingAddress || completedOrder.shippingAddress).city,
                          (completedOrder.finalShippingAddress || completedOrder.shippingAddress).state,
                          (completedOrder.finalShippingAddress || completedOrder.shippingAddress).postalCode,
                          (completedOrder.finalShippingAddress || completedOrder.shippingAddress).countryCode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  )}
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

              {/* Guest Claim Prompt — shown only when user is not logged in */}
              {!user && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-paypilot-subtleViolet to-blue-50 border border-paypilot-brand/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-paypilot-brand/10 text-paypilot-brand flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-bold text-paypilot-navy">
                        Sign in to track this order 📦
                      </h4>
                      <p className="text-xs text-paypilot-muted leading-relaxed">
                        Your order <strong className="text-paypilot-text font-mono">{completedOrder.orderNumber}</strong> was placed as a guest.
                        Create an account or sign in to view order history, track delivery status, and claim this order to your profile.
                      </p>
                    </div>
                  </div>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onOpenAuth(); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-paypilot-brand text-white text-xs font-bold hover:bg-paypilot-brand/90 transition-colors shadow-subtle"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In / Create Account
                      <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                  )}
                  <p className="text-[11px] text-paypilot-muted text-center">
                    Already have an account? Your guest orders are automatically linked via your guest session token.
                  </p>
                </div>
              )}

              {/* Completion Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  icon={Printer}
                  onClick={() => window.print()}
                  className="w-full sm:w-auto"
                  title="Print or save PayPal transaction confirmation"
                >
                  Print / Save Receipt
                </Button>
                <Button variant="primary" size="md" onClick={onClose} className="w-full sm:w-auto">
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
      </ErrorBoundary>
    </Modal>
  );
}
