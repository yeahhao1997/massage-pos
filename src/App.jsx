import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './ui.jsx';
import MarketApp from './market/MarketApp.jsx';
import { LangProvider, useT } from './i18n.jsx';
import { AuthProvider, useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Members from './pages/Members.jsx';
import Appointments from './pages/Appointments.jsx';
import Checkout from './pages/Checkout.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Overview from './pages/admin/Overview.jsx';
import Tenants from './pages/admin/Tenants.jsx';
import Settlement from './pages/admin/Settlement.jsx';

const SHOP_NAV = [
  { to: '/', label: '工作台', icon: '🏠', end: true },
  { to: '/members', label: '会员', icon: '💳' },
  { to: '/appointments', label: '预约', icon: '📅' },
  { to: '/checkout', label: '收银', icon: '🧾' },
  { to: '/reports', label: '报表', icon: '📊' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];
const ADMIN_NAV = [
  { to: '/', label: '平台概览', icon: '📊', end: true },
  { to: '/tenants', label: '门店管理', icon: '🏬' },
  { to: '/settlement', label: '店间结算', icon: '💱' },
];

function Layout({ nav, title, children }) {
  const { t, lang, toggle } = useT();
  const { user, doLogout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="order-2 border-t border-slate-200 bg-white md:order-1 md:flex md:w-52 md:flex-col md:border-r md:border-t-0">
        <div className="hidden px-5 py-5 md:block">
          <div className="text-lg font-bold text-brand-700">💆 {t(title)}</div>
          <div className="text-xs text-slate-400">{user?.tenant?.name || t('平台')}</div>
        </div>
        <nav className="flex justify-around md:flex-col md:gap-1 md:px-3">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm ' +
                (isActive ? 'text-brand-700 md:bg-brand-50 font-medium' : 'text-slate-500 hover:text-slate-800')}>
              <span className="text-lg md:text-base">{n.icon}</span>
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden gap-2 px-3 py-4 md:flex md:flex-col">
          <button onClick={toggle} className="btn-ghost text-xs">🌐 {lang === 'zh' ? 'English' : '中文'}</button>
          <button onClick={doLogout} className="btn-ghost text-xs">🚪 {t('退出')} ({user?.name || user?.username})</button>
        </div>
      </aside>

      <main className="order-1 flex-1 p-4 md:order-2 md:p-6">
        <div className="mb-2 flex justify-end gap-2 md:hidden">
          <button onClick={toggle} className="btn-ghost px-3 py-1 text-xs">🌐 {lang === 'zh' ? 'EN' : '中'}</button>
          <button onClick={doLogout} className="btn-ghost px-3 py-1 text-xs">🚪 {t('退出')}</button>
        </div>
        {children}
      </main>
    </div>
  );
}

function ShopApp() {
  return (
    <Layout nav={SHOP_NAV} title="按摩院柜台">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

function AdminApp() {
  return (
    <Layout nav={ADMIN_NAV} title="平台管理">
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

function StaffRoot() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">…</div>;
  if (!user) return <Login />;
  return user.role === 'platform_admin' ? <AdminApp /> : <ShopApp />;
}

// 顾客端走 /m，员工/管理员走 /
function Top() {
  const loc = useLocation();
  if (loc.pathname === '/m' || loc.pathname.startsWith('/m/')) return <MarketApp />;
  return <StaffRoot />;
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <ToastProvider>
          <Top />
        </ToastProvider>
      </AuthProvider>
    </LangProvider>
  );
}
