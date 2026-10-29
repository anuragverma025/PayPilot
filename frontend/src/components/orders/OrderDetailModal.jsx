import React from 'react';
import {
  X,
  Package,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  ShieldCheck,
  ExternalLink,
  ArrowLeft,
  ShoppingBag,
  MapPin
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ProductImage } from '../products/ProductImage';
import { formatUSD, formatINR } from '../../utils/formatters';

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onContinueShopping
}) {
  if (!isOpen || !order) return null;

  const currency = order.currency || 'USD';
  const totalDisplay =
    currency === 'INR' ? formatINR(order.total) : formatUSD(order.total);
  const unitPriceDisplay =
    currency === 'INR'
      ? formatINR(order.product?.unitPrice)
      : formatUSD(order.product?.unitPrice);

  const getStatusBadge = (status, isPaid) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Paid & Verified</span>
          </span>
        );
      case 'CREATED':
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Payment</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-[#475569] border border-slate-200">
            <Ban className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Payment Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-[#475569]">
            {status}
          </span>
        );
    }
  };

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'N/A';

  const formattedPaidAt = order.paidAt
    ? new Date(order.paidAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Order Receipt & Details"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header Summary Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div>
            <div className="text-xs text-[#64748B] font-medium">Order Reference</div>
            <div className="text-base font-bold text-[#0F172A] font-mono tracking-tight mt-0.5">
              {order.orderNumber}
            </div>
            <div className="text-xs text-[#64748B] flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1.5">
            {getStatusBadge(order.status, order.isPaid)}
            <span className="text-[11px] font-semibold text-[#64748B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
              PayPal Sandbox Test
            </span>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Purchased Item
          </div>

          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-[#E2E8F0]">
              <ProductImage
                product={order.product}
                variant="thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#635BFF] text-[10px] font-bold uppercase">
                  {order.product?.brand || 'Laptop'}
                </span>
                <span className="text-xs text-[#64748B]">{order.product?.model}</span>
              </div>
              <h4 className="font-semibold text-sm text-[#0F172A] truncate">
                {order.product?.name}
              </h4>
              <div className="text-xs text-[#64748B] flex items-center gap-3 pt-0.5">
                <span>Qty: <strong className="text-[#0F172A]">{order.quantity}</strong></span>
                <span>•</span>
                <span>Unit: <strong className="text-[#0F172A]">{unitPriceDisplay}</strong></span>
              </div>
            </div>
          </div>

          {/* Specs Snippet if available */}
          {order.product?.specs && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E2E8F0] text-[11px] text-[#475569]">
              <div>
                <span className="text-[#64748B] block text-[10px]">Processor</span>
                <span className="font-medium truncate block">{order.product.specs.processor || 'Standard'}</span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">RAM</span>
                <span className="font-medium truncate block">{order.product.specs.ram || '8GB'}</span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">Storage</span>
                <span className="font-medium truncate block">{order.product.specs.storage || '512GB'}</span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[10px]">Display</span>
                <span className="font-medium truncate block">{order.product.specs.display || '15.6"'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Verification & PayPal Receipt Info */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#635BFF]" />
              <span>Payment Details</span>
            </span>
            {order.isPaid && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Backend Verified</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#64748B] block">Payment Gateway</span>
              <span className="font-semibold text-[#0F172A] mt-0.5 block">
                PayPal Sandbox (Orders v2 API)
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block">Payment Status</span>
              <span className="font-semibold text-[#0F172A] mt-0.5 block">
                {order.isPaid ? 'Captured & Completed' : order.status}
              </span>
            </div>

            {order.paypalOrderId && (
              <div>
                <span className="text-[#64748B] block">PayPal Order ID</span>
                <span className="font-mono text-[#0F172A] font-medium break-all mt-0.5 block">
                  {order.paypalOrderId}
                </span>
              </div>
            )}

            {order.paypalCaptureId && (
              <div>
                <span className="text-[#64748B] block">PayPal Capture ID</span>
                <span className="font-mono text-[#0F172A] font-medium break-all mt-0.5 block">
                  {order.paypalCaptureId}
                </span>
              </div>
            )}

            {order.buyer?.email && (
              <div>
                <span className="text-[#64748B] block">Buyer Email</span>
                <span className="text-[#0F172A] truncate mt-0.5 block">
                  {order.buyer.email}
                </span>
              </div>
            )}

            {formattedPaidAt && (
              <div>
                <span className="text-[#64748B] block">Paid Timestamp</span>
                <span className="text-[#0F172A] mt-0.5 block">
                  {formattedPaidAt}
                </span>
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-3 border-t border-[#E2E8F0] space-y-1.5 text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal ({order.quantity} item{order.quantity > 1 ? 's' : ''})</span>
              <span className="text-[#0F172A] font-medium tabular-nums">{totalDisplay}</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Sandbox Demo Shipping</span>
              <span className="text-[#16A34A] font-medium">FREE</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>Estimated Tax</span>
              <span className="text-[#0F172A] font-medium">$0.00</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#0F172A] pt-2 border-t border-[#E2E8F0]">
              <span>Total Paid</span>
              <span className="text-[#635BFF] text-base tabular-nums">{totalDisplay}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Delivery Destination */}
        {(() => {
          const finalAddr = order.finalShippingAddress?.addressLine1 ? order.finalShippingAddress : null;
          const requestedAddr = order.shippingAddress?.addressLine1 ? order.shippingAddress : null;
          const activeAddr = finalAddr || requestedAddr;
          const hasChanged =
            finalAddr &&
            requestedAddr &&
            (finalAddr.addressLine1.toLowerCase().trim() !== requestedAddr.addressLine1.toLowerCase().trim() ||
              finalAddr.postalCode.trim() !== requestedAddr.postalCode.trim() ||
              finalAddr.city.toLowerCase().trim() !== requestedAddr.city.toLowerCase().trim());

          return (
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#635BFF]" />
                  <span>Delivery Destination</span>
                </span>
                {finalAddr ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full border border-[#16A34A]/20">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified PayPal Destination</span>
                  </span>
                ) : requestedAddr ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#D97706]/20">
                    <span>Requested Checkout Address</span>
                  </span>
                ) : null}
              </div>

              {hasChanged && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Shipping address updated during PayPal checkout</span>
                    <span className="text-[11px] text-amber-800">
                      Originally entered: {requestedAddr.addressLine1}, {requestedAddr.city}, {requestedAddr.state} {requestedAddr.postalCode}
                    </span>
                  </div>
                </div>
              )}

              {activeAddr ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Recipient Name</span>
                    <span className="font-semibold text-[#0F172A] mt-0.5 block">
                      {activeAddr.recipientName || order.buyer?.name || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block">Country</span>
                    <span className="font-semibold text-[#0F172A] mt-0.5 block">
                      {activeAddr.countryCode || 'US'}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[#64748B] block">
                      {finalAddr ? 'Final Transaction Shipping Address' : 'Shipping Address'}
                    </span>
                    <p className="font-medium text-[#0F172A] mt-0.5 leading-relaxed">
                      {activeAddr.addressLine1}
                      {activeAddr.addressLine2 ? `, ${activeAddr.addressLine2}` : ''}
                      <br />
                      {[activeAddr.city, activeAddr.state, activeAddr.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>

                  {!finalAddr && requestedAddr && order.isPaid && (
                    <div className="sm:col-span-2 pt-1 text-[11px] text-[#64748B] italic">
                      * Final PayPal destination could not be independently confirmed by gateway response. Showing originally requested checkout address.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#64748B]">
                  <p>No order-specific shipping address recorded (Digital / Legacy sandbox order).</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            icon={ArrowLeft}
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Back to My Orders
          </Button>

          {onContinueShopping && (
            <Button
              variant="primary"
              size="md"
              icon={ShoppingBag}
              onClick={() => {
                onClose();
                onContinueShopping();
              }}
              className="w-full sm:w-auto bg-[#635BFF] hover:bg-[#4F46E5] text-white"
            >
              Continue Shopping
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}