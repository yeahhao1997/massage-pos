// 登录 / 当前用户 / 登出 / 改密码
import { Router } from 'express';
import { db } from '../db.js';
import { login, logout, publicUser, requireAuth } from '../auth.js';
import { hashPassword, verifyPassword } from '../hash.js';

const r = Router();

// 简易登录限流：同一 IP 每分钟最多 10 次尝试，防暴力破解
const attempts = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, ts: now };
  if (now - rec.ts > 60_000) { rec.count = 0; rec.ts = now; }
  rec.count++;
  attempts.set(ip, rec);
  if (rec.count > 10) return res.status(429).json({ error: '尝试过于频繁，请1分钟后再试' });
  next();
}

r.post('/login', rateLimit, (req, res) => {
  const { username, password } = req.body;
  const result = login(username, password);
  if (!result) return res.status(401).json({ error: '账号或密码错误' });
  res.json(result);
});

r.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

r.post('/logout', requireAuth, (req, res) => {
  logout(req.token);
  res.json({ ok: true });
});

// 修改自己的密码
r.post('/password', requireAuth, (req, res) => {
  const { old_password, new_password } = req.body;
  if (!new_password || String(new_password).length < 6) return res.status(400).json({ error: '新密码至少6位' });
  if (!verifyPassword(old_password, req.user.pass_salt, req.user.pass_hash)) return res.status(400).json({ error: '原密码不正确' });
  const { salt, hash } = hashPassword(new_password);
  db.prepare('UPDATE users SET pass_hash = ?, pass_salt = ? WHERE id = ?').run(hash, salt, req.user.id);
  // 注销其它会话，仅保留当前
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(req.user.id, req.token);
  res.json({ ok: true });
});

export default r;
