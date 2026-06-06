import { useEffect, useState } from 'react';
import { get, post, money, toCents, fmtTime } from '../lib.js';
import { Modal, Field, useToast } from '../ui.jsx';
import { useT } from '../i18n.jsx';

export default function Members() {
  const { t } = useT();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    try { setList(await get(`/members?q=${encodeURIComponent(q)}`)); }
    catch (e) { toast.err(e.message); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function openDetail(id) {
    try { setSel(await get(`/members/${id}`)); }
    catch (e) { toast.err(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('会员卡')}</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>{t('＋ 开卡')}</button>
      </div>

      <div className="flex gap-2">
        <input
          className="input" placeholder={t('搜索卡号 / 姓名 / 手机号')}
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="btn-ghost" onClick={load}>{t('搜索')}</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <button key={m.id} onClick={() => openDetail(m.id)} className="card text-left transition hover:ring-brand-300">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-slate-400">{m.member_no} · {m.phone || '—'}</div>
              </div>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{t(m.level)}</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-xs text-slate-400">{t('余额')}</div>
                <div className="text-lg font-bold text-emerald-600">{money(m.balance)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{t('积分')}</div>
                <div className="font-medium">{m.points}</div>
              </div>
            </div>
          </button>
        ))}
        {list.length === 0 && <div className="col-span-full py-10 text-center text-slate-400">{t('暂无会员，点右上角开卡')}</div>}
      </div>

      <NewMemberModal open={showNew} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />
      <DetailModal member={sel} onClose={() => setSel(null)} onChanged={(m) => { setSel(m); load(); }} />
    </div>
  );
}

function NewMemberModal({ open, onClose, onDone }) {
  const { t } = useT();
  const toast = useToast();
  const [f, setF] = useState({ member_no: '', name: '', phone: '', gender: 'F', level: '普通会员' });
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    try {
      await post('/members', f);
      toast.ok(t('开卡成功'));
      setF({ member_no: '', name: '', phone: '', gender: 'F', level: '普通会员' });
      onDone();
    } catch (e) { toast.err(e.message); }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('开通会员卡')}>
      <div className="space-y-3">
        <Field label={t('卡号 *')}><input className="input" value={f.member_no} onChange={up('member_no')} placeholder="VIP0003" /></Field>
        <Field label={t('姓名 *')}><input className="input" value={f.name} onChange={up('name')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('手机号')}><input className="input" value={f.phone} onChange={up('phone')} /></Field>
          <Field label={t('性别')}>
            <select className="input" value={f.gender} onChange={up('gender')}>
              <option value="F">{t('女')}</option><option value="M">{t('男')}</option><option value="其他">{t('其他')}</option>
            </select>
          </Field>
        </div>
        <Field label={t('会员等级')}>
          <select className="input" value={f.level} onChange={up('level')}>
            <option value="普通会员">{t('普通会员')}</option><option value="黄金会员">{t('黄金会员')}</option><option value="钻石会员">{t('钻石会员')}</option>
          </select>
        </Field>
        <button className="btn-primary w-full" onClick={submit}>{t('确认开卡')}</button>
      </div>
    </Modal>
  );
}

