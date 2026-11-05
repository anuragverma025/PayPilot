import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { WorkflowSteps } from './components/workspace/WorkflowSteps';
import { SearchHero } from './components/workspace/SearchHero';
import { FilterBar } from './components/workspace/FilterBar';
import { PreferencesPanel } from './components/workspace/PreferencesPanel';
import { ProductGrid } from './components/products/ProductGrid';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { ComparisonDrawer } from './components/comparison/ComparisonDrawer';
import { ComparisonModal } from './components/comparison/ComparisonModal';
import { ShoppingDecisionReport } from './components/assistant/ShoppingDecisionReport';
import { ClarifyingQuestionCard } from './components/assistant/ClarifyingQuestionCard';
import { CartReviewModal } from './components/cart/CartReviewModal';
import { OrderReviewModal } from './components/checkout/OrderReviewModal';
import { OrdersPage } from './components/orders/OrdersPage';
import { AuthModal } from './components/auth/AuthModal';
import { api } from './services/api';
import { authSession } from './utils/session';
import { Sparkles, Loader2 } from 'lucide-react';

const DEFAULT_FILTERS = {
  search: '',
  maxBudget: 150000,
  minBudget: 0,
  minRam: 8,
  brand: 'All',
  gpuType: 'any',
  upgradableOnly: false,
  sortBy: 'price_asc'
};

