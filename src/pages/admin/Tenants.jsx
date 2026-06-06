import { useEffect, useState } from 'react';
import { get, post, put } from '../../lib.js';
import { Modal, Field, PhotoInput, useToast } from '../../ui.jsx';
import { useT } from '../../i18n.jsx';

export default function Tenants() {
  const { t } = useT();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [edit, setEdit] = useState(null);

  async function load() {
    try { setRows(await get('/admin/tenants')); } catch (e) { toast.err(e.message); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function toggleStatus(tn) {
    try {
      await put(`/admin/tenants/${tn.id}`, { status: tn.status === 'active' ? 'suspended' : 'active' });
      load();
    } catch (e) { toast.err(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('门店管理')}</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>{t('＋ 入驻新门店')}</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((tn) => (
          <div key={tn.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{tn.name}</div>
                <div className="text-xs text-slate-400">{tn.city || '—'} · {tn.phone || '—'}</div>
              </div>
              <span className={'rounded-full px-2 py-0.5 text-xs ' + (tn.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600')}>
                {t(tn.status === 'active' ? '营业中' : '已暂停')}
              </span>
            </div>
            <div className="mt-3 flex justify-between text-sm text-slate-500">
              <span>{t('技师')} {tn.staff_count}</span>
              <span>{t('订单')} {tn.order_count}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn-ghost flex-1 text-xs" onClick={() => setEdit(tn)}>{t('编辑')}</button>
              <button className="btn-ghost flex-1 text-xs" onClick={() => toggleStatus(tn)}>
                {tn.status === 'active' ? t('暂停营业') : t('恢复营业')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <NewTenantModal open={showNew} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />
      <EditTenantModal tenant={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />
    </div>
  );
}

function EditTenantModal({ tenant, onClose, onDone }) {
  const { t } = useT();
  const toast = useToast();
  const [f, setF] = useState(null);
  useEffect(() => {
    if (tenant) setF({ name: tenant.name, city: tenant.city || '', address: tenant.address || '', phone: tenant.phone || '', intro: tenant.intro || '', photo: tenant.photo || '' });
  }, [tenant]);
  if (!tenant || !f) return null;
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    try {
      await put(`/admin/tenants/${tenant.id}`, f);
      toast.ok(t('已保存'));
      onDone();
    } catch (e) { toast.err(e.message); }
  }

  return (
    <Modal open={!!tenant} onClose={onClose} title={t('编辑门店')} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('门店名称 *')}><input className="input" value={f.name} onChange={up('name')} /></Field>
        <Field label={t('城市')}><input className="input" value={f.city} onChange={up('city')} /></Field>
        <Field label={t('地址')}><input className="input" value={f.address} onChange={up('address')} /></Field>
        <Field label={t('电话')}><input className="input" value={f.phone} onChange={up('phone')} /></Field>
        <div className="sm:col-span-2"><Field label={t('简介')}><input className="input" value={f.intro} onChange={up('intro')} /></Field></div>
        <div className="sm:col-span-2"><PhotoInput label={t('门店照片')} value={f.photo} onChange={(v) => setF({ ...f, photo: v })} /></div>
      </div>
      <button className="btn-primary mt-4 w-full" onClick={submit}>{t('保存')}</button>
    </Modal>
  );
}

function NewTenantModal({ open, onClose, onDone }) {
  const { t } = useT();
  const toast = useToast();
  const blank = { name: '', city: '', address: '', phone: '', intro: '', photo: '', owner_username: '', owner_password: '' };
  const [f, setF] = useState(blank);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    try {
      await post('/admin/tenants', f);
      toast.ok(t('门店已入驻'));
      setF(blank);
      onDone();
    } catch (e) { toast.err(e.message); }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('入驻新门店')} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('门店名称 *')}><input className="input" value={f.name} onChange={up('name')} /></Field>
        <Field label={t('城市')}><input className="input" value={f.city} onChange={up('city')} placeholder="Kuala Lumpur" /></Field>
        <Field label={t('地址')}><input className="input" value={f.address} onChange={up('address')} /></Field>
        <Field label={t('电话')}><input className="input" value={f.phone} onChange={up('phone')} /></Field>
        <div className="sm:col-span-2"><Field label={t('简介')}><input className="input" value={f.intro} onChange={up('intro')} /></Field></div>
        <div className="sm:col-span-2"><PhotoInput label={t('门店照片')} value={f.photo} onChange={(v) => setF({ ...f, photo: v })} /></div>
        <Field label={t('店老板登录账号 *')}><input className="input" value={f.owner_username} onChange={up('owner_username')} /></Field>
        <Field label={t('店老板密码 *')}><input className="input" value={f.owner_password} onChange={up('owner_password')} /></Field>
      </div>
      <button className="btn-primary mt-4 w-full" onClick={submit}>{t('确认入驻')}</button>
    </Modal>
  );
}
