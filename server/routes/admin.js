// 平台管理员：门店入驻管理、店间结算、全平台概览
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { hashPassword } from '../hash.js';

const r = Router();
r.use(requireAuth, requireRole('platform_admin'));

// 门店列表（含会员/订单数概况）
r.get('/tenants', (req, res) => {
  const rows = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM staff s WHERE s.tenant_id = t.id AND s.active = 1) AS staff_count,
      (SELECT COUNT(*) FROM orders o WHERE o.tenant_id = t.id)                 AS order_count
    FROM tenants t ORDER BY t.id`).all();
  res.json(rows);
});

// 新增门店（同时建一个店老板账号）
r.post('/tenants', (req, res) => {
  const { name, city, address, phone, intro, photo, owner_username, owner_password } = req.body;
  if (!name) return res.status(400).json({ error: '门店名称必填' });
  if (!owner_username || !owner_password) return res.status(400).json({ error: '店老板账号和密码必填' });

  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(owner_username);
  if (exists) return res.status(409).json({ error: '该账号已存在' });

  const tx = db.transaction(() => {
    const tid = db.prepare('INSERT INTO tenants (name, city, address, phone, intro, photo) VALUES (?,?,?,?,?,?)')
      .run(name, city || null, address || null, phone || null, intro || null, photo || null).lastInsertRowid;
    const { salt, hash } = hashPassword(owner_password);
    db.prepare(`INSERT INTO users (username, pass_hash, pass_salt, role, tenant_id, name)
                VALUES (?,?,?,'shop_owner',?,?)`).run(owner_username, hash, salt, tid, name + ' 店老板');
    return db.prepare('SELECT * FROM tenants WHERE id = ?').get(tid);
  });
  res.json(tx());
});

// 停用 / 启用门店
r.put('/tenants/:id', (req, res) => {
  const { status, name, city, address, phone, intro, photo } = req.body;
  const t = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: '门店不存在' });
  db.prepare('UPDATE tenants SET status=?, name=?, city=?, address=?, phone=?, intro=?, photo=? WHERE id=?')
    .run(status ?? t.status, name ?? t.name, city ?? t.city, address ?? t.address, phone ?? t.phone, intro ?? t.intro, photo ?? t.photo, t.id);
  res.json(db.prepare('SELECT * FROM tenants WHERE id = ?').get(t.id));
});

// ⭐ 店间结算：每家店「收的充值款」vs「核销的服务额」= 与平台的净额
// collected 收款（充值进了该店）/ redeemed 核销（该店用余额提供了服务）
// net = collected - redeemed：正数=该店欠平台，负数=平台欠该店
r.get('/settlement', (req, res) => {
  const today = db.prepare(`SELECT date('now','localtime') AS d`).get().d;
  const from = req.query.from || today;
  const to = req.query.to || today;
  const rows = db.prepare(`
    SELECT t.id, t.name, t.city,
      COALESCE(SUM(CASE WHEN tx.type='recharge' THEN tx.amount ELSE 0 END),0)        AS collected,
      COALESCE(SUM(CASE WHEN tx.type='consume'  THEN -tx.amount ELSE 0 END),0)       AS redeemed
    FROM tenants t
    LEFT JOIN transactions tx
      ON tx.tenant_id = t.id AND date(tx.created_at) BETWEEN ? AND ?
    GROUP BY t.id ORDER BY t.id`).all(from, to);
  const result = rows.map((x) => ({ ...x, net: x.collected - x.redeemed }));
  res.json({ from, to, rows: result });
});

// 全平台概览
r.get('/overview', (req, res) => {
  const today = db.prepare(`SELECT date('now','localtime') AS d`).get().d;
  const from = req.query.from || today, to = req.query.to || today;
  const tenants = db.prepare('SELECT COUNT(*) AS n FROM tenants WHERE status=\'active\'').get().n;
  const members = db.prepare('SELECT COUNT(*) AS n FROM members').get().n;
  const walletLiability = db.prepare('SELECT COALESCE(SUM(balance),0) AS s FROM members').get().s;
  const sales = db.prepare(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders WHERE date(created_at) BETWEEN ? AND ?`
  ).get(from, to);
  const recharge = db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE type='recharge' AND date(created_at) BETWEEN ? AND ?`
  ).get(from, to).s;
  res.json({ from, to, tenants, members, wallet_liability: walletLiability, recharge, ...sales });
});

export default r;
