import crypto from 'crypto';

/**
 * Compute SHA-256 hex digest of a Buffer or string.
 * @param {Buffer|string} data 
 * @returns {string} 64-character lowercase hex string
 */
export function calculateSHA256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
