// 多商户平台数据库 —— Node 24 内置 node:sqlite，零依赖免编译
// 货币用「sen」存整数（RM1 = 100 sen）。会员与中央钱包在平台层，业务表带 tenant_id 隔离各店。
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { hashPassword } from './hash.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const raw = new DatabaseSync(join(dataDir, 'platform.db'));
raw.exec('PRAGMA journal_mode = WAL');
raw.exec('PRAGMA foreign_keys = ON');

raw.transaction = (fn) => (...args) => {
  raw.exec('BEGIN');
  try { const r = fn(...args); raw.exec('COMMIT'); return r; }
  catch (e) { raw.exec('ROLLBACK'); throw e; }
};

export const db = raw;

db.exec(`
-- 商户（按摩院）/ tenants (shops)
CREATE TABLE IF NOT EXISTS tenants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  city       TEXT,
  address    TEXT,
  phone      TEXT,
  intro      TEXT,
  photo      TEXT,                                -- 门店照片：图片URL 或 base64 data URL
  status     TEXT    NOT NULL DEFAULT 'active',  -- active / suspended
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 登录账号 / login users
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    UNIQUE NOT NULL,
  pass_hash  TEXT    NOT NULL,
  pass_salt  TEXT    NOT NULL,
  role       TEXT    NOT NULL,                   -- platform_admin / shop_owner / shop_staff
  tenant_id  INTEGER REFERENCES tenants(id),     -- 平台管理员为 NULL
  staff_id   INTEGER,                            -- 关联 staff（技师/收银），可空
  name       TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 会话令牌 / sessions
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 会员端登录会话 / member-side sessions (customer app)
CREATE TABLE IF NOT EXISTS member_sessions (
  token      TEXT    PRIMARY KEY,
  member_id  INTEGER NOT NULL REFERENCES members(id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- 会员（平台层，全平台通用）/ members (platform-wide, universal card)
CREATE TABLE IF NOT EXISTS members (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no      TEXT    UNIQUE NOT NULL,        -- 平台会员卡号
  name           TEXT    NOT NULL,
  phone          TEXT,
  gender         TEXT,
  birthday       TEXT,
  level          TEXT    NOT NULL DEFAULT '普通会员',
  balance        INTEGER NOT NULL DEFAULT 0,     -- 中央钱包余额（sen）
  points         INTEGER NOT NULL DEFAULT 0,
  status         TEXT    NOT NULL DEFAULT 'active',
  home_tenant_id INTEGER REFERENCES tenants(id), -- 注册/开卡门店
  note           TEXT,
  joined_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);

-- 资金/积分流水（平台账本，tenant_id = 发生这笔的门店，用于店间结算）
CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id     INTEGER NOT NULL REFERENCES members(id),
  tenant_id     INTEGER REFERENCES tenants(id),  -- 哪家店发生的
  type          TEXT    NOT NULL,                -- recharge / consume / refund / adjust
  amount        INTEGER NOT NULL,                -- 余额变动（sen，正负）
  balance_after INTEGER NOT NULL,
  points_delta  INTEGER NOT NULL DEFAULT 0,
  package_id    INTEGER,
  order_id      INTEGER,
  staff_id      INTEGER,
  note          TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_tx_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_tx_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);

-- 会员次卡/期限卡（平台层，tenant_id = 售卡门店）
CREATE TABLE IF NOT EXISTS member_packages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id       INTEGER NOT NULL REFERENCES members(id),
  tenant_id       INTEGER REFERENCES tenants(id),
  card_type_id    INTEGER,
  name            TEXT    NOT NULL,
  kind            TEXT    NOT NULL,              -- count / period
  remaining_times INTEGER,
  expire_at       TEXT,
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_pkg_member ON member_packages(member_id);

-- 以下业务表均按 tenant_id 隔离 / tenant-scoped tables
CREATE TABLE IF NOT EXISTS staff (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id),
  name            TEXT    NOT NULL,
  role            TEXT    NOT NULL DEFAULT 'therapist',
  phone           TEXT,
  commission_rate REAL    NOT NULL DEFAULT 0,
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);

CREATE TABLE IF NOT EXISTS services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id    INTEGER NOT NULL REFERENCES tenants(id),
  name         TEXT    NOT NULL,
  category     TEXT,
  duration_min INTEGER NOT NULL DEFAULT 60,
  price        INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);

CREATE TABLE IF NOT EXISTS products (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name      TEXT    NOT NULL,
  price     INTEGER NOT NULL DEFAULT 0,
  stock     INTEGER NOT NULL DEFAULT 0,
  active    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);

CREATE TABLE IF NOT EXISTS rooms (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name      TEXT    NOT NULL,
  active    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant ON rooms(tenant_id);

CREATE TABLE IF NOT EXISTS card_types (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id  INTEGER NOT NULL REFERENCES tenants(id),
  name       TEXT    NOT NULL,
  kind       TEXT    NOT NULL,                   -- stored_value / count / period
  price      INTEGER NOT NULL DEFAULT 0,
  bonus      INTEGER NOT NULL DEFAULT 0,
  times      INTEGER,
  valid_days INTEGER,
  active     INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_cardtypes_tenant ON card_types(tenant_id);

CREATE TABLE IF NOT EXISTS appointments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id      INTEGER NOT NULL REFERENCES tenants(id),
  member_id      INTEGER REFERENCES members(id),
  customer_name  TEXT,
  customer_phone TEXT,
  staff_id       INTEGER REFERENCES staff(id),
  service_id     INTEGER REFERENCES services(id),
  room_id        INTEGER REFERENCES rooms(id),
  start_at       TEXT    NOT NULL,
  end_at         TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'booked',
  source         TEXT    NOT NULL DEFAULT 'counter', -- counter 柜台 / online 顾客端
  note           TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_appt_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appt_start ON appointments(start_at);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id      INTEGER NOT NULL REFERENCES tenants(id),
  member_id      INTEGER REFERENCES members(id),
  appointment_id INTEGER REFERENCES appointments(id),
  total          INTEGER NOT NULL DEFAULT 0,
  pay_method     TEXT    NOT NULL DEFAULT 'cash',   -- balance / cash / tng / grabpay / fpx / duitnow / card
  staff_id       INTEGER REFERENCES staff(id),
  note           TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL REFERENCES orders(id),
  tenant_id         INTEGER NOT NULL REFERENCES tenants(id),
  item_type         TEXT    NOT NULL,
  ref_id            INTEGER,
  name              TEXT    NOT NULL,
  qty               INTEGER NOT NULL DEFAULT 1,
  unit_price        INTEGER NOT NULL DEFAULT 0,
  amount            INTEGER NOT NULL DEFAULT 0,
  staff_id          INTEGER REFERENCES staff(id),
  commission_rate   REAL    NOT NULL DEFAULT 0,
  commission_amount INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_oi_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_oi_tenant ON order_items(tenant_id);
`);

