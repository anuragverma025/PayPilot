const GUEST_TOKEN_KEY = 'paypilot_guest_session_token';
const AUTH_TOKEN_KEY = 'paypilot_auth_token';
const AUTH_USER_KEY = 'paypilot_auth_user';

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

/**
 * User Auth Session Management Utility
 */
export const authSession = {
  getToken: () => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    try {
      if (token && typeof token === 'string') {
        localStorage.setItem(AUTH_TOKEN_KEY, token.trim());
      }
    } catch (e) {
      console.warn('Unable to persist auth token to localStorage:', e);
    }
  },
  clearToken: () => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {}
  },
  getUser: () => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      }
    } catch (e) {
      console.warn('Unable to persist auth user to localStorage:', e);
    }
  },
  clearUser: () => {
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {}
  }
};