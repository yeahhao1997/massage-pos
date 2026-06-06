import { useEffect, useState } from 'react';
import { get, money, today } from '../../lib.js';
import { useT } from '../../i18n.jsx';

export default function Overview() {
  const { t } = useT();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [ov, setOv] = useState(null);

  async function load() { setOv(await get(`/admin/overview?from=${from}&to=${to}`)); }
  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t('平台概览')}</h1>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">{t('起')} <input type="date" className="input inline-block w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-sm">{t('止')} <input type="date" className="input inline-block w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn-primary" onClick={load}>{t('查询')}</button>
      </div>

      {ov && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card label={t('入驻门店')} value={ov.tenants} />
            <Card label={t('平台会员')} value={ov.members} />
            <Card label={t('钱包总余额(负债)')} value={money(ov.wallet_liability)} accent="text-rose-600" />
            <Card label={t('期间营业额')} value={money(ov.revenue)} accent="text-emerald-600" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card label={t('期间订单')} value={ov.orders} />
            <Card label={t('期间充值')} value={money(ov.recharge)} />
          </div>
          <p className="text-xs text-slate-400">
            {t('「钱包总余额」是所有会员未消费的储值，属于平台对会员的负债，结算时要心里有数。')}
          </p>
        </>
      )}
    </div>
  );
}

function Card({ label, value, accent }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={'mt-1 text-2xl font-bold ' + (accent || '')}>{value}</div>
    </div>
  );
}
