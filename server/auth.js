// 认证与多商户作用域 / auth + tenant scoping middleware
import { db } from './db.js';
import { verifyPassword, newToken } from './hash.js';

export function login(username, password) {
  const u = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!u || !verifyPassword(password, u.pass_salt, u.pass_hash)) return null;
  const token = newToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?,?)').run(token, u.id);
  return { token, user: publicUser(u) };
}

export function logout(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function publicUser(u) {
  const tenant = u.tenant_id ? db.prepare('SELECT id, name, city FROM tenants WHERE id = ?').get(u.tenant_id) : null;
  return { id: u.id, username: u.username, role: u.role, name: u.name, tenant_id: u.tenant_id, staff_id: u.staff_id, tenant };
}

const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);

// 校验令牌，挂 req.user
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录' });
  const sess = db.prepare(
    `SELECT *, (julianday('now') - julianday(created_at)) AS age_days FROM sessions WHERE token = ?`
  ).get(token);
  if (!sess) return res.status(401).json({ error: '登录已失效，请重新登录' });
  if (sess.age_days > SESSION_DAYS) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
  const u = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(sess.user_id);
  if (!u) return res.status(401).json({ error: '账号不可用' });
  req.user = u;
  req.token = token;
  next();
}

// 角色限制
export function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: '无权限' });
}

// 解析当前操作的门店：店员锁定自己的店；平台管理员可用 ?tenant_id= 指定
export function resolveTenant(req, res, next) {
  if (req.user.role === 'platform_admin') {
    const tid = req.query.tenant_id || req.body?.tenant_id;
    if (!tid) return res.status(400).json({ error: '平台管理员需指定 tenant_id' });
    req.tenantId = Number(tid);
  } else {
    req.tenantId = req.user.tenant_id;
  }
  next();
}
