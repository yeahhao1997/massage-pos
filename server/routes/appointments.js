// 预约排班（按 tenant 隔离）
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, resolveTenant } from '../auth.js';

const r = Router();
r.use(requireAuth, resolveTenant);

const SELECT = `
  SELECT a.*,
         s.name  AS staff_name,
         sv.name AS service_name, sv.price AS service_price, sv.duration_min,
         rm.name AS room_name,
         m.name  AS member_name, m.member_no
  FROM appointments a
  LEFT JOIN staff s     ON s.id  = a.staff_id
  LEFT JOIN services sv ON sv.id = a.service_id
  LEFT JOIN rooms rm    ON rm.id = a.room_id
  LEFT JOIN members m   ON m.id  = a.member_id
`;

r.get('/', (req, res) => {
  const date = req.query.date || db.prepare(`SELECT date('now','localtime') AS d`).get().d;
  const rows = db.prepare(`${SELECT} WHERE a.tenant_id = ? AND date(a.start_at) = ? ORDER BY a.start_at`)
    .all(req.tenantId, date);
  res.json(rows);
});

r.post('/', (req, res) => {
  const { member_id, customer_name, customer_phone, staff_id, service_id, room_id, start_at, end_at, note } = req.body;
  if (!start_at) return res.status(400).json({ error: '开始时间必填' });

  let end = end_at;
  if (!end && service_id) {
    const sv = db.prepare('SELECT duration_min FROM services WHERE id = ? AND tenant_id = ?').get(service_id, req.tenantId);
    if (sv) end = db.prepare(`SELECT datetime(?, '+' || ? || ' minutes') AS e`).get(start_at, sv.duration_min).e;
  }

  if (staff_id && end) {
    const clash = db.prepare(
      `SELECT COUNT(*) AS n FROM appointments
       WHERE tenant_id = ? AND staff_id = ? AND status NOT IN ('cancelled','no_show')
         AND start_at < ? AND end_at > ?`
    ).get(req.tenantId, staff_id, end, start_at).n;
    if (clash) return res.status(409).json({ error: '该技师此时段已有预约' });
  }

  const info = db.prepare(
    `INSERT INTO appointments (tenant_id, member_id, customer_name, customer_phone, staff_id, service_id, room_id, start_at, end_at, note)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(req.tenantId, member_id || null, customer_name || null, customer_phone || null, staff_id || null,
        service_id || null, room_id || null, start_at, end || start_at, note || null);
  res.json(db.prepare(`${SELECT} WHERE a.id = ?`).get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM appointments WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
  if (!a) return res.status(404).json({ error: '预约不存在' });
  const { status, staff_id, room_id, start_at, end_at, note } = req.body;
  db.prepare(
    `UPDATE appointments SET status=?, staff_id=?, room_id=?, start_at=?, end_at=?, note=? WHERE id=? AND tenant_id=?`
  ).run(status ?? a.status, staff_id ?? a.staff_id, room_id ?? a.room_id,
        start_at ?? a.start_at, end_at ?? a.end_at, note ?? a.note, a.id, req.tenantId);
  res.json(db.prepare(`${SELECT} WHERE a.id = ?`).get(a.id));
});

export default r;