function DetailModal({ member, onClose, onChanged }) {
  const { t } = useT();
  const toast = useToast();
  const [tab, setTab] = useState('recharge');
  const [amount, setAmount] = useState('');
  const [bonus, setBonus] = useState('');
  const [pay, setPay] = useState('TnG');
  const [note, setNote] = useState('');

  if (!member) return null;

  async function recharge() {
    try {
      await post(`/members/${member.id}/recharge`, {
        amount: toCents(amount), bonus: toCents(bonus),
        points: Math.floor(Number(amount) || 0), pay_method: pay,
      });
      toast.ok(t('充值成功')); setAmount(''); setBonus('');
      onChanged(await get(`/members/${member.id}`));
    } catch (e) { toast.err(e.message); }
  }
  async function consume() {
    try {
      await post(`/members/${member.id}/consume`, { amount: toCents(amount), note });
      toast.ok(t('扣款成功')); setAmount(''); setNote('');
      onChanged(await get(`/members/${member.id}`));
    } catch (e) { toast.err(e.message); }
  }
  async function redeem(pkgId) {
    try {
      await post(`/members/${member.id}/packages/${pkgId}/redeem`, {});
      toast.ok(t('核销成功'));
      onChanged(await get(`/members/${member.id}`));
    } catch (e) { toast.err(e.message); }
  }

  return (
    <Modal open={!!member} onClose={onClose} title={`${member.name} · ${member.member_no}`} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white">
            <div className="flex justify-between text-xs opacity-80"><span>{t(member.level)}</span><span>{t(member.status === 'active' ? '正常' : '冻结')}</span></div>
            <div className="mt-4 text-sm opacity-80">{t('储值余额')}</div>
            <div className="text-3xl font-bold">{money(member.balance)}</div>
            <div className="mt-2 flex justify-between text-sm opacity-90">
              <span>{t('积分')} {member.points}</span><span>{member.phone}</span>
            </div>
          </div>

          <div className="flex gap-1 rounded-lg bg-brand-50 p-1 text-sm">
            {[['recharge', '充值'], ['consume', '扣款'], ['cards', '次卡']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={'flex-1 rounded-md py-1.5 ' + (tab === k ? 'bg-white font-medium shadow-sm' : 'text-slate-500')}>{t(l)}</button>
            ))}
          </div>

          {tab === 'recharge' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('充值金额(RM)')}><input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
                <Field label={t('赠送金额(RM)')}><input className="input" type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} /></Field>
              </div>
              <div className="flex flex-wrap gap-1">
                {[500, 1000, 2000, 5000].map((v) => (
                  <button key={v} className="btn-ghost px-3 py-1 text-xs" onClick={() => setAmount(String(v))}>{v}</button>
                ))}
              </div>
              <Field label={t('支付方式')}>
                <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>
                  <option value="Cash">{t('现金')}</option><option value="TnG">Touch'n Go</option><option value="GrabPay">GrabPay</option><option value="DuitNow">DuitNow</option><option value="FPX">FPX</option><option value="Card">{t('银行卡')}</option>
                </select>
              </Field>
              <button className="btn-primary w-full" onClick={recharge}>{t('确认充值')}</button>
            </div>
          )}

          {tab === 'consume' && (
            <div className="space-y-3">
              <Field label={t('扣款金额(RM)')}><input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label={t('备注')}><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <button className="btn-danger w-full" onClick={consume}>{t('余额扣款')}</button>
            </div>
          )}

          {tab === 'cards' && (
            <div className="space-y-2">
              {member.packages?.length ? member.packages.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-slate-400">
                      {p.kind === 'count' ? `${t('剩')} ${p.remaining_times} ${t('次')}` : t('期限卡')}{p.expire_at ? ` · ${t('到期')} ${p.expire_at}` : ''}
                    </div>
                  </div>
                  {p.kind === 'count' && p.remaining_times > 0 &&
                    <button className="btn-primary px-3 py-1 text-xs" onClick={() => redeem(p.id)}>{t('核销1次')}</button>}
                </div>
              )) : <div className="py-6 text-center text-sm text-slate-400">{t('暂无次卡')}</div>}
            </div>
          )}
        </div>

        <div>
          <div className="label">{t('消费/充值流水')}</div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {member.transactions?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
                <div>
                  <div>{tx.note}</div>
                  <div className="text-xs text-slate-400">{fmtTime(tx.created_at)}</div>
                </div>
                <div className={'font-medium ' + (tx.amount > 0 ? 'text-emerald-600' : tx.amount < 0 ? 'text-rose-600' : 'text-slate-400')}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount !== 0 ? money(tx.amount) : t('次卡')}
                </div>
              </div>
            ))}
            {!member.transactions?.length && <div className="py-6 text-center text-sm text-slate-400">{t('暂无记录')}</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
