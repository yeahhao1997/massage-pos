import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useT } from '../i18n.jsx';
import Shops from './Shops.jsx';
import ShopDetail from './ShopDetail.jsx';
import MemberAccount from './MemberAccount.jsx';

export default function MarketApp() {
  const { t, lang, toggle } = useT();
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <NavLink to="/m" className="text-lg font-bold text-brand-700">💆 {t('按摩院平台')}</NavLink>
        <div className="flex items-center gap-2 text-sm">
          <NavLink to="/m" end className={({ isActive }) => isActive ? 'font-medium text-brand-700' : 'text-slate-500'}>{t('找店')}</NavLink>
          <NavLink to="/m/account" className={({ isActive }) => isActive ? 'font-medium text-brand-700' : 'text-slate-500'}>{t('我的')}</NavLink>
          <button onClick={toggle} className="text-xs text-slate-400">🌐{lang === 'zh' ? 'EN' : '中'}</button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        <Routes>
          <Route path="/m" element={<Shops />} />
          <Route path="/m/shop/:id" element={<ShopDetail />} />
          <Route path="/m/account" element={<MemberAccount />} />
          <Route path="*" element={<Navigate to="/m" />} />
        </Routes>
      </main>
    </div>
  );
}