// 兼容已有数据库的轻量迁移 / lightweight migrations for existing DBs
try { db.exec('ALTER TABLE tenants ADD COLUMN photo TEXT'); } catch { /* 已存在则忽略 */ }

// ---------- 首次播种演示数据 / seed ----------
const seeded = db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;
if (!seeded) {
  const mkUser = (username, pw, role, tenant_id, name, staff_id = null) => {
    const { salt, hash } = hashPassword(pw);
    db.prepare(
      `INSERT INTO users (username, pass_hash, pass_salt, role, tenant_id, staff_id, name)
       VALUES (?,?,?,?,?,?,?)`
    ).run(username, hash, salt, role, tenant_id, staff_id, name);
  };

  // 平台管理员：生产环境用环境变量 ADMIN_PASSWORD 设密码
  const adminPw = process.env.ADMIN_PASSWORD || 'admin123';
  mkUser('admin', adminPw, 'platform_admin', null, '平台管理员');
  if (adminPw === 'admin123') {
    console.warn('[db] ⚠ admin 使用默认密码 admin123 —— 上线前请用环境变量 ADMIN_PASSWORD 设置强密码');
  }

  // 初始门店：Litter Malaysia 三店 + 标准服务菜单（数据库为空时播种，含免费版每次重置后）
  const STD_SERVICES = [
    ['全身精油按摩 Aromatherapy', '按摩', 90, 19800],
    ['肩颈理疗 Neck & Shoulder', '理疗', 60, 12800],
    ['足部反射 Foot Reflexology', '足疗', 60, 8800],
    ['泰式按摩 Thai Massage', '按摩', 90, 16800],
    ['香薰SPA Aroma SPA', 'SPA', 120, 26800],
  ];
  const seedShop = (t, owner, staffNames) => {
    const tid = db.prepare('INSERT INTO tenants (name, city, address, phone, intro, photo) VALUES (?,?,?,?,?,?)')
      .run(t.name, t.city, t.address, t.phone, t.intro, t.photo || null).lastInsertRowid;
    mkUser(owner.u, owner.p, 'shop_owner', tid, t.name + ' 店老板');
    const insStaff = db.prepare('INSERT INTO staff (tenant_id, name, role, commission_rate) VALUES (?,?,?,?)');
    const staffIds = staffNames.map((n) => insStaff.run(tid, n, 'therapist', 0.2).lastInsertRowid);
    const insSvc = db.prepare('INSERT INTO services (tenant_id, name, category, duration_min, price) VALUES (?,?,?,?,?)');
    STD_SERVICES.forEach((s) => insSvc.run(tid, ...s));
    const insRoom = db.prepare('INSERT INTO rooms (tenant_id, name) VALUES (?,?)');
    ['Room 1', 'Room 2', 'Room 3', 'VIP'].forEach((rm) => insRoom.run(tid, rm));
    const insCard = db.prepare('INSERT INTO card_types (tenant_id, name, kind, price, bonus, times, valid_days) VALUES (?,?,?,?,?,?,?)');
    insCard.run(tid, '储值 RM500 送 RM50', 'stored_value', 50000, 5000, null, null);
    insCard.run(tid, '精油按摩 10 次卡', 'count', 178000, 0, 10, 365);
    return { tid, staffIds };
  };

  const kl = seedShop(
    { name: 'Litter Malaysia · KL店', city: 'Kuala Lumpur', address: 'Jalan Bukit Bintang 88', phone: '012-2234234', intro: '市中心 · 高端精油按摩 SPA', photo: '/shops/kl.jpg' },
    { u: 'kl', p: 'kl123' }, ['Amy', 'Siti']);
  const jb = seedShop(
    { name: 'Litter Malaysia · JB店', city: 'Johor Bahru', address: 'Sentosa Plaza JB', phone: '013-2234343', intro: '新山 · 舒压理疗会所', photo: '/shops/jb.jpg' },
    { u: 'jb', p: 'jb123' }, ['Mei', 'Ravi']);
  const pg = seedShop(
    { name: 'Litter Malaysia · PENANG店', city: 'Penang', address: 'Gurney Plaza', phone: '013-2234343', intro: '槟城 · 海景养生 SPA', photo: '/shops/penang.jpg' },
    { u: 'penang', p: 'penang123' }, ['Hui', 'Kumar']);

  // dummy 平台通用会员（开业后换成真实顾客）
  const insM = db.prepare(
    'INSERT INTO members (member_no, name, phone, gender, level, balance, points, home_tenant_id) VALUES (?,?,?,?,?,?,?,?)'
  );
  const m1 = insM.run('VIP0001', 'Tan Wei Ming', '012-3456789', 'M', '黄金会员', 0, 0, kl.tid).lastInsertRowid;
  const m2 = insM.run('VIP0002', 'Nurul Aina', '019-8765432', 'F', '普通会员', 0, 0, jb.tid).lastInsertRowid;
  const m3 = insM.run('VIP0003', 'Lim Ah Huat', '016-7778888', 'M', '普通会员', 0, 0, pg.tid).lastInsertRowid;
  const m4 = insM.run('VIP0004', 'Siti Sarah', '011-2223333', 'F', '黄金会员', 0, 0, kl.tid).lastInsertRowid;

  const recharge = db.transaction((memberId, tenantId, amt, staffId) => {
    const m = db.prepare('SELECT balance FROM members WHERE id=?').get(memberId);
    const after = m.balance + amt;
    db.prepare('UPDATE members SET balance=?, points=points+? WHERE id=?').run(after, Math.floor(amt / 100), memberId);
    db.prepare(`INSERT INTO transactions (member_id, tenant_id, type, amount, balance_after, points_delta, staff_id, note)
                VALUES (?,?,'recharge',?,?,?,?,?)`).run(memberId, tenantId, amt, after, Math.floor(amt / 100), staffId, '充值 Top-up');
  });
  const consume = db.transaction((memberId, tenantId, amt, staffId) => {
    const m = db.prepare('SELECT balance FROM members WHERE id=?').get(memberId);
    const after = m.balance - amt;
    db.prepare('UPDATE members SET balance=? WHERE id=?').run(after, memberId);
    db.prepare(`INSERT INTO transactions (member_id, tenant_id, type, amount, balance_after, staff_id, note)
                VALUES (?,?,'consume',?,?,?,?)`).run(memberId, tenantId, -amt, after, staffId, '余额消费 Balance spend');
  });
  // 跨店流水演示，让报表/店间结算有数据
  recharge(m1, kl.tid, 100000, kl.staffIds[0]); // VIP0001 在 KL 充 RM1000
  consume(m1, jb.tid, 30000, jb.staffIds[0]);    // 在 JB 花 RM300
  recharge(m2, jb.tid, 50000, jb.staffIds[1]);  // VIP0002 在 JB 充 RM500
  recharge(m3, pg.tid, 80000, pg.staffIds[0]);  // VIP0003 在 Penang 充 RM800
  consume(m3, kl.tid, 20000, kl.staffIds[1]);    // 在 KL 花 RM200
  recharge(m4, kl.tid, 200000, kl.staffIds[0]); // VIP0004 在 KL 充 RM2000

  console.log('[db] 初始数据已播种：Litter Malaysia KL/JB/Penang + dummy 会员 (kl/kl123, jb/jb123, penang/penang123)');
}
