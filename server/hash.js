// 密码哈希与令牌（无数据库依赖，供 db.js 播种和 auth.js 共用）
// Password hashing & tokens — no DB dependency so both db.js seeding and auth.js can use it.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(pw), salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(pw, salt, hash) {
  const h = scryptSync(String(pw), salt, 64).toString('hex');
  const a = Buffer.from(h, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function newToken() {
  return randomBytes(24).toString('hex');
}
