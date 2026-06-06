import { useEffect, useState } from 'react';
import { mGet, mPost, setMToken, getMToken } from './api.js';
import { money, fmtTime } from '../lib.js';
import { useToast } from '../ui.jsx';
import { useT } from '../i18n.jsx';

export default function MemberAccount() {
  const { t } = useT();
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!getMToken()) { setLoading(false); return; }
    try { setMe(await mGet('/member/me')); } catch { setMToken(null); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  function logout() { setMToken(null); setMe(null); }

  if (loading) return <div className="py-10 text-center text-slate-400">…</div>;
  if (!me) return <LoginForm onDone={(m) => { setMe(m); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white">
        <div className="flex justify-between text-xs opacity-80"><span>{me.name} · {me.member_no}</span><span>{me.level}</span></div>
        <div className="mt-4 text-sm opacity-80">{t('我的余额（全平台通用）')}</div>
        <div className="text-3xl font-bold">{money(me.balance)}</div>
        <div className="mt-1 text-sm opacity-90">{t('积分')} {me.points}</div>
      </div>

      {me.packages?.length > 0 && (
        <Section title={t('我的次卡')}>
          {me.packages.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <span>{p.name} <span className="text-xs text-slate-400">@{p.tenant_name}</span></span>
              <span className="font-medium">{p.kind === 'count' ? `${p.remaining_times} ${t('次')}` : t('期限卡')}</span>
            </div>
          ))}
        </Section>
      )}

      <Section title={t('消费记录（跨店）')}>
        {me.transactions.map((tx, i) => (
          <div key={i} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
            <div>
              <div>{tx.note}</div>
              <div className="text-xs text-slate-400">{tx.tenant_name} · {fmtTime(tx.created_at)}</div>
            </div>
            <span className={'font-medium ' + (tx.amount > 0 ? 'text-emerald-600' : tx.amount < 0 ? 'text-rose-600' : 'text-slate-400')}>
              {tx.amount > 0 ? '+' : ''}{tx.amount !== 0 ? money(tx.amount) : t('次卡')}
            </span>
          </div>
        ))}
        {me.transactions.length === 0 && <div className="py-4 text-center text-slate-400">{t('暂无记录')}</div>}
      </Section>

      {me.appointments?.length > 0 && (
        <Section title={t('我的预约')}>
          {me.appointments.map((a, i) => (
            <div key={i} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <span>{a.service_name} <span className="text-xs text-slate-400">@{a.tenant_name}</span></span>
              <span className="text-slate-500">{fmtTime(a.start_at)}</span>
            </div>
          ))}
        </Section>
      )}

      <button className="btn-ghost w-full" onClick={logout}>{t('退出会员')}</button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card">
      <div className="mb-2 font-semibold">{title}</div>
      {children}
    </div>
  );
}

function LoginForm({ onDone }) {
  const { t } = useT();
  const toast = useToast();
  const [member_no, setNo] = useState('');
  const [phone, setPhone] = useState('');

  async function submit() {
    try {
      const res = await mPost('/member/login', { member_no, phone });
      setMToken(res.token);
      onDone(res.member);
    } catch (e) { toast.err(e.message); }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="text-center">
        <div className="text-2xl font-bold">{t('会员登录')}</div>
        <p className="text-sm text-slate-500">{t('查看你的余额与消费记录')}</p>
      </div>
      <div className="card space-y-3">
        <div><span className="label">{t('会员卡号')}</span><input className="input" value={member_no} onChange={(e) => setNo(e.target.value)} placeholder="VIP0001" /></div>
        <div><span className="label">{t('手机号')}</span><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="012-3456789" /></div>
        <button className="btn-primary w-full py-3" onClick={submit}>{t('登录')}</button>
        <p className="text-center text-xs text-slate-400">{t('演示：VIP0001 / 012-3456789')}</p>
      </div>
    </div>
  );
}
