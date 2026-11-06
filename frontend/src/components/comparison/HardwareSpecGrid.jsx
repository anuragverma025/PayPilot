import React, { useMemo, useState, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { Download, Search, Sparkles, Check, Plus, ExternalLink, Layers } from 'lucide-react';
import { formatINR, formatUSD } from '../../utils/formatters';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

export function HardwareSpecGrid({
  products = [],
  comparedIds = [],
  onToggleCompare,
  onViewDetails,
  onProceedToOrder
}) {
  const gridRef = useRef(null);
  const [quickFilterText, setQuickFilterText] = useState('');

  // Normalize compared IDs to strings
  const cleanComparedIds = useMemo(() => {
    return (comparedIds || []).map((c) => (typeof c === 'object' && c !== null ? c.id : c)).filter(Boolean);
  }, [comparedIds]);

  // Custom Quartz Theme with PayPilot brand accents
  const paypilotTheme = useMemo(() => {
    return themeQuartz.withParams({
      accentColor: '#635BFF',
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      headerBackgroundColor: '#F8FAFC',
      headerTextColor: '#0F172A',
      headerFontWeight: '700',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '12px',
      rowBorder: true,
      rowHoverColor: '#F1F5F9'
    });
  }, []);

  // Row Data mapped from verified catalog records
  const rowData = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      model: p.model,
      priceINR: p.priceINR,
      priceUSD: p.priceUSD,
      processor: `${p.processor?.brand} ${p.processor?.model} (${p.processor?.cores}c)`,
      cpuCores: p.processor?.cores || 0,
      ramGB: p.ram?.capacityGB || 0,
      isRamUpgradable: p.ram?.isUpgradable || false,
      ramType: p.ram?.type || 'DDR5',
      gpuModel: p.gpu?.type === 'dedicated' ? `${p.gpu.model} (${p.gpu.vramGB}GB)` : 'Integrated',
      gpuType: p.gpu?.type || 'integrated',
      vramGB: p.gpu?.vramGB || 0,
      storageGB: p.storage?.capacityGB || 512,
      hasExtraSlot: p.storage?.extraSlot || false,
      display: `${p.display?.sizeInches}" ${p.display?.panelType || 'IPS'} (${p.display?.refreshRateHz || 60}Hz)`,
      batteryHours: p.battery?.realWorldHoursEstimate || 0,
      weightKg: p.weightKg || 0,
      targetAudience: p.targetAudience?.join(', ') || '',
      imageUrl: p.imageUrl || `/images/products/${p.id}.webp`,
      rawProduct: p
    }));
  }, [products]);

  // Column Definitions
  const columnDefs = useMemo(() => [
    {
      headerName: 'Laptop Model',
      field: 'name',
      pinned: 'left',
      minWidth: 260,
      flex: 2,
      cellRenderer: (params) => {
        const p = params.data;
        if (!p) return null;
        return (
          <div className="flex items-center gap-2.5 py-1">
            <img
              src={p.imageUrl}
              alt={p.name}
              className="w-10 h-7 object-contain rounded bg-slate-50 border border-slate-200 flex-shrink-0"
              onError={(e) => {
                e.currentTarget.src = '/images/products/fallback-laptop.svg';
              }}
            />
            <div className="min-w-0">
              <span className="font-semibold text-paypilot-navy truncate block text-xs leading-tight">
                {p.name}
              </span>
              <span className="text-[10px] text-paypilot-muted block truncate">
                {p.model}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      headerName: 'Brand',
      field: 'brand',
      width: 100,
      cellRenderer: (params) => (
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
          {params.value}
        </span>
      )
    },
    {
      headerName: 'Price (INR)',
      field: 'priceINR',
      width: 120,
      sort: 'asc',
      valueFormatter: (params) => formatINR(params.value),
      cellClass: 'font-semibold text-paypilot-brand tabular-nums'
    },
    {
      headerName: 'Price (USD)',
      field: 'priceUSD',
      width: 105,
      valueFormatter: (params) => formatUSD(params.value),
      cellClass: 'text-slate-600 tabular-nums'
    },
    {
      headerName: 'Processor',
      field: 'processor',
      minWidth: 190,
      flex: 1
    },
    {
      headerName: 'RAM & Upgradability',
      field: 'ramGB',
      width: 170,
      cellRenderer: (params) => {
        const p = params.data;
        if (!p) return null;
        return (
          <div className="flex items-center gap-1.5 py-1">
            <span className="font-bold text-slate-800 text-xs">{p.ramGB}GB</span>
            {p.isRamUpgradable ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                SO-DIMM Upgradable
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Soldered
              </span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Graphics / GPU',
      field: 'gpuModel',
      width: 180,
      cellRenderer: (params) => {
        const p = params.data;
        if (!p) return null;
        return p.gpuType === 'dedicated' ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 truncate block">
            {p.gpuModel}
          </span>
        ) : (
          <span className="text-slate-500 text-xs">Integrated</span>
        );
      }
    },
    {
      headerName: 'Storage',
      field: 'storageGB',
      width: 120,
      cellRenderer: (params) => {
        const p = params.data;
        if (!p) return null;
        return (
          <span className="text-xs text-slate-700">
            {p.storageGB >= 1000 ? `${p.storageGB / 1000}TB` : `${p.storageGB}GB`}
            {p.hasExtraSlot && <span className="text-[9px] text-indigo-600 block">+ Open M.2 Slot</span>}
          </span>
        );
      }
    },
    {
      headerName: 'Display',
      field: 'display',
      minWidth: 170,
      flex: 1
    },
    {
      headerName: 'Real Battery',
      field: 'batteryHours',
      width: 110,
      valueFormatter: (params) => `~${params.value}h runtime`,
      cellClass: 'text-slate-700 tabular-nums'
    },
    {
      headerName: 'Weight',
      field: 'weightKg',
      width: 95,
      valueFormatter: (params) => `${params.value} kg`,
      cellClass: 'text-slate-600 tabular-nums'
    },
    {
      headerName: 'Actions',
      pinned: 'right',
      width: 140,
      sortable: false,
      filter: false,
      cellRenderer: (params) => {
        const p = params.data?.rawProduct;
        if (!p) return null;
        const isCompared = cleanComparedIds.includes(p.id);
        return (
          <div className="flex items-center gap-1.5 py-1">
            <button
              onClick={() => onToggleCompare && onToggleCompare(p.id)}
              className={`p-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                isCompared
                  ? 'bg-paypilot-brand text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-paypilot-brand border border-slate-200'
              }`}
              title={isCompared ? 'Remove from compare' : 'Add to compare'}
            >
              {isCompared ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              <span>{isCompared ? 'Added' : 'Compare'}</span>
            </button>
            <button
              onClick={() => onViewDetails && onViewDetails(p)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Inspect specifications"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        );
      }
    }
  ], [cleanComparedIds, onToggleCompare, onViewDetails]);

  // Export to CSV using AG Grid's native API
  const handleExportCsv = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: 'paypilot-laptop-specifications.csv'
      });
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* AG Grid Banner & Quick Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-paypilot-subtleViolet/60 via-white to-paypilot-subtleViolet/60 border border-paypilot-brand/20 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-paypilot-brand text-white font-bold text-[10px] tracking-wide flex items-center gap-1 shadow-subtle">
            <Layers className="w-3 h-3" />
            <span>AG Grid Spec Matrix</span>
          </div>
          <span className="text-xs text-paypilot-muted">
            Interactive OEM Hardware Matrix ({products.length} Laptops)
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Quick Filter */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              placeholder="Search specs (e.g. RTX, 16GB, Ryzen)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-paypilot-border bg-white text-xs text-paypilot-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-paypilot-brand/20 focus:border-paypilot-brand"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-paypilot-border text-xs font-semibold text-slate-700 shadow-xs transition-colors whitespace-nowrap"
            title="Export matrix as CSV"
          >
            <Download className="w-3.5 h-3.5 text-paypilot-brand" />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* AG Grid React Container */}
      <div className="rounded-2xl border border-paypilot-border overflow-hidden shadow-card" style={{ height: '520px', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          theme={paypilotTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          quickFilterText={quickFilterText}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 32]}
          rowHeight={48}
          headerHeight={40}
          animateRows={true}
          enableCellTextSelection={true}
        />
      </div>
    </div>
  );
}
