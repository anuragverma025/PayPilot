import React, { useState } from 'react';
import {
  ShoppingCart,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  Info,
  Clock
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ProductImage } from '../products/ProductImage';
import { formatINR, formatUSD } from '../../utils/formatters';

export function CartReviewModal({
  isOpen,
  onClose,
  cartItem,
  onUpdateQuantity,
  onApproveAndCheckout,
  onContinueShopping,
  currency = 'USD'
}) {
  const [isApproved, setIsApproved] = useState(true);

  if (!isOpen || !cartItem?.product) return null;

  const { product, quantity = 1, matchScore, recommendationReason } = cartItem;

  const unitPrice = currency === 'INR' ? product.priceINR : product.priceUSD;
  const subtotal = unitPrice * quantity;
  const shipping = 0; // Free sandbox demo delivery
  const tax = 0;
  const total = subtotal + shipping + tax;

  const unitPriceDisplay = currency === 'INR' ? formatINR(unitPrice) : formatUSD(unitPrice);
  const totalDisplay = currency === 'INR' ? formatINR(total) : formatUSD(total);

  const handleDecreaseQty = () => {
    if (quantity > 1) {
      onUpdateQuantity(quantity - 1);
    }
  };

  const handleIncreaseQty = () => {
    if (quantity < 10) {
      onUpdateQuantity(quantity + 1);
    }
  };

  const handleCheckoutClick = () => {
    if (!isApproved) return;
    onApproveAndCheckout({
      ...cartItem,
      quantity,
      total
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review & Approve Cart"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Agent Approval Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EEF2FF] to-white border border-[#635BFF]/20 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#635BFF] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#635BFF] uppercase tracking-wider">
                Agent Recommended Cart
              </span>
              {matchScore && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {matchScore}% Match
                </span>
              )}
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              PayPilot requires your explicit confirmation before finalizing cart items and proceeding to checkout. No payment is initiated automatically.
            </p>
          </div>
        </div>

        {/* Cart Item Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 border border-[#E2E8F0] flex-shrink-0">
              <ProductImage product={product} variant="thumbnail" className="w-full h-full object-cover" />
            </div>

            <div className="min-w-0 space-y-1 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                {product.brand}
              </span>
              <h4 className="font-bold text-sm text-[#0F172A] truncate">
                {product.name}
              </h4>
              <p className="text-xs text-[#64748B] truncate">
                {product.processor?.model} • {product.ram?.capacityGB}GB RAM • {product.storage?.capacityGB}GB SSD
              </p>

              {recommendationReason && (
                <p className="text-[11px] text-[#635BFF] font-medium line-clamp-1 pt-0.5">
                  ★ {recommendationReason}
                </p>
              )}
            </div>
          </div>

          {/* Quantity and Item Total */}
          <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0]">
            {/* Quantity Selector */}
            <div className="flex items-center border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC]">
              <button
                type="button"
                onClick={handleDecreaseQty}
                disabled={quantity <= 1}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200 transition-colors disabled:opacity-30"
                title="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 text-xs font-bold text-[#0F172A] min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncreaseQty}
                disabled={quantity >= 10}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200 transition-colors disabled:opacity-30"
                title="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Price */}
            <div className="text-right">
              <span className="text-base font-bold text-[#0F172A] tabular-nums block">
                {totalDisplay}
              </span>
              <span className="text-[10px] text-[#64748B] block tabular-nums">
                ({unitPriceDisplay} each)
              </span>
            </div>
          </div>
        </div>

        {/* Order Summary Breakdown */}
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
          <div className="flex justify-between text-[#64748B]">
            <span>Items Subtotal ({quantity} {quantity === 1 ? 'item' : 'items'})</span>
            <span className="font-medium text-[#0F172A] tabular-nums">{totalDisplay}</span>
          </div>
          <div className="flex justify-between text-[#64748B]">
            <span>Sandbox Demo Delivery</span>
            <span className="font-semibold text-emerald-600">FREE</span>
          </div>
          <div className="flex justify-between text-[#64748B]">
            <span>Estimated Taxes</span>
            <span className="font-medium text-[#0F172A]">₹0 / $0</span>
          </div>
          <div className="pt-2 border-t border-[#E2E8F0] flex justify-between text-sm font-bold text-[#0F172A]">
            <span>Total to Authorize</span>
            <span className="text-base text-[#635BFF] tabular-nums">{totalDisplay}</span>
          </div>
        </div>

        {/* Explicit Confirmation Checkbox */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isApproved}
              onChange={(e) => setIsApproved(e.target.checked)}
              className="mt-0.5 rounded text-[#635BFF] focus:ring-[#635BFF] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-[#0F172A] font-medium leading-relaxed">
              I approve this cart item and pricing. Proceed to enter shipping information and initiate PayPal Sandbox checkout.
            </span>
          </label>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-colors"
          >
            Modify Selection
          </button>

          <Button
            variant="primary"
            size="md"
            disabled={!isApproved}
            onClick={handleCheckoutClick}
            icon={CreditCard}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#635BFF] to-[#0F172A] text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50"
          >
            Approve Cart & Proceed to Checkout
          </Button>
        </div>
      </div>
    </Modal>
  );
}

