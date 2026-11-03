import React, { useState } from 'react';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { authSession, guestSession } from '../../utils/session';

export function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [claimOrders, setClaimOrders] = useState(true);
  const [claimNotice, setClaimNotice] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setClaimNotice(null);
    setLoading(true);

    try {
      let result;
      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        result = await api.register({
          name: name.trim(),
          email: email.trim(),
          password
        });
      } else {
        result = await api.login({
          email: email.trim(),
          password
        });
      }

      if (!result.success || !result.data?.token) {
        throw new Error(result.error?.message || 'Authentication failed.');
      }

      const { user, token } = result.data;
      authSession.setToken(token);
      authSession.setUser(user);

      // Optionally claim guest orders if user has guest tokens
      const guestToken = guestSession.getToken();
      if (claimOrders && guestToken) {
        try {
          const claimRes = await api.claimGuestOrders(guestToken);
          if (claimRes.success && claimRes.data?.claimedCount > 0) {
            setClaimNotice(`Linked ${claimRes.data.claimedCount} previous guest order(s) to your account!`);
          }
        } catch (claimErr) {
          console.warn('Guest orders claim failed:', claimErr.message);
        }
      }

      if (onAuthSuccess) {
        onAuthSuccess(user);
      }

      setTimeout(() => {
        onClose();
      }, claimNotice ? 1200 : 300);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setClaimNotice(null);
  };

  const hasGuestToken = Boolean(guestSession.getToken());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Sign In to PayPilot' : 'Create PayPilot Account'}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Toggle Mode Tabs */}
        <div className="flex bg-[#F1F5F9] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Informational Subtitle */}
        <p className="text-xs text-[#64748B] text-center">
          {mode === 'login'
            ? 'Sign in to access your saved order history and manage your purchases.'
            : 'Register to associate your orders with a personal account.'}
        </p>

        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#DC2626]/20 text-[#DC2626] text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Claim Notice */}
        {claimNotice && (
          <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#16A34A]/20 text-[#16A34A] text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{claimNotice}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alice Smith"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF]"
              />
            </div>
            {mode === 'register' && (
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Must be at least 8 characters long.
              </p>
            )}
          </div>

          {/* Claim previous guest purchases checkbox */}
          {hasGuestToken && (
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#475569]">
                <input
                  type="checkbox"
                  checked={claimOrders}
                  onChange={(e) => setClaimOrders(e.target.checked)}
                  className="rounded text-[#635BFF] focus:ring-[#635BFF] w-3.5 h-3.5"
                />
                <span>Link current session orders to this account</span>
              </label>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#635BFF] hover:bg-[#4F46E5] active:bg-[#4338CA] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Guest reminder */}
        <div className="pt-2 border-t border-[#E2E8F0] text-center">
          <p className="text-[11px] text-[#94A3B8]">
            Guest checkout is always supported without creating an account.
          </p>
        </div>
      </div>
    </Modal>
  );
}

