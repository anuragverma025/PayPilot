import { verifyAuthToken } from '../utils/auth.util.js';

/**
 * Optional authentication middleware.
 * If Authorization: Bearer <token> is present, verifies and sets req.user.
 * If not present or invalid, proceeds without failing (allowing guest operations).
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.substring(7).trim();
    const payload = verifyAuthToken(rawToken);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

/**
 * Required authentication middleware.
 * Returns 401 if user is not authenticated.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'You must be signed in to access this resource.'
      }
    });
  }

  const rawToken = authHeader.substring(7).trim();
  const payload = verifyAuthToken(rawToken);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session has expired or is invalid. Please sign in again.'
      }
    });
  }

  req.user = payload;
  next();
}

/**
 * Extract unified auth context from request:
 * Returns null if neither user nor guest token is provided.
 */
export function extractAuthContext(req) {
  let user = req.user || null;
  if (!user && req.headers.authorization?.startsWith('Bearer ')) {
    user = verifyAuthToken(req.headers.authorization.substring(7).trim());
  }

  const guestToken =
    req.headers['x-guest-token'] ||
    req.body?.guestToken ||
    null;

  if (!user && (!guestToken || typeof guestToken !== 'string' || guestToken.trim().length === 0)) {
    return null;
  }

  return {
    user,
    userId: user ? String(user.userId || user.id) : null,
    guestToken: guestToken ? String(guestToken).trim() : null
  };
}
