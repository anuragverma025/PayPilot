import crypto from 'crypto';

/**
 * Guest Order Token Utility
 *
 * Provides cryptographically secure random token generation and constant-time SHA-256
 * hashing. The raw token is sent only once to the client (or received via header) and
 * NEVER stored directly in the database.
 */

/**
 * Generate a cryptographically secure guest token.
 * Uses 32 random bytes encoded as hex (64 characters).
 */
export function generateGuestToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of a guest token.
 * This is what gets indexed and saved in MongoDB / memory store.
 */
export function hashGuestToken(token) {
  if (!token || typeof token !== 'string') return null;
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Verify a candidate raw token against a stored token hash in constant time.
 */
export function verifyGuestToken(candidateToken, storedHash) {
  if (!candidateToken || !storedHash) return false;
  const candidateHash = hashGuestToken(candidateToken);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}