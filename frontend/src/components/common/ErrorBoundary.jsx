import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

/**
 * Production-grade React Error Boundary
 * Catches unhandled JavaScript runtime errors anywhere in the child component tree,
 * preventing full-page unmounting (white/blank screen) and providing graceful recovery.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PayPilot ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset
        });
      }

      const isInline = this.props.inline;

      if (isInline) {
        return (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{this.props.title || 'Component Error'}</span>
            </div>
            <p className="text-rose-700">
              {this.state.error?.message || 'A temporary display error occurred in this section.'}
            </p>
            <div className="pt-1">
              <Button variant="secondary" size="sm" onClick={this.handleReset} icon={RefreshCw}>
                Retry
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-paypilot-bg flex items-center justify-center p-6 text-paypilot-text">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-elevated border border-paypilot-border p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-subtle">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-paypilot-navy">
                Something unexpected occurred
              </h2>
              <p className="text-xs text-paypilot-muted leading-relaxed">
                PayPilot encountered an unexpected rendering error. Your session data and catalog state are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <p className="text-[11px] font-mono text-rose-700 break-words line-clamp-3">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={this.handleReset}
                icon={RefreshCw}
              >
                Try Again
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={this.handleReload}
                icon={Home}
              >
                Reload PayPilot
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
