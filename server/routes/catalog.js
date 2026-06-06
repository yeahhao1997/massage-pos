// 基础资料维护（按 tenant 隔离）：员工、服务、商品、房间、卡类型
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, resolveTenant } from '../auth.js';

const r = Router();
r.use(requireAuth, resolveTenant);

function crud(table, fields) {
  const sub = Router({ mergeParams: true });
  sub.get('/', (req, res) => {
    const all = req.query.all === '1';
    const rows = db
      .prepare(`SELECT * FROM ${table} WHERE tenant_id = ? ${all ? '' : 'AND active = 1'} ORDER BY id`)
      .all(req.tenantId);
    res.json(rows);
  });
  sub.post('/', (req, res) => {
    const cols = fields.filter((f) => req.body[f] !== undefined);
    const info = db
      .prepare(`INSERT INTO ${table} (tenant_id, ${cols.join(',')}) VALUES (?, ${cols.map(() => '?').join(',')})`)
      .run(req.tenantId, ...cols.map((f) => req.body[f]));
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid));
  });
  sub.put('/:id', (req, res) => {
    const cur = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND tenant_id = ?`).get(req.params.id, req.tenantId);
    if (!cur) return res.status(404).json({ error: '记录不存在' });
    const cols = fields.filter((f) => req.body[f] !== undefined);
    if (cols.length) {
      db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c}=?`).join(',')} WHERE id = ? AND tenant_id = ?`)
        .run(...cols.map((f) => req.body[f]), req.params.id, req.tenantId);
    }
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id));
  });
  sub.delete('/:id', (req, res) => {
    db.prepare(`UPDATE ${table} SET active = 0 WHERE id = ? AND tenant_id = ?`).run(req.params.id, req.tenantId);
    res.json({ ok: true });
  });
  return sub;
}

r.use('/staff', crud('staff', ['name', 'role', 'phone', 'commission_rate', 'active']));
r.use('/services', crud('services', ['name', 'category', 'duration_min', 'price', 'active']));
r.use('/products', crud('products', ['name', 'price', 'stock', 'active']));
r.use('/rooms', crud('rooms', ['name', 'active']));
r.use('/card-types', crud('card_types', ['name', 'kind', 'price', 'bonus', 'times', 'valid_days', 'active']));

export default r;
