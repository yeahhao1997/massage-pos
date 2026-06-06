import { useEffect, useState } from 'react';
import { get, money, today, fmtTime } from '../lib.js';
import { useT } from '../i18n.jsx';

const STATUS = {
  booked: ['已预约', 'bg-slate-100 text-slate-600'],
  checked_in: ['已到店', 'bg-amber-100 text-amber-700'],
  done: ['已完成', 'bg-emerald-100 text-emerald-700'],
  cancelled: ['已取消', 'bg-slate-100 text-slate-400'],
  no_show: ['爽约', 'bg-rose-100 text-rose-700'],
};

function Stat({ label, value, sub }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useT();
  const [sum, setSum] = useState(null);
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    get('/reports/summary').then(setSum).catch(() => {});
    get(`/appointments?date=${today()}`).then(setAppts).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t('工作台')} · {today()}</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('今日营业额')} value={sum ? money(sum.revenue) : '—'} sub={`${sum?.orders || 0}${t('笔订单')}`} />
        <Stat label={t('今日充值')} value={sum ? money(sum.recharge_amount) : '—'} />
        <Stat label={t('今日新会员')} value={sum?.new_members ?? '—'} />
        <Stat label={t('今日预约')} value={appts.length} sub={`${appts.filter(a => a.status === 'done').length} ${t('已完成')}`} />
      </div>

      <div className="card">
        <div className="mb-3 font-semibold">{t('今日预约')}</div>
        <div className="space-y-1">
          {appts.map((a) => {
            const [txt, cls] = STATUS[a.status] || STATUS.booked;
            return (
              <div key={a.id} className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500">{fmtTime(a.start_at).slice(11)}</span>
                  <div>
                    <div className="font-medium">{a.member_name || a.customer_name || t('散客')} · {a.service_name || '—'}</div>
                    <div className="text-xs text-slate-400">{a.staff_name || t('未分配')} · {a.room_name || t('未排房')}</div>
                  </div>
                </div>
                <span className={'rounded-full px-2 py-0.5 text-xs ' + cls}>{t(txt)}</span>
              </div>
            );
          })}
          {appts.length === 0 && <div className="py-8 text-center text-slate-400">{t('今天还没有预约')}</div>}
        </div>
      </div>
    </div>
  );
}
