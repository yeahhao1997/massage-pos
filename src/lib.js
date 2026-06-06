// 前端通用工具：带令牌的 API 请求 + 金额(RM)/日期格式化
const BASE = '/api';

let authToken = localStorage.getItem('token') || null;
export function setToken(t) {
  authToken = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}
export function getToken() { return authToken; }

export async function api(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('auth:401'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data;
}

export const get = (p) => api(p);
export const post = (p, body) => api(p, { method: 'POST', body });
export const put = (p, body) => api(p, { method: 'PUT', body });
export const del = (p) => api(p, { method: 'DELETE' });

// sen -> RM（显示）
export const rmAmount = (sen) => (Number(sen || 0) / 100).toFixed(2);
export const money = (sen) => 'RM' + rmAmount(sen);
// RM -> sen（提交）
export const toCents = (rm) => Math.round(Number(rm || 0) * 100);
// 兼容旧调用名
export const yuan = rmAmount;

export const today = () => new Date().toLocaleDateString('sv-SE');

export function fmtTime(iso) {
  if (!iso) return '';
  return iso.replace('T', ' ').slice(0, 16);
}
