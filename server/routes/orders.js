// 结账下单（按 tenant 隔离）；余额支付走平台中央钱包，记 tenant_id = 当前店
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, resolveTenant } from '../auth.js';

const r = Router();
r.use(requireAuth, resolveTenant);

r.post('/', (req, res) => {
  const { member_id, appointment_id, items = [], pay_method = 'cash', cashier_id, note } = req.body;
  if (!items.length) return res.status(400).json({ error: '订单不能为空' });

  const tx = db.transaction(() => {
    let total = 0;
    const prepared = items.map((it) => {
      const qty = Math.max(1, Math.round(Number(it.qty) || 1));
      const unit = Math.round(Number(it.unit_price) || 0);
      const amount = unit * qty;
      total += amount;
      let rate = it.commission_rate;
      if (rate == null && it.staff_id) {
        const st = db.prepare('SELECT commission_rate FROM staff WHERE id = ? AND tenant_id = ?').get(it.staff_id, req.tenantId);
        rate = st ? st.commission_rate : 0;
      }
      rate = Number(rate) || 0;
      return { ...it, qty, unit, amount, rate, commission: Math.round(amount * rate) };
    });

    let member = member_id ? db.prepare('SELECT * FROM members WHERE id = ?').get(member_id) : null;
    if (pay_method === 'balance') {
      if (!member) throw { code: 400, msg: '余额支付需选择会员' };
      if (member.balance < total) throw { code: 400, msg: `余额不足（当前 RM${(member.balance / 100).toFixed(2)}）` };
    }

    const orderId = db.prepare(
      `INSERT INTO orders (tenant_id, member_id, appointment_id, total, pay_method, staff_id, note)
       VALUES (?,?,?,?,?,?,?)`
    ).run(req.tenantId, member_id || null, appointment_id || null, total, pay_method, cashier_id || null, note || null).lastInsertRowid;

    const insItem = db.prepare(
      `INSERT INTO order_items (order_id, tenant_id, item_type, ref_id, name, qty, unit_price, amount, staff_id, commission_rate, commission_amount)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const p of prepared) {
      insItem.run(orderId, req.tenantId, p.item_type, p.ref_id || null, p.name, p.qty, p.unit, p.amount,
                  p.staff_id || null, p.rate, p.commission);
      if (p.item_type === 'product' && p.ref_id) {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?').run(p.qty, p.ref_id, req.tenantId);
      }
    }

    if (pay_method === 'balance' && member) {
      const after = member.balance - total;
      const earn = Math.floor(total / 100);
      db.prepare('UPDATE members SET balance = ?, points = points + ? WHERE id = ?').run(after, earn, member.id);
      db.prepare(
        `INSERT INTO transactions (member_id, tenant_id, type, amount, balance_after, points_delta, order_id, staff_id, note)
         VALUES (?, ?, 'consume', ?, ?, ?, ?, ?, ?)`
      ).run(member.id, req.tenantId, -total, after, earn, orderId, cashier_id || null, note || '结账消费 Checkout');
    }

    if (appointment_id) {
      db.prepare(`UPDATE appointments SET status='done' WHERE id = ? AND tenant_id = ?`).run(appointment_id, req.tenantId);
    }
    return getOrder(orderId);
  });

  try { res.json(tx()); } catch (e) { res.status(e.code || 500).json({ error: e.msg || String(e) }); }
});

function getOrder(id) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  return o;
}

r.get('/:id', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  res.json(getOrder(o.id));
});

export default r;
