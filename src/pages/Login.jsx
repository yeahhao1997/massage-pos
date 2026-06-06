import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useT } from '../i18n.jsx';

export default function Login() {
  const { doLogin } = useAuth();
  const { t, lang, toggle } = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await doLogin(username.trim(), password); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const fill = (u, p) => { setUsername(u); setPassword(p); };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="text-3xl font-bold">💆 {t('按摩院平台')}</div>
          <div className="text-sm opacity-80">Massage Platform · Malaysia</div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <div>
            <span className="label">{t('账号')}</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <span className="label">{t('密码')}</span>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? '…' : t('登录')}</button>

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
            <div className="mb-1">{t('演示账号（点击填入）')}：</div>
            <div className="flex flex-wrap gap-1">
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => fill('admin', 'admin123')}>{t('平台管理员')}</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => fill('kl', 'kl123')}>KL {t('店')}</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => fill('penang', 'penang123')}>Penang {t('店')}</button>
            </div>
          </div>
        </form>

        <button onClick={toggle} className="mx-auto mt-4 block text-xs text-white/80 hover:text-white">
          🌐 {lang === 'zh' ? 'English' : '中文'}
        </button>
      </div>
    </div>
  );
}
