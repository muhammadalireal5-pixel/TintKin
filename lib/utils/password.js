import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import bcrypt from 'bcryptjs';

const ARGON_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const isArgonHash = (hash) => typeof hash === 'string' && hash.startsWith('$argon2');

export function hashPassword(password) {
  return argonHash(password, ARGON_OPTIONS);
}

export async function verifyPassword(password, hash) {
  if (typeof hash !== 'string' || !hash) return false;
  if (isArgonHash(hash)) return argonVerify(hash, password).catch(() => false);
  return bcrypt.compare(password, hash);
}

export const needsRehash = (hash) => !isArgonHash(hash);
