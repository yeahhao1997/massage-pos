import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mGet } from './api.js';
import { money } from '../lib.js';
import { useT } from '../i18n.jsx';

export default function Shops() {
  const { t } = useT();
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState('');
  const [shops, setShops] = useState([]);

  useEffect(() => { mGet('/cities').then(setCities).catch(() => {}); }, []);
  useEffect(() => { mGet(`/tenants${city ? `?city=${encodeURIComponent(city)}` : ''}`).then(setShops).catch(() => {}); }, [city]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('找按摩院')}</h1>
        <p className="text-sm text-slate-500">{t('选择门店，在线预约')}</p>
      </div>

      <div className="flex flex-wrap gap-1">
        <Chip active={city === ''} onClick={() => setCity('')}>{t('全部城市')}</Chip>
        {cities.map((c) => <Chip key={c} active={city === c} onClick={() => setCity(c)}>{c}</Chip>)}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {shops.map((s) => (
          <Link key={s.id} to={`/m/shop/${s.id}`} className="card transition hover:ring-brand-300">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{s.name}</div>
                <div className="text-xs text-slate-400">📍 {s.city} · {s.address}</div>
              </div>
            </div>
            {s.intro && <p className="mt-2 text-sm text-slate-500">{s.intro}</p>}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">{s.service_count} {t('项服务')}</span>
              {s.from_price != null && <span className="font-medium text-brand-700">{t('低至')} {money(s.from_price)}</span>}
            </div>
          </Link>
        ))}
        {shops.length === 0 && <div className="col-span-full py-10 text-center text-slate-400">{t('该城市暂无门店')}</div>}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={'rounded-full px-3 py-1 text-sm ' + (active ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}>
      {children}
    </button>
  );
}
