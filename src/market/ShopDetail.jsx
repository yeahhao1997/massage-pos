import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mGet, mPost } from './api.js';
import { money, today } from '../lib.js';
import { Modal, Field, useToast } from '../ui.jsx';
import { useT } from '../i18n.jsx';

export default function ShopDetail() {
  const { id } = useParams();
  const { t } = useT();
  const [shop, setShop] = useState(null);
  const [booking, setBooking] = useState(null); // 选中的服务

  useEffect(() => { mGet(`/tenants/${id}`).then(setShop).catch(() => {}); }, [id]);
  if (!shop) return <div className="py-10 text-center text-slate-400">…</div>;

  return (
    <div className="space-y-4">
      <Link to="/m" className="text-sm text-brand-600">‹ {t('返回门店列表')}</Link>
      <div className="card overflow-hidden">
        <div className="-mx-5 -mt-5 mb-4 h-48 w-[calc(100%+2.5rem)] overflow-hidden rounded-t-2xl bg-brand-50">
          {shop.photo
            ? <img src={shop.photo} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-6xl">💆</div>}
        </div>
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <div className="mt-1 text-sm text-slate-400">📍 {shop.city} · {shop.address}　☎ {shop.phone}</div>
        {shop.intro && <p className="mt-2 text-slate-600">{shop.intro}</p>}
        {shop.staff.length > 0 &&
          <div className="mt-2 text-xs text-slate-400">{t('技师')}：{shop.staff.map((s) => s.name).join('、')}</div>}
      </div>

      <div>
        <div className="mb-2 font-semibold">{t('服务项目')}</div>
        <div className="space-y-2">
          {shop.services.map((sv) => (
            <div key={sv.id} className="card flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{sv.name}</div>
                <div className="text-xs text-slate-400">{sv.duration_min} {t('分钟')}{sv.category ? ` · ${sv.category}` : ''}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-brand-700">{money(sv.price)}</span>
                <button className="btn-primary px-4 py-1.5 text-sm" onClick={() => setBooking(sv)}>{t('立即预约')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BookingModal shop={shop} service={booking} onClose={() => setBooking(null)} />
    </div>
  );
}

function BookingModal({ shop, service, onClose }) {
  const { t } = useT();
  const toast = useToast();
  const [f, setF] = useState({ date: today(), time: '14:00', staff_id: '', customer_name: '', customer_phone: '' });
  const [done, setDone] = useState(null);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (!service) return null;

  async function submit() {
    try {
      const res = await mPost('/appointments', {
        tenant_id: shop.id, service_id: service.id, staff_id: f.staff_id || null,
        customer_name: f.customer_name, customer_phone: f.customer_phone,
        start_at: `${f.date}T${f.time}:00`,
      });
      setDone(res);
      toast.ok(t('预约成功'));
    } catch (e) { toast.err(e.message); }
  }

  return (
    <Modal open={!!service} onClose={onClose} title={`${t('预约')} · ${service.name}`}>
      {done ? (
        <div className="space-y-4 text-center">
          <div className="text-5xl">✅</div>
          <div className="font-semibold">{t('预约已提交！')}</div>
          <div className="text-sm text-slate-500">
            {shop.name}<br />{service.name} · {money(service.price)}<br />
            {done.start_at.replace('T', ' ').slice(0, 16)}
          </div>
          <p className="text-xs text-slate-400">{t('到店出示手机号即可，门店会为你安排。')}</p>
          <button className="btn-primary w-full" onClick={onClose}>{t('完成')}</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-brand-50 p-3 text-sm">
            <div className="font-medium">{service.name}</div>
            <div className="text-slate-500">{service.duration_min} {t('分钟')} · {money(service.price)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('日期')}><input type="date" className="input" value={f.date} onChange={up('date')} /></Field>
            <Field label={t('时间')}><input type="time" className="input" value={f.time} onChange={up('time')} /></Field>
          </div>
          <Field label={t('指定技师（可选）')}>
            <select className="input" value={f.staff_id} onChange={up('staff_id')}>
              <option value="">{t('不指定')}</option>
              {shop.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label={t('你的姓名')}><input className="input" value={f.customer_name} onChange={up('customer_name')} /></Field>
          <Field label={t('手机号')}><input className="input" value={f.customer_phone} onChange={up('customer_phone')} /></Field>
          <button className="btn-primary w-full py-3" onClick={submit}>{t('确认预约')}</button>
        </div>
      )}
    </Modal>
  );
}
