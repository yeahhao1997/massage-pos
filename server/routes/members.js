// 会员卡（平台层，全平台通用）：建档、充值、消费扣款、次卡核销、流水
// 每笔充值/消费都记 tenant_id = 当前操作门店，供平台做店间结算
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, resolveTenant } from '../auth.js';

const r = Router();
r.use(requireAuth, resolveTenant);

// 会员搜索（平台通用，任意合作店都能查到）
r.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const rows = q
    ? db.prepare(
        `SELECT * FROM members WHERE member_no LIKE ? OR name LIKE ? OR phone LIKE ?
         ORDER BY joined_at DESC LIMIT 100`
      ).all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM members ORDER BY joined_at DESC LIMIT 100').all();
  res.json(rows);
});

r.get('/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: '会员不存在' });
  m.packages = db.prepare(
    `SELECT p.*, t.name AS tenant_name FROM member_packages p
     LEFT JOIN tenants t ON t.id = p.tenant_id
     WHERE p.member_id = ? AND p.active = 1 ORDER BY p.created_at DESC`
  ).all(m.id);
  m.transactions = db.prepare(
    `SELECT tx.*, t.name AS tenant_name FROM transactions tx
     LEFT JOIN tenants t ON t.id = tx.tenant_id
     WHERE tx.member_id = ? ORDER BY tx.created_at DESC LIMIT 50`
  ).all(m.id);
  res.json(m);
});

// 新建会员（开卡门店 = 当前店）
r.post('/', (req, res) => {
  const { member_no, name, phone, gender, birthday, level, note } = req.body;
  if (!member_no || !name) return res.status(400).json({ error: '卡号和姓名必填' });
  try {
    const info = db.prepare(
      `INSERT INTO members (member_no, name, phone, gender, birthday, level, note, home_tenant_id)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(member_no, name, phone || null, gender || null, birthday || null, level || '普通会员', note || null, req.tenantId);
    res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: '卡号已存在' });
    res.status(500).json({ error: String(e) });
  }
});

// 充值（记 tenant_id = 当前店收的款）
r.post('/:id/recharge', (req, res) => {
  const { amount, bonus = 0, points = 0, staff_id, note, pay_method } = req.body;
  const amt = Math.round(Number(amount) || 0);
  const bns = Math.round(Number(bonus) || 0);
  if (amt <= 0) return res.status(400).json({ error: '充值金额必须大于0' });

  const tx = db.transaction(() => {
    const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!m) throw { code: 404, msg: '会员不存在' };
    const total = amt + bns;
    const after = m.balance + total;
    db.prepare('UPDATE members SET balance = ?, points = points + ? WHERE id = ?').run(after, points, m.id);
    db.prepare(
      `INSERT INTO transactions (member_id, tenant_id, type, amount, balance_after, points_delta, staff_id, note)
       VALUES (?, ?, 'recharge', ?, ?, ?, ?, ?)`
    ).run(m.id, req.tenantId, total, after, points, staff_id || null,
          note || `充值 RM${(amt / 100).toFixed(2)}${bns ? ` 赠 RM${(bns / 100).toFixed(2)}` : ''}${pay_method ? ` (${pay_method})` : ''}`);
    return db.prepare('SELECT * FROM members WHERE id = ?').get(m.id);
  });
  try { res.json(tx()); } catch (e) { res.status(e.code || 500).json({ error: e.msg || String(e) }); }
});

// 余额消费（记 tenant_id = 当前店提供了服务）
r.post('/:id/consume', (req, res) => {
  const { amount, staff_id, note } = req.body;
  const amt = Math.round(Number(amount) || 0);
  if (amt <= 0) return res.status(400).json({ error: '消费金额必须大于0' });

  const tx = db.transaction(() => {
    const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!m) throw { code: 404, msg: '会员不存在' };
    if (m.balance < amt) throw { code: 400, msg: `余额不足（当前 RM${(m.balance / 100).toFixed(2)}）` };
    const after = m.balance - amt;
    db.prepare('UPDATE members SET balance = ? WHERE id = ?').run(after, m.id);
    db.prepare(
      `INSERT INTO transactions (member_id, tenant_id, type, amount, balance_after, staff_id, note)
       VALUES (?, ?, 'consume', ?, ?, ?, ?)`
    ).run(m.id, req.tenantId, -amt, after, staff_id || null, note || `余额消费 RM${(amt / 100).toFixed(2)}`);
    return db.prepare('SELECT * FROM members WHERE id = ?').get(m.id);
  });
  try { res.json(tx()); } catch (e) { res.status(e.code || 500).json({ error: e.msg || String(e) }); }
});

// 开次卡/期限卡（售卡门店 = 当前店）
r.post('/:id/packages', (req, res) => {
  const { card_type_id, name, kind, times, valid_days } = req.body;
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: '会员不存在' });
  const expire = valid_days
    ? db.prepare(`SELECT date('now','localtime','+' || ? || ' days') AS d`).get(valid_days).d
    : null;
  const info = db.prepare(
    `INSERT INTO member_packages (member_id, tenant_id, card_type_id, name, kind, remaining_times, expire_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(m.id, req.tenantId, card_type_id || null, name, kind || 'count', times ?? null, expire);
  res.json(db.prepare('SELECT * FROM member_packages WHERE id = ?').get(info.lastInsertRowid));
});

// 次卡核销（任意合作店都能核销，记当前店）
r.post('/:id/packages/:pkgId/redeem', (req, res) => {
  const { staff_id, note } = req.body;
  const tx = db.transaction(() => {
    const pkg = db.prepare('SELECT * FROM member_packages WHERE id = ? AND member_id = ?').get(req.params.pkgId, req.params.id);
    if (!pkg) throw { code: 404, msg: '次卡不存在' };
    if (pkg.kind !== 'count') throw { code: 400, msg: '该卡不是次卡' };
    if (pkg.remaining_times <= 0) throw { code: 400, msg: '次数已用完' };
    const left = pkg.remaining_times - 1;
    db.prepare('UPDATE member_packages SET remaining_times = ? WHERE id = ?').run(left, pkg.id);
    db.prepare(
      `INSERT INTO transactions (member_id, tenant_id, type, amount, balance_after, package_id, staff_id, note)
       VALUES (?, ?, 'consume', 0, (SELECT balance FROM members WHERE id=?), ?, ?, ?)`
    ).run(pkg.member_id, req.tenantId, pkg.member_id, pkg.id, staff_id || null, note || `${pkg.name} 核销1次（剩${left}次）`);
    return db.prepare('SELECT * FROM member_packages WHERE id = ?').get(pkg.id);
  });
  try { res.json(tx()); } catch (e) { res.status(e.code || 500).json({ error: e.msg || String(e) }); }
});

export default r;
