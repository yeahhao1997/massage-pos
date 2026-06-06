import { useEffect, useState } from 'react';
import { get, post, del, money, toCents } from '../lib.js';
import { useToast } from '../ui.jsx';
import { useT } from '../i18n.jsx';

const TABS = {
  staff: {
    label: '员工/技师', path: '/catalog/staff',
    cols: [
      { k: 'name', t: '名称' },
      { k: 'role', t: '角色', type: 'role' },
      { k: 'phone', t: '手机号' },
      { k: 'commission_rate', t: '提成比例', type: 'rate' },
    ],
    blank: { name: '', role: 'therapist', phone: '', commission_rate: 0.2 },
  },
  services: {
    label: '服务项目', path: '/catalog/services',
    cols: [
      { k: 'name', t: '名称' },
      { k: 'category', t: '分类' },
      { k: 'duration_min', t: '时长(分)', type: 'int' },
      { k: 'price', t: '价格', type: 'money' },
    ],
    blank: { name: '', category: '', duration_min: 60, price: 0 },
  },
  products: {
    label: '商品', path: '/catalog/products',
    cols: [
      { k: 'name', t: '名称' },
      { k: 'price', t: '价格', type: 'money' },
      { k: 'stock', t: '库存', type: 'int' },
    ],
    blank: { name: '', price: 0, stock: 0 },
  },
  rooms: {
    label: '房间/床位', path: '/catalog/rooms',
    cols: [{ k: 'name', t: '名称' }],
    blank: { name: '' },
  },
  'card-types': {
    label: '卡类型', path: '/catalog/card-types',
    cols: [
      { k: 'name', t: '名称' },
      { k: 'kind', t: '类型', type: 'kind' },
      { k: 'price', t: '售价', type: 'money' },
      { k: 'bonus', t: '赠送', type: 'money' },
      { k: 'times', t: '次数', type: 'int' },
    ],
    blank: { name: '', kind: 'stored_value', price: 0, bonus: 0, times: null, valid_days: null },
  },
};

const ROLE = { therapist: '技师', cashier: '前台', admin: '管理员' };
const KIND = { stored_value: '储值卡', count: '次卡', period: '期限卡' };

export default function Settings() {
  const { t } = useT();
  const toast = useToast();
  const [tab, setTab] = useState('staff');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(TABS.staff.blank);
  const def = TABS[tab];

  async function load() {
    try { setRows(await get(`${def.path}?all=1`)); } catch (e) { toast.err(e.message); }
  }
  useEffect(() => { setForm(def.blank); load(); }, [tab]); // eslint-disable-line

  function render(col, v) {
    if (col.type === 'money') return money(v);
    if (col.type === 'rate') return ((v || 0) * 100).toFixed(0) + '%';
    if (col.type === 'role') return t(ROLE[v] || v);
    if (col.type === 'kind') return t(KIND[v] || v);
    return v ?? '—';
  }

  async function addRow() {
    try {
      const body = { ...form };
      def.cols.forEach((c) => {
        if (c.type === 'money') body[c.k] = toCents(form[c.k]);
        if (c.type === 'int' || c.type === 'rate') body[c.k] = Number(form[c.k]) || 0;
      });
      await post(def.path, body);
      toast.ok(t('已添加')); setForm(def.blank); load();
    } catch (e) { toast.err(e.message); }
  }
  async function remove(id) {
    try { await del(`${def.path}/${id}`); load(); } catch (e) { toast.err(e.message); }
  }

  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('设置 · 基础资料')}</h1>

      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {Object.entries(TABS).map(([k, d]) => (
          <button key={k} onClick={() => setTab(k)}
            className={'rounded-md px-3 py-1.5 ' + (tab === k ? 'bg-white font-medium shadow-sm' : 'text-slate-500')}>
            {t(d.label)}
          </button>
        ))}
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        {def.cols.map((c) => (
          <label key={c.k} className="text-sm">
            <span className="label">{t(c.t)}</span>
            {c.type === 'role' ? (
              <select className="input w-32" value={form[c.k]} onChange={up(c.k)}>
                {Object.entries(ROLE).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
              </select>
            ) : c.type === 'kind' ? (
              <select className="input w-32" value={form[c.k]} onChange={up(c.k)}>
                {Object.entries(KIND).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
              </select>
            ) : (
              <input className="input w-32" value={form[c.k] ?? ''} onChange={up(c.k)} />
            )}
          </label>
        ))}
        <button className="btn-primary" onClick={addRow}>{t('＋ 添加')}</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              {def.cols.map((c) => <th key={c.k} className="py-2 pr-4">{t(c.t)}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={'border-t border-slate-100 ' + (row.active ? '' : 'opacity-40')}>
                {def.cols.map((c) => <td key={c.k} className="py-2 pr-4">{render(c, row[c.k])}</td>)}
                <td className="text-right">
                  {row.active ? <button className="text-xs text-rose-500 hover:underline" onClick={() => remove(row.id)}>{t('停用')}</button>
                              : <span className="text-xs text-slate-400">{t('已停用')}</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="py-6 text-center text-slate-400">{t('暂无数据')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
