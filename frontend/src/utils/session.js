const GUEST_TOKEN_KEY = 'paypilot_guest_session_token';

/**
 * Guest Session Token Management Utility
 *
 * Stores the client's cryptographically secure guest session token in localStorage.
 * This token is attached as the `x-guest-token` header to all order requests.
 */

export const guestSession = {
  /**
   * Retrieve active guest session token from storage
   */
  getToken: () => {
    try {
      return localStorage.getItem(GUEST_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  },

  /**
   * Save or update guest session token
   */
  setToken: (token) => {
    try {
      if (token && typeof token === 'string') {
        localStorage.setItem(GUEST_TOKEN_KEY, token.trim());
      }
    } catch (e) {
      console.warn('Unable to persist guest session token to localStorage:', e);
    }
  },

  /**
   * Clear active token
   */
  clearToken: () => {
    try {
      localStorage.removeItem(GUEST_TOKEN_KEY);
    } catch {}
  }
};