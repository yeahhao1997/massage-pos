// 报表（按 tenant 隔离，只看本店）
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, resolveTenant } from '../auth.js';

const r = Router();
r.use(requireAuth, resolveTenant);

function range(req) {
  const today = db.prepare(`SELECT date('now','localtime') AS d`).get().d;
  return { from: req.query.from || today, to: req.query.to || today };
}

r.get('/summary', (req, res) => {
  const { from, to } = range(req);
  const tid = req.tenantId;

  const sales = db.prepare(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
     FROM orders WHERE tenant_id = ? AND date(created_at) BETWEEN ? AND ?`
  ).get(tid, from, to);

  const byPay = db.prepare(
    `SELECT pay_method, COUNT(*) AS cnt, COALESCE(SUM(total),0) AS amount
     FROM orders WHERE tenant_id = ? AND date(created_at) BETWEEN ? AND ? GROUP BY pay_method`
  ).all(tid, from, to);

  const recharge = db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS amount FROM transactions
     WHERE type='recharge' AND tenant_id = ? AND date(created_at) BETWEEN ? AND ?`
  ).get(tid, from, to);

  const newMembers = db.prepare(
    `SELECT COUNT(*) AS n FROM members WHERE home_tenant_id = ? AND date(joined_at) BETWEEN ? AND ?`
  ).get(tid, from, to);

  res.json({ from, to, ...sales, byPay, recharge_amount: recharge.amount, new_members: newMembers.n });
});

r.get('/staff', (req, res) => {
  const { from, to } = range(req);
  const rows = db.prepare(
    `SELECT st.id, st.name,
            COUNT(oi.id)                          AS items,
            COALESCE(SUM(oi.amount),0)            AS sales,
            COALESCE(SUM(oi.commission_amount),0) AS commission
     FROM order_items oi
     JOIN orders o  ON o.id = oi.order_id
     JOIN staff  st ON st.id = oi.staff_id
     WHERE oi.tenant_id = ? AND date(o.created_at) BETWEEN ? AND ?
     GROUP BY st.id ORDER BY sales DESC`
  ).all(req.tenantId, from, to);
  res.json({ from, to, rows });
});

r.get('/daily', (req, res) => {
  const rows = db.prepare(
    `SELECT date(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
     FROM orders
     WHERE tenant_id = ? AND created_at >= datetime('now','localtime','-30 days')
     GROUP BY day ORDER BY day`
  ).all(req.tenantId);
  res.json(rows);
});

export default r;
