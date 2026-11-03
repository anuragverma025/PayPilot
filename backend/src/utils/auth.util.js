import crypto from 'crypto';

const AUTH_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'paypilot-secure-auth-secret-key-32chars!!';

/**
 * Hash password with salted crypto.scrypt
 * Returns salt:hash format
 */
export function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify candidate password against stored salt:hash in constant time
 */
export function verifyPassword(password, storedCombined) {
  if (!password || !storedCombined || typeof storedCombined !== 'string' || !storedCombined.includes(':')) {
    return false;
  }
  try {
    const [salt, key] = storedCombined.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Generate HMAC-SHA256 signed session token
 * Token format: <base64url_payload>.<signature_hex>
 */
export function generateAuthToken(user, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const userId = String(user._id || user.id);
  const payload = {
    userId,
    email: user.email,
    name: user.name,
    exp: Date.now() + expiresInMs
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', AUTH_SECRET);
  hmac.update(payloadStr);
  const signature = hmac.digest('hex');
  return `${payloadStr}.${signature}`;
}

/**
 * Verify HMAC-signed session token
 */
export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }
  const [payloadStr, signature] = token.split('.');
  if (!payloadStr || !signature) {
    return null;
  }

  const hmac = crypto.createHmac('sha256', AUTH_SECRET);
  hmac.update(payloadStr);
  const expectedSignature = hmac.digest('hex');

  try {
    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    if (!isSigValid) return null;

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Token expired
    }
    return payload;
  } catch {
    return null;
  }
}

