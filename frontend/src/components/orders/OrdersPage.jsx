import React, { useState, useEffect } from 'react';
import {
  Package,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  ShoppingBag,
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { ProductImage } from '../products/ProductImage';
import { OrderDetailModal } from './OrderDetailModal';
import { formatUSD, formatINR } from '../../utils/formatters';

const FILTER_TABS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'COMPLETED', label: 'Paid' },
  { id: 'PENDING_APPROVAL', label: 'Pending' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'FAILED', label: 'Failed' }
];

export function OrdersPage({ onNavigateToShopping, onOpenAuth, user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [hidingOrderId, setHidingOrderId] = useState(null);

  const fetchOrders = async (status = activeFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOrders({
        status: status === 'ALL' ? undefined : status
      });
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to fetch orders.');
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.message || 'Unable to load your orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(activeFilter);
  }, [activeFilter, user]);

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  const handleHideOrder = async (order, e) => {
    e.stopPropagation();
    const idToHide = order._id || order.orderNumber;
    if (!window.confirm(`Hide order ${order.orderNumber} from your history? Note: payment and transaction records remain safely preserved for compliance.`)) {
      return;
    }

    setHidingOrderId(idToHide);
    try {
      const res = await api.hideOrder(idToHide);
      if (res.success) {
        setOrders((prev) => prev.filter((o) => o._id !== order._id && o.orderNumber !== order.orderNumber));
        setActionNotice(`Order ${order.orderNumber} hidden from your history.`);
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        throw new Error(res.error?.message || 'Failed to hide order');
      }
    } catch (err) {
      console.error('Hide order error:', err);
      alert(`Could not hide order: ${err.message}`);
    } finally {
      setHidingOrderId(null);
    }
  };

  const getStatusBadge = (status, isPaid) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Paid</span>
          </span>
        );
      case 'CREATED':
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
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
            <span>Failed</span>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              My Orders
            </h1>
            {!loading && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#635BFF]">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </span>
            )}
            {user && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#16A34A]">
                <UserCheck className="w-3 h-3" />
                <span>{user.email}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-[#475569] mt-1">
            Track your purchases and view your verified PayPal Sandbox payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!user && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#635BFF] hover:bg-[#EEF2FF] border border-[#635BFF]/30 rounded-xl transition-colors"
            >
              <span>Sign in to save orders</span>
            </button>
          )}

          <button
            onClick={() => fetchOrders(activeFilter)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#475569] hover:text-[#0F172A] bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl shadow-sm transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#635BFF]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-[#DCFCE7] border border-[#16A34A]/20 text-[#16A34A] text-xs font-medium flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-[#16A34A] hover:underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#635BFF] text-white shadow-sm'
                  : 'bg-white text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content State: Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm animate-pulse flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
            >
              <div className="flex items-center gap-4 w-full sm:w-2/3">
                <div className="w-16 h-16 rounded-xl bg-slate-200 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="w-32 h-4 bg-slate-200 rounded" />
                  <div className="w-48 h-5 bg-slate-200 rounded" />
                  <div className="w-24 h-3 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="w-28 h-8 bg-slate-200 rounded-xl self-end sm:self-center" />
            </div>
          ))}
        </div>
      )}

      {/* Content State: Error */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/20 text-[#DC2626] text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-[#DC2626]" />
          <h3 className="font-semibold text-base">Unable to load orders</h3>
          <p className="text-xs text-[#475569] max-w-md mx-auto">{error}</p>
          <button
            onClick={() => fetchOrders(activeFilter)}
            className="px-4 py-2 bg-white text-[#DC2626] border border-[#DC2626]/30 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content State: Empty Orders */}
      {!loading && !error && orders.length === 0 && (
        <div className="p-12 rounded-3xl bg-white border border-[#E2E8F0] text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] text-[#635BFF] flex items-center justify-center mx-auto shadow-sm">
            <Package className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0F172A]">
              {activeFilter === 'ALL' ? 'No orders yet' : `No ${activeFilter.toLowerCase()} orders`}
            </h3>
            <p className="text-xs text-[#475569] max-w-sm mx-auto">
              Explore our curated laptops catalog with AI recommendations and complete a safe checkout with PayPal Sandbox.
            </p>
          </div>
          {onNavigateToShopping && (
            <button
              onClick={onNavigateToShopping}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#4F46E5] active:bg-[#4338CA] text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Catalog & Start Shopping</span>
            </button>
          )}
        </div>
      )}

      {/* Orders List Cards */}
      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3.5">
          {orders.map((order) => {
            const currency = order.currency || 'USD';
            const totalFormatted =
              currency === 'INR' ? formatINR(order.total) : formatUSD(order.total);
            const dateStr = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Recent';

            return (
              <div
                key={order._id || order.orderNumber}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#635BFF]/30 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                {/* Left: Product Thumbnail & Title */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-50 border border-[#E2E8F0] flex-shrink-0">
                    <ProductImage
                      product={order.product}
                      variant="thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0F172A]">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-[#64748B] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                      <span className="text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                        Sandbox
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-[#0F172A] truncate">
                      {order.product?.name || 'Verified Product'}
                    </h3>

                    <div className="text-xs text-[#64748B] flex items-center gap-3">
                      <span>Qty: <strong className="text-[#0F172A]">{order.quantity}</strong></span>
                      <span>•</span>
                      <span>Gateway: <strong className="text-[#0F172A]">PayPal</strong></span>
                    </div>

                    {(order.finalShippingAddress?.city || order.shippingAddress?.city) && (
                      <div className="text-[11px] text-[#64748B] truncate pt-0.5">
                        Ship to: <span className="font-medium text-[#0F172A]">{(order.finalShippingAddress || order.shippingAddress).recipientName || order.buyer?.name || 'Customer'}</span> ({(order.finalShippingAddress || order.shippingAddress).city}, {(order.finalShippingAddress || order.shippingAddress).countryCode})
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Pricing, Status, and Action */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0]">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-bold text-[#0F172A] tabular-nums">
                      {totalFormatted}
                    </div>
                    {currency === 'USD' && order.product?.priceINR && (
                      <span className="text-[11px] text-[#64748B] tabular-nums block">
                        ({formatINR(order.product.priceINR * order.quantity)})
                      </span>
                    )}
                    <div className="mt-0.5">{getStatusBadge(order.status, order.isPaid)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F1F5F9] text-[#0F172A] hover:bg-[#EEF2FF] hover:text-[#635BFF] transition-colors"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleHideOrder(order, e)}
                      disabled={hidingOrderId === (order._id || order.orderNumber)}
                      title="Hide from order history"
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Hide</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onContinueShopping={onNavigateToShopping}
      />
    </div>
  );
}