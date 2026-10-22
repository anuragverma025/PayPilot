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
import { api } from './services/api';

const DEFAULT_FILTERS = {
  search: '',
  maxBudget: 85000,
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

  // Modals & Comparison State
  const [detailProduct, setDetailProduct] = useState(null);
  const [comparedIds, setComparedIds] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen flex bg-paypilot-bg text-paypilot-text">
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        compareCount={comparedIds.length}
        onNewSession={handleResetFilters}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          totalProducts={meta?.totalProducts || products.length}
          backendConnected={backendConnected}
          onRefresh={loadProducts}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28">
          {/* Visual Workflow Steps Bar */}
          <WorkflowSteps currentStep={comparedIds.length >= 2 ? 3 : 2} />

          {/* Search Hero Area */}
          <SearchHero
            searchQuery={filters.search}
            onSearchChange={(val) => handleFilterChange('search', val)}
            onSelectExample={handleSelectExample}
            onReset={handleResetFilters}
          />

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
        isCompared={detailProduct ? comparedIds.includes(detailProduct.id) : false}
      />

      {/* Side-by-Side Product Comparison Modal */}
      <ComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        productIds={comparedIds}
        onRemoveProduct={handleRemoveCompare}
      />
    </div>
  );
}
