import { useEffect, useState } from 'react';
import { get, money, today } from '../lib.js';
import { useT } from '../i18n.jsx';

const PAY_LABEL = { balance: '余额', cash: '现金', card: '银行卡', tng: "Touch'n Go", grabpay: 'GrabPay', duitnow: 'DuitNow', fpx: 'FPX' };

export default function Reports() {
  const { t } = useT();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [sum, setSum] = useState(null);
  const [staff, setStaff] = useState([]);
  const [daily, setDaily] = useState([]);

  async function load() {
    const qs = `from=${from}&to=${to}`;
    setSum(await get(`/reports/summary?${qs}`));
    setStaff((await get(`/reports/staff?${qs}`)).rows);
    setDaily(await get('/reports/daily'));
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  const maxRev = Math.max(1, ...daily.map((d) => d.revenue));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t('报表')}</h1>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">{t('起')} <input type="date" className="input inline-block w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">{t('止')} <input type="date" className="input inline-block w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn-primary" onClick={load}>{t('查询')}</button>
        <button className="btn-ghost px-3 py-1 text-xs" onClick={() => { setFrom(today()); setTo(today()); }}>{t('今天')}</button>
      </div>

      {sum && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="card"><div className="text-xs text-slate-400">{t('营业额')}</div><div className="mt-1 text-2xl font-bold text-emerald-600">{money(sum.revenue)}</div></div>
          <div className="card"><div className="text-xs text-slate-400">{t('订单数')}</div><div className="mt-1 text-2xl font-bold">{sum.orders}</div></div>
          <div className="card"><div className="text-xs text-slate-400">{t('充值总额')}</div><div className="mt-1 text-2xl font-bold">{money(sum.recharge_amount)}</div></div>
          <div className="card"><div className="text-xs text-slate-400">{t('新会员')}</div><div className="mt-1 text-2xl font-bold">{sum.new_members}</div></div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 font-semibold">{t('支付方式分布')}</div>
          {sum?.byPay?.length ? sum.byPay.map((p) => (
            <div key={p.pay_method} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <span>{t(PAY_LABEL[p.pay_method] || p.pay_method)}</span>
              <span className="font-medium">{money(p.amount)} <span className="text-xs text-slate-400">({p.cnt})</span></span>
            </div>
          )) : <div className="py-6 text-center text-slate-400">{t('暂无数据')}</div>}
        </div>

        <div className="card">
          <div className="mb-3 font-semibold">{t('技师业绩 / 提成')}</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400"><th className="py-1">{t('技师')}</th><th className="text-right">{t('业绩')}</th><th className="text-right">{t('提成')}</th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-2">{s.name}</td>
                  <td className="text-right">{money(s.sales)}</td>
                  <td className="text-right font-medium text-brand-700">{money(s.commission)}</td>
                </tr>
              ))}
              {staff.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400">{t('暂无数据')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 font-semibold">{t('近30天营业额')}</div>
        <div className="flex h-40 items-end gap-1">
          {daily.map((d) => (
            <div key={d.day} className="group relative flex-1" title={`${d.day}: ${money(d.revenue)}`}>
              <div className="rounded-t bg-brand-500/80 transition group-hover:bg-brand-600"
                   style={{ height: `${(d.revenue / maxRev) * 100}%`, minHeight: '2px' }} />
            </div>
          ))}
          {daily.length === 0 && <div className="w-full py-6 text-center text-slate-400">{t('暂无数据')}</div>}
        </div>
      </div>
    </div>
  );
}
