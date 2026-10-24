/**
 * Field-level encryption for health-related answers (AES-256-GCM), so a copy of
 * the database or a future admin view does not expose them in plaintext.
 *
 * Format: "enc:v1:<iv>:<tag>:<ciphertext>" (base64). Values without the prefix
 * are legacy plaintext and are returned as they are, so existing rows keep
 * working until they are migrated (scripts/encrypt-health-fields.mjs).
 *
 * Key: FIELD_ENCRYPTION_KEY, 32 bytes as base64 or 64 hex characters. The same
 * key must be used by every environment that shares a database.
 *  - encrypt without a key: throws in production (fail closed, nothing is stored
 *    in plaintext by accident); outside production the value is stored as is.
 *  - decrypt without a key, or with a wrong key or tampered data: returns null,
 *    which callers treat as "unknown" (the plan engine then takes the cautious
 *    option).
 */
import crypto from 'node:crypto';

const PREFIX = 'enc:v1:';

function getKey() {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  return buf.length === 32 ? buf : null;
}

export const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX);

export function encryptField(value) {
  if (value == null || value === '' || isEncrypted(value)) return value;
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('FIELD_ENCRYPTION_KEY is not set or is not 32 bytes');
    return value;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${data.toString('base64')}`;
}

export function decryptField(value) {
  if (!isEncrypted(value)) return value;
  const key = getKey();
  if (!key) return null;
  try {
    const [iv, tag, data] = value.slice(PREFIX.length).split(':').map((p) => Buffer.from(p, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Encrypts the health-related answers of a skinProfile object. The schema
 * setters already do this on both new documents and updates; writes seal
 * explicitly as well so the guarantee never depends on that detail.
 */
export function sealSkinProfile(profile) {
  if (!profile) return profile;
  return { ...profile, sensitivity: encryptField(profile.sensitivity), pregnancy: encryptField(profile.pregnancy) };
}
