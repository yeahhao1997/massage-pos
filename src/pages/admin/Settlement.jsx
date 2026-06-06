import { useEffect, useState } from 'react';
import { get, money, today } from '../../lib.js';
import { useT } from '../../i18n.jsx';

export default function Settlement() {
  const { t } = useT();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);

  async function load() { setData(await get(`/admin/settlement?from=${from}&to=${to}`)); }
  useEffect(() => { load(); }, []); // eslint-disable-line

  const totalNet = data?.rows.reduce((s, x) => s + x.net, 0) || 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('店间结算')}</h1>
      <p className="text-xs text-slate-400">
        {t('净额 = 该店收的充值款 − 该店核销的服务额。正数=该店欠平台，负数=平台应付该店。')}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">{t('起')} <input type="date" className="input inline-block w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">{t('止')} <input type="date" className="input inline-block w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn-primary" onClick={load}>{t('查询')}</button>
        <button className="btn-ghost text-xs" onClick={() => { const a = '2000-01-01'; setFrom(a); }}>{t('全部')}</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="py-2 pr-4">{t('门店')}</th>
              <th className="py-2 pr-4 text-right">{t('收款(充值)')}</th>
              <th className="py-2 pr-4 text-right">{t('核销(服务)')}</th>
              <th className="py-2 pr-4 text-right">{t('净额')}</th>
              <th className="py-2 text-right">{t('结算方向')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="py-2 pr-4 font-medium">{s.name}<div className="text-xs font-normal text-slate-400">{s.city}</div></td>
                <td className="py-2 pr-4 text-right">{money(s.collected)}</td>
                <td className="py-2 pr-4 text-right">{money(s.redeemed)}</td>
                <td className={'py-2 pr-4 text-right font-bold ' + (s.net > 0 ? 'text-rose-600' : s.net < 0 ? 'text-emerald-600' : '')}>
                  {money(s.net)}
                </td>
                <td className="py-2 text-right text-xs">
                  {s.net > 0 ? t('该店付平台') : s.net < 0 ? t('平台付该店') : t('持平')}
                </td>
              </tr>
            ))}
            {!data?.rows.length && <tr><td colSpan={5} className="py-6 text-center text-slate-400">{t('暂无数据')}</td></tr>}
          </tbody>
          {data?.rows.length ? (
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="py-2 pr-4">{t('合计净额')}</td>
                <td colSpan={2}></td>
                <td className="py-2 pr-4 text-right">{money(totalNet)}</td>
                <td></td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
