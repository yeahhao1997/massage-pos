import { useEffect, useState } from 'react';
import { get, post, put, today, fmtTime } from '../lib.js';
import { Modal, Field, useToast } from '../ui.jsx';
import { useT } from '../i18n.jsx';

const FLOW = {
  booked: { label: '已预约', cls: 'bg-slate-100 text-slate-600', next: 'checked_in', nextLabel: '到店' },
  checked_in: { label: '已到店', cls: 'bg-amber-100 text-amber-700', next: 'done', nextLabel: '完成' },
  done: { label: '已完成', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: '已取消', cls: 'bg-slate-100 text-slate-400' },
  no_show: { label: '爽约', cls: 'bg-rose-100 text-rose-700' },
};

export default function Appointments() {
  const { t } = useT();
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    try { setList(await get(`/appointments?date=${date}`)); }
    catch (e) { toast.err(e.message); }
  }
  useEffect(() => { load(); }, [date]); // eslint-disable-line

  async function setStatus(a, status) {
    try { await put(`/appointments/${a.id}`, { status }); load(); }
    catch (e) { toast.err(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('预约排班')}</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>{t('＋ 新预约')}</button>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-ghost" onClick={() => setDate(shift(date, -1))}>‹</button>
        <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn-ghost" onClick={() => setDate(shift(date, 1))}>›</button>
        <button className="btn-ghost text-xs" onClick={() => setDate(today())}>{t('今天')}</button>
      </div>

      <div className="space-y-2">
        {list.map((a) => {
          const f = FLOW[a.status] || FLOW.booked;
          return (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="font-mono font-semibold">{fmtTime(a.start_at).slice(11)}</div>
                  <div className="text-xs text-slate-400">{a.duration_min || ''}{t('分钟')}</div>
                </div>
                <div>
                  <div className="font-medium">{a.member_name || a.customer_name || t('散客')} · {a.service_name || '—'}</div>
                  <div className="text-xs text-slate-400">{a.staff_name || t('未分配技师')} · {a.room_name || t('未排房')}{a.customer_phone ? ` · ${a.customer_phone}` : ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={'rounded-full px-2 py-0.5 text-xs ' + f.cls}>{t(f.label)}</span>
                {f.next && <button className="btn-primary px-3 py-1 text-xs" onClick={() => setStatus(a, f.next)}>{t(f.nextLabel)}</button>}
                {a.status !== 'cancelled' && a.status !== 'done' &&
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => setStatus(a, 'cancelled')}>{t('取消')}</button>}
              </div>
            </div>
          );
        })}
        {list.length === 0 && <div className="py-10 text-center text-slate-400">{t('当天没有预约')}</div>}
      </div>

      <NewApptModal open={showNew} date={date} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />
    </div>
  );
}

function shift(d, days) {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() + days);
  return dt.toLocaleDateString('sv-SE');
}

function NewApptModal({ open, date, onClose, onDone }) {
  const { t } = useT();
  const toast = useToast();
  const [opts, setOpts] = useState({ staff: [], services: [], rooms: [], members: [] });
  const [f, setF] = useState({ customer_name: '', customer_phone: '', member_id: '', staff_id: '', service_id: '', room_id: '', time: '10:00' });
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!open) return;
    Promise.all([get('/catalog/staff'), get('/catalog/services'), get('/catalog/rooms'), get('/members')])
      .then(([staff, services, rooms, members]) => setOpts({ staff, services, rooms, members }))
      .catch(() => {});
  }, [open]);

  async function submit() {
    try {
      await post('/appointments', {
        member_id: f.member_id || null,
        customer_name: f.customer_name || null,
        customer_phone: f.customer_phone || null,
        staff_id: f.staff_id || null,
        service_id: f.service_id || null,
        room_id: f.room_id || null,
        start_at: `${date}T${f.time}:00`,
      });
      toast.ok(t('预约已创建'));
      onDone();
    } catch (e) { toast.err(e.message); }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${t('新预约')} · ${date}`}>
      <div className="space-y-3">
        <Field label={t('会员（可选，散客留空）')}>
          <select className="input" value={f.member_id} onChange={up('member_id')}>
            <option value="">— {t('散客')} —</option>
            {opts.members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.card_no})</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('散客姓名')}><input className="input" value={f.customer_name} onChange={up('customer_name')} /></Field>
          <Field label={t('手机号')}><input className="input" value={f.customer_phone} onChange={up('customer_phone')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('时间')}><input type="time" className="input" value={f.time} onChange={up('time')} /></Field>
          <Field label={t('技师')}>
            <select className="input" value={f.staff_id} onChange={up('staff_id')}>
              <option value="">{t('未分配')}</option>
              {opts.staff.filter(s => s.role === 'therapist').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('服务项目')}>
            <select className="input" value={f.service_id} onChange={up('service_id')}>
              <option value="">{t('选择')}</option>
              {opts.services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_min}{t('分钟')})</option>)}
            </select>
          </Field>
          <Field label={t('房间')}>
            <select className="input" value={f.room_id} onChange={up('room_id')}>
              <option value="">{t('未排房')}</option>
              {opts.rooms.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
            </select>
          </Field>
        </div>
        <button className="btn-primary w-full" onClick={submit}>{t('创建预约')}</button>
      </div>
    </Modal>
  );
}
