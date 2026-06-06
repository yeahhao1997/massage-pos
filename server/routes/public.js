// 顾客端公开接口（无需员工登录）：找店、看服务、在线预约、会员查钱包
import { Router } from 'express';
import { db } from '../db.js';
import { newToken } from '../hash.js';

const r = Router();

// 解析会员令牌（可选，不强制）/ optional member auth
function parseMember(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const s = db.prepare('SELECT member_id FROM member_sessions WHERE token = ?').get(token);
  return s ? s.member_id : null;
}
function requireMember(req, res, next) {
  const id = parseMember(req);
  if (!id) return res.status(401).json({ error: '请先登录会员' });
  req.memberId = id;
  next();
}

// 城市列表（用于筛选）
r.get('/cities', (_req, res) => {
  const rows = db.prepare(
    `SELECT DISTINCT city FROM tenants WHERE status='active' AND city IS NOT NULL ORDER BY city`
  ).all();
  res.json(rows.map((x) => x.city));
});

// 门店列表（可按城市筛选）
r.get('/tenants', (req, res) => {
  const city = req.query.city;
  const rows = (city
    ? db.prepare(`SELECT id,name,city,address,phone,intro,photo FROM tenants WHERE status='active' AND city=? ORDER BY name`).all(city)
    : db.prepare(`SELECT id,name,city,address,phone,intro,photo FROM tenants WHERE status='active' ORDER BY city,name`).all()
  ).map((t) => ({
    ...t,
    service_count: db.prepare('SELECT COUNT(*) AS n FROM services WHERE tenant_id=? AND active=1').get(t.id).n,
    from_price: db.prepare('SELECT MIN(price) AS p FROM services WHERE tenant_id=? AND active=1').get(t.id).p,
  }));
  res.json(rows);
});

// 门店详情 + 服务 + 技师
r.get('/tenants/:id', (req, res) => {
  const t = db.prepare(`SELECT id,name,city,address,phone,intro,photo FROM tenants WHERE id=? AND status='active'`).get(req.params.id);
  if (!t) return res.status(404).json({ error: '门店不存在' });
  t.services = db.prepare('SELECT id,name,category,duration_min,price FROM services WHERE tenant_id=? AND active=1 ORDER BY id').all(t.id);
  t.staff = db.prepare(`SELECT id,name FROM staff WHERE tenant_id=? AND active=1 AND role='therapist' ORDER BY id`).all(t.id);
  res.json(t);
});

// 在线预约（顾客自助）
r.post('/appointments', (req, res) => {
  const { tenant_id, service_id, staff_id, customer_name, customer_phone, start_at, note } = req.body;
  if (!tenant_id || !service_id || !start_at) return res.status(400).json({ error: '门店、服务、时间必填' });
  if (!customer_name || !customer_phone) return res.status(400).json({ error: '请填写姓名和手机号' });

  const tenant = db.prepare(`SELECT id FROM tenants WHERE id=? AND status='active'`).get(tenant_id);
  if (!tenant) return res.status(404).json({ error: '门店不可用' });
  const sv = db.prepare('SELECT duration_min FROM services WHERE id=? AND tenant_id=? AND active=1').get(service_id, tenant_id);
  if (!sv) return res.status(400).json({ error: '服务不可用' });

  const end = db.prepare(`SELECT datetime(?, '+' || ? || ' minutes') AS e`).get(start_at, sv.duration_min).e;

  if (staff_id) {
    const clash = db.prepare(
      `SELECT COUNT(*) AS n FROM appointments
       WHERE tenant_id=? AND staff_id=? AND status NOT IN ('cancelled','no_show')
         AND start_at < ? AND end_at > ?`
    ).get(tenant_id, staff_id, end, start_at).n;
    if (clash) return res.status(409).json({ error: '该技师此时段已满，请换时间或技师' });
  }

  // 已登录会员则关联
  const memberId = parseMember(req);
  const info = db.prepare(
    `INSERT INTO appointments (tenant_id, member_id, customer_name, customer_phone, staff_id, service_id, start_at, end_at, status, source, note)
     VALUES (?,?,?,?,?,?,?,?, 'booked', 'online', ?)`
  ).run(tenant_id, memberId || null, customer_name, customer_phone, staff_id || null, service_id, start_at, end, note || null);

  res.json({ ok: true, id: info.lastInsertRowid, start_at, end_at: end });
});

// ---------- 会员自助 / member self-service ----------

// 登录：卡号 + 手机号（MVP 简单校验）
r.post('/member/login', (req, res) => {
  const { member_no, phone } = req.body;
  const m = db.prepare('SELECT * FROM members WHERE member_no=? AND phone=? AND status=\'active\'').get(member_no, phone);
  if (!m) return res.status(401).json({ error: '卡号或手机号不正确' });
  const token = newToken();
  db.prepare('INSERT INTO member_sessions (token, member_id) VALUES (?,?)').run(token, m.id);
  res.json({ token, member: { id: m.id, member_no: m.member_no, name: m.name, level: m.level, balance: m.balance, points: m.points } });
});

// 我的钱包 + 跨店流水 + 次卡 + 预约
r.get('/member/me', requireMember, (req, res) => {
  const m = db.prepare('SELECT id,member_no,name,phone,level,balance,points FROM members WHERE id=?').get(req.memberId);
  m.packages = db.prepare(
    `SELECT p.*, t.name AS tenant_name FROM member_packages p LEFT JOIN tenants t ON t.id=p.tenant_id
     WHERE p.member_id=? AND p.active=1 ORDER BY p.created_at DESC`
  ).all(m.id);
  m.transactions = db.prepare(
    `SELECT tx.type, tx.amount, tx.balance_after, tx.note, tx.created_at, t.name AS tenant_name
     FROM transactions tx LEFT JOIN tenants t ON t.id=tx.tenant_id
     WHERE tx.member_id=? ORDER BY tx.created_at DESC LIMIT 50`
  ).all(m.id);
  m.appointments = db.prepare(
    `SELECT a.start_at, a.status, sv.name AS service_name, t.name AS tenant_name
     FROM appointments a LEFT JOIN services sv ON sv.id=a.service_id LEFT JOIN tenants t ON t.id=a.tenant_id
     WHERE a.member_id=? ORDER BY a.start_at DESC LIMIT 20`
  ).all(m.id);
  res.json(m);
});

export default r;