export default function App() {
  const [activeView, setActiveView] = useState('workspace');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);

  // AI Assistant State
  const [decisionReport, setDecisionReport] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [clarifyingData, setClarifyingData] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  // Cart staging state (agent flow: recommendation → cart review → checkout)
  const [cartItem, setCartItem] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals, Comparison & Checkout State
  const [detailProduct, setDetailProduct] = useState(null);
  const [comparedIds, setComparedIds] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [orderProduct, setOrderProduct] = useState(null);
  const [latestPaidOrder, setLatestPaidOrder] = useState(null);
  const [ordersCount, setOrdersCount] = useState(null);

  // Authentication State
  const [user, setUser] = useState(() => authSession.getUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Validate session on mount
  useEffect(() => {
    if (authSession.getToken()) {
      api.getMe()
        .then((res) => {
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            authSession.setUser(res.data.user);
          } else {
            setUser(null);
            authSession.clearToken();
            authSession.clearUser();
          }
        })
        .catch(() => {
          setUser(null);
          authSession.clearToken();
          authSession.clearUser();
        });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    authSession.clearToken();
    authSession.clearUser();
    setUser(null);
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setIsAuthModalOpen(false);
  };

  // Synchronize route with window.location.pathname (/orders)
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      if (path === '/orders' || path === '/orders/') {
        setActiveView('orders');
      } else if (path === '/compare' || path === '/compare/') {
        setActiveView('compare');
      } else {
        // default workspace
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  // Update browser URL on activeView change
  const handleNavigateView = (view) => {
    setActiveView(view);
    if (view === 'orders') {
      window.history.pushState(null, '', '/orders');
    } else if (view === 'compare') {
      window.history.pushState(null, '', '/compare');
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  // Fetch total completed / verified orders count for sidebar badge
  useEffect(() => {
    api.getOrders()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setOrdersCount(res.data.length);
        }
      })
      .catch(() => {});
  }, [latestPaidOrder, user]);

  // Fetch catalog products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, metaRes] = await Promise.all([
        api.getProducts(filters),
        api.getCatalogMeta()
      ]);

      setProducts(prodRes.data || []);
      setMeta(metaRes.data || null);
      setBackendConnected(true);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err.message);
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handlers for filters
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectExample = (example) => {
    setFilters((prev) => ({
      ...prev,
      search: example.search || '',
      maxBudget: example.maxBudget || prev.maxBudget,
      minRam: example.minRam || prev.minRam,
      gpuType: example.gpuType || 'any',
      upgradableOnly: Boolean(example.upgradableOnly),
      sortBy: 'price_asc'
    }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDecisionReport(null);
    setAiError(null);
  };

  // AI Assistant Handler — returns true on success so callers can clear their input
  const handleAskAi = async (message, options = {}) => {
    setIsAiLoading(true);
    setAiError(null);
    setDecisionReport(null);
    setClarifyingData(null);
    setConversationHistory([{ role: 'user', content: message }]);
    try {
      const res = await api.askAssistant(message, options);
      if (res.success && res.data) {
        if (res.data.needsClarification) {
          setClarifyingData(res.data);
        } else {
          setDecisionReport(res.data);
          if (res.data.assistantReply) {
            setConversationHistory((prev) => [
              ...prev,
              { role: 'assistant', content: res.data.assistantReply }
            ]);
          }
        }
        return true; // ✅ success — caller can safely clear its input
      } else {
        throw new Error(res.error?.message || 'Could not generate decision report.');
      }
    } catch (err) {
      console.error('Assistant error:', err);
      setAiError(err.message || 'Failed to contact AI Shopping Assistant.');
      return false; // ❌ failure — caller should keep the query visible
    } finally {
      setIsAiLoading(false);
    }
  };

  // Follow-up refinement chat handler (Multi-Turn)
  const handleFollowUpChat = async (refinementMessage) => {
    if (!refinementMessage || isAiLoading) return;
    setIsAiLoading(true);
    setAiError(null);
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: refinementMessage }
    ];
    setConversationHistory(updatedHistory);

    try {
      const res = await api.askAssistant(refinementMessage, {
        conversationHistory: updatedHistory,
        previousRequirements: decisionReport?.interpretedRequirements
      });

      if (res.success && res.data) {
        setDecisionReport(res.data);
        if (res.data.assistantReply) {
          setConversationHistory((prev) => [
            ...prev,
            { role: 'assistant', content: res.data.assistantReply }
          ]);
        }
      } else {
        throw new Error(res.error?.message || 'Could not refine recommendations.');
      }
    } catch (err) {
      console.error('Follow-up chat error:', err);
      setAiError(err.message || 'Failed to refine recommendations.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // User selects a clarifying profile option → re-run with forceRecommend
  const handleClarifyingOptionSelect = (option) => {
    setClarifyingData(null);
    handleAskAi(option.query, { forceRecommend: true });
  };

  // Agent recommends a product → stage it in cart for explicit review
  const handleAddToCart = (product, quantity, matchScore, reason) => {
    setCartItem({ product, quantity: quantity || 1, matchScore, recommendationReason: reason });
    setIsCartOpen(true);
  };

  // User approves cart → open PayPal checkout modal
  const handleCartApprove = (approvedCartItem) => {
    setIsCartOpen(false);
    setCartItem(null);
    setOrderProduct(approvedCartItem.product);
  };

  // Apply extracted requirements from Decision Report into the catalog filters
  const handleApplyAiFilters = (requirements) => {
    setFilters((prev) => ({
      ...prev,
      maxBudget: requirements.maxBudget || prev.maxBudget,
      minRam: requirements.minRam || prev.minRam,
      gpuType: requirements.gpuPreference || 'any',
      upgradableOnly: Boolean(requirements.prioritizeUpgradability),
      search: ''
    }));
  };

  // Direct comparison trigger from Decision Report
  const handleCompareDirectly = (primaryId, altId) => {
    setComparedIds([primaryId, altId]);
    setIsCompareModalOpen(true);
  };

  // Compare Toggle
  const handleToggleCompare = (productId) => {
    setComparedIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 3) {
        return prev; // Maximum 3
      }
      return [...prev, productId];
    });
  };

  const handleRemoveCompare = (productId) => {
    setComparedIds((prev) => prev.filter((id) => id !== productId));
  };

  const handleClearCompare = () => {
    setComparedIds([]);
  };

  const comparedProducts = products.filter((p) => comparedIds.includes(p.id));

  // Determine active workflow step
  let currentWorkflowStep = 1;
  if (latestPaidOrder) {
    currentWorkflowStep = 5;
  } else if (orderProduct) {
    currentWorkflowStep = 4;
  } else if (isCartOpen) {
    currentWorkflowStep = 4;
  } else if (decisionReport) {
    currentWorkflowStep = 3;
  } else if (clarifyingData) {
    currentWorkflowStep = 2;
  } else if (comparedIds.length >= 2) {
    currentWorkflowStep = 3;
  } else if (products.length > 0) {
    currentWorkflowStep = 2;
  }

  return (
    <div className="min-h-screen flex bg-paypilot-bg text-paypilot-text">
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={handleNavigateView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        compareCount={comparedIds.length}
        ordersCount={ordersCount}
        onNewSession={handleResetFilters}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          totalProducts={meta?.totalProducts || products.length}
          backendConnected={backendConnected}
          onRefresh={loadProducts}
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28">
          {/* VIEW: MY ORDERS */}
          {activeView === 'orders' ? (
            <OrdersPage
              onNavigateToShopping={() => handleNavigateView('workspace')}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              user={user}
            />
          ) : (
            <>
              {/* Visual Workflow Steps Bar */}
              <WorkflowSteps currentStep={currentWorkflowStep} />

              {/* Search & AI Assistant Hero Area */}
              <SearchHero
                searchQuery={filters.search}
                onSearchChange={(val) => handleFilterChange('search', val)}
                onSelectExample={handleSelectExample}
                onReset={handleResetFilters}
                onAskAi={handleAskAi}
                isAiLoading={isAiLoading}
                aiError={aiError}
              />

              {/* AI Analyzing Loading State (only shown on initial query when no report exists yet) */}
              {isAiLoading && !decisionReport && (
                <div className="bg-gradient-to-r from-paypilot-subtleViolet via-white to-paypilot-subtleViolet border-2 border-paypilot-brand/30 rounded-3xl p-8 text-center space-y-4 mb-8 shadow-card animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-paypilot-brand text-white mx-auto flex items-center justify-center shadow-subtle">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-paypilot-navy">
                      Analyzing Your Shopping Goal with Google Gemini...
                    </h3>
                    <p className="text-xs text-paypilot-muted max-w-md mx-auto">
                      Extracting workload requirements, matching across 32 verified laptop records, and synthesizing your grounded Shopping Decision Report.
                    </p>
                  </div>
                </div>
              )}

              {/* Clarifying Question Card */}
              {clarifyingData && !isAiLoading && (
                <ClarifyingQuestionCard
                  data={clarifyingData}
                  onSelectOption={handleClarifyingOptionSelect}
                  onDismiss={() => setClarifyingData(null)}
                  isLoading={isAiLoading}
                />
              )}

              {/* Grounded Shopping Decision Report with Multi-Turn AI Chat */}
              {decisionReport && (
                <ShoppingDecisionReport
                  report={decisionReport}
                  onClose={() => {
                    setDecisionReport(null);
                    setConversationHistory([]);
                  }}
                  onViewDetails={setDetailProduct}
                  onToggleCompare={handleToggleCompare}
                  onAddToCart={handleAddToCart}
                  onProceedToOrder={setOrderProduct}
                  comparedIds={comparedIds}
                  onApplyFilters={handleApplyAiFilters}
                  onCompareDirectly={handleCompareDirectly}
                  conversationHistory={conversationHistory}
                  onFollowUpChat={handleFollowUpChat}
                  isAiLoading={isAiLoading}
                  aiError={aiError}
                />
              )}

              {/* Filter and Sorting Controls */}
              <FilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                totalResults={products.length}
              />

              {/* Workspace Layout: Grid + Preferences Sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Products Grid (8 cols on desktop) */}
                <div className="lg:col-span-8">
                  <ProductGrid
                    products={products}
                    loading={loading}
                    error={error}
                    onRetry={loadProducts}
                    onResetFilters={handleResetFilters}
                    onViewDetails={setDetailProduct}
                    onToggleCompare={handleToggleCompare}
                    onProceedToOrder={setOrderProduct}
                    comparedIds={comparedIds}
                  />
                </div>

                {/* Right Preferences & Transparency Summary (4 cols on desktop) */}
                <div className="lg:col-span-4 sticky top-24">
                  <PreferencesPanel
                    filters={filters}
                    totalResults={products.length}
                    meta={meta}
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Sticky Bottom Comparison Drawer */}
      <ComparisonDrawer
        comparedProducts={comparedProducts}
        onRemove={handleRemoveCompare}
        onClear={handleClearCompare}
        onOpenModal={() => setIsCompareModalOpen(true)}
      />

      {/* Product Deep-Dive Specifications Modal */}
      <ProductDetailModal
        product={detailProduct}
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        onToggleCompare={handleToggleCompare}
        onProceedToOrder={setOrderProduct}
        isCompared={detailProduct ? comparedIds.includes(detailProduct.id) : false}
      />

      {/* Side-by-Side Product Comparison Modal */}
      <ComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        productIds={comparedIds}
        onRemoveProduct={handleRemoveCompare}
      />

      {/* PayPal Sandbox Order Review & Checkout Modal */}
      <OrderReviewModal
        product={orderProduct}
        isOpen={Boolean(orderProduct)}
        onClose={() => setOrderProduct(null)}
        onOrderSuccess={(order) => {
          setLatestPaidOrder(order);
        }}
      />

      {/* Cart Review Modal — explicit user approval before checkout */}
      <CartReviewModal
        isOpen={isCartOpen}
        onClose={() => { setIsCartOpen(false); setCartItem(null); }}
        cartItem={cartItem}
        onUpdateQuantity={(q) => setCartItem((prev) => ({ ...prev, quantity: q }))}
        onApproveAndCheckout={handleCartApprove}
        onContinueShopping={() => { setIsCartOpen(false); setCartItem(null); }}
        currency="USD"
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
