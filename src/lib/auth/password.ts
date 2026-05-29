/**
 * Password hashing (DL-19). bcryptjs (pure JS) avoids native bindings that are
 * awkward on serverless; cost 12 per the design.
 */
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
