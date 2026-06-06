import { useEffect, useState } from 'react';
import { get, post, money } from '../lib.js';
import { useToast } from '../ui.jsx';
import { useT } from '../i18n.jsx';

const PAYS = [['balance', '会员余额'], ['cash', '现金'], ['tng', 'Touch\'n Go'], ['grabpay', 'GrabPay'], ['duitnow', 'DuitNow'], ['fpx', 'FPX'], ['card', '银行卡']];

export default function Checkout() {
  const { t } = useT();
  const toast = useToast();
  const [cat, setCat] = useState({ services: [], products: [], staff: [], members: [] });
  const [items, setItems] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [pay, setPay] = useState('cash');

  useEffect(() => {
    Promise.all([get('/catalog/services'), get('/catalog/products'), get('/catalog/staff'), get('/members')])
      .then(([services, products, staff, members]) => setCat({ services, products, staff, members }))
      .catch((e) => toast.err(e.message));
  }, []); // eslint-disable-line

  const member = cat.members.find((m) => String(m.id) === String(memberId));
  const total = items.reduce((s, it) => s + it.unit_price * it.qty, 0);

  function add(item_type, src) {
    setItems((l) => [...l, {
      key: Math.random().toString(36).slice(2),
      item_type, ref_id: src.id, name: src.name, unit_price: src.price, qty: 1, staff_id: '',
    }]);
  }
  const patch = (key, p) => setItems((l) => l.map((it) => (it.key === key ? { ...it, ...p } : it)));
  const remove = (key) => setItems((l) => l.filter((it) => it.key !== key));

  async function submit() {
    if (!items.length) return toast.err(t('请先添加项目'));
    if (pay === 'balance' && !memberId) return toast.err(t('余额支付需选择会员'));
    try {
      await post('/orders', {
        member_id: memberId || null,
        pay_method: pay,
        items: items.map((it) => ({
          item_type: it.item_type, ref_id: it.ref_id, name: it.name,
          unit_price: it.unit_price, qty: it.qty, staff_id: it.staff_id || null,
        })),
      });
      toast.ok(`${t('结账成功')} ${money(total)}`);
      setItems([]); setMemberId('');
    } catch (e) { toast.err(e.message); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{t('收银台')}</h1>
        <Section title={t('服务项目')}>
          {cat.services.map((s) => (
            <button key={s.id} onClick={() => add('service', s)} className="card text-left transition hover:ring-brand-300">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-slate-400">{s.duration_min}{t('分钟')}</div>
              <div className="mt-1 font-bold text-brand-700">{money(s.price)}</div>
            </button>
          ))}
        </Section>
        <Section title={t('商品')}>
          {cat.products.map((p) => (
            <button key={p.id} onClick={() => add('product', p)} className="card text-left transition hover:ring-brand-300">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-400">{t('库存')} {p.stock}</div>
              <div className="mt-1 font-bold text-brand-700">{money(p.price)}</div>
            </button>
          ))}
          {cat.products.length === 0 && <div className="text-sm text-slate-400">{t('暂无商品（去设置里添加）')}</div>}
        </Section>
      </div>

      <div className="card flex h-fit flex-col gap-3 lg:sticky lg:top-6">
        <div className="font-semibold">{t('当前账单')}</div>

        <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">{t('散客（不绑定会员）')}</option>
          {cat.members.map((m) => <option key={m.id} value={m.id}>{m.name} · {t('余额')} {money(m.balance)}</option>)}
        </select>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {items.map((it) => (
            <div key={it.key} className="rounded-lg border border-slate-200 p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{it.name}</span>
                <button className="text-slate-400 hover:text-rose-600" onClick={() => remove(it.key)}>✕</button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" min="1" className="input w-14 px-2 py-1" value={it.qty}
                       onChange={(e) => patch(it.key, { qty: Math.max(1, +e.target.value) })} />
                <span className="text-slate-400">×</span>
                <span className="flex-1">{money(it.unit_price)}</span>
                <select className="input w-28 px-2 py-1 text-xs" value={it.staff_id}
                        onChange={(e) => patch(it.key, { staff_id: e.target.value })}>
                  <option value="">{t('选技师')}</option>
                  {cat.staff.filter(s => s.role === 'therapist').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="py-8 text-center text-sm text-slate-400">{t('点左侧添加项目')}</div>}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-slate-500">{t('合计')}</span>
          <span className="text-2xl font-bold text-emerald-600">{money(total)}</span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {PAYS.map(([k, l]) => (
            <button key={k} onClick={() => setPay(k)}
              className={'rounded-lg py-2 text-xs ' + (pay === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
              {t(l)}
            </button>
          ))}
        </div>
        {pay === 'balance' && member && (
          <div className={'text-center text-xs ' + (member.balance >= total ? 'text-slate-400' : 'text-rose-600')}>
            {t('会员余额')} {money(member.balance)}
          </div>
        )}

        <button className="btn-primary w-full py-3 text-base" onClick={submit}>{t('确认结账')}</button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-500">{title}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}
