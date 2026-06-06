// 登录状态 / auth context
import { createContext, useContext, useEffect, useState } from 'react';
import { get, post, setToken, getToken } from './lib.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getToken()) {
      get('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    const onExpire = () => setUser(null);
    window.addEventListener('auth:401', onExpire);
    return () => window.removeEventListener('auth:401', onExpire);
  }, []);

  async function doLogin(username, password) {
    const res = await post('/auth/login', { username, password });
    setToken(res.token);
    setUser(res.user);
  }
  async function doLogout() {
    try { await post('/auth/logout', {}); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, doLogin, doLogout }}>
      {children}
    </AuthCtx.Provider>
  );
}
