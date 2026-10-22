import React, { useEffect, useState } from 'react';
import { Layers, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ProductImage } from '../products/ProductImage';
import { api } from '../../services/api';

export function ComparisonModal({
  isOpen,
  onClose,
  productIds,
  onRemoveProduct
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && productIds.length >= 2) {
      setLoading(true);
      setError(null);
      api
        .compareProducts(productIds)
        .then((res) => {
          setData(res.data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [isOpen, productIds]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Side-by-Side Product Comparison" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {loading && (
          <div className="py-12 text-center text-sm text-paypilot-muted">
            Analyzing hardware specifications and evaluating trade-offs...
          </div>
        )}

        {error && (
          <div className="p-4 bg-paypilot-errorBg text-paypilot-error rounded-xl text-xs">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Products Header Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-paypilot-border">
              {data.products.map((p, idx) => (
                <div key={p.id} className="p-3.5 bg-paypilot-bg rounded-xl border border-paypilot-border relative space-y-2 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-paypilot-muted">
                      Option {idx + 1} • {p.brand}
                    </span>
                    <button
                      onClick={() => onRemoveProduct(p.id)}
                      className="text-paypilot-muted hover:text-paypilot-text p-1"
                      title="Remove from comparison"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail Image / Placeholder */}
                  <div className="h-24 w-full rounded-lg overflow-hidden border border-paypilot-border/60">
                    <ProductImage product={p} variant="card" className="h-24 w-full" />
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-paypilot-text line-clamp-1">{p.name}</h4>
                  <div className="text-sm sm:text-base font-bold text-paypilot-brand tabular-nums">
                    ₹{p.priceINR.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            {/* Critical Divergence / Differences Analysis */}
            {data.differences && data.differences.length > 0 && (
              <div className="p-4 bg-paypilot-subtleViolet/40 border border-paypilot-brand/20 rounded-xl space-y-2">
                <h5 className="text-xs font-bold text-paypilot-brand uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-paypilot-brand" />
                  <span>Key Analytical Differences</span>
                </h5>
                <ul className="space-y-1.5 text-xs text-paypilot-text">
                  {data.differences.map((diff, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <strong className="text-paypilot-navy font-semibold">{diff.aspect}:</strong>
                      <span>{diff.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Spec Matrix Table */}
            <div className="overflow-x-auto border border-paypilot-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-paypilot-bg border-b border-paypilot-border">
                    <th className="py-2.5 px-3 font-semibold text-paypilot-muted w-1/4">Feature</th>
                    {data.products.map((p) => (
                      <th key={p.id} className="py-2.5 px-3 font-semibold text-paypilot-text">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-paypilot-border/70">
                  {data.matrix.map((row) => (
                    <tr key={row.attribute} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-paypilot-muted bg-paypilot-bg/30">
                        {row.attribute}
                      </td>
                      {row.values.map((val, idx) => {
                        const isBest = row.bestIndex === idx;
                        return (
                          <td
                            key={idx}
                            className={`py-2.5 px-3 tabular-nums ${
                              isBest
                                ? 'bg-paypilot-successBg/40 text-paypilot-success font-semibold'
                                : 'text-paypilot-text'
                            }`}
                          >
                            {val}
                            {isBest && (
                              <span className="ml-1.5 text-[10px] uppercase font-bold text-paypilot-success">
                                (Best)
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sample Data Disclosure */}
            <div className="flex items-center gap-2 text-[11px] text-paypilot-muted">
              <ShieldAlert className="w-3.5 h-3.5 text-paypilot-brand flex-shrink-0" />
              <span>
                All specifications are compiled from public manufacturer data for the PayPal AI Hackathon evaluation.
              </span>
            </div>
          </>
        )}

        <div className="flex justify-end pt-3 border-t border-paypilot-border">
          <Button variant="secondary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
