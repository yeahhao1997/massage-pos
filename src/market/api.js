// 顾客端 API（独立的会员令牌，不与员工登录冲突）
const BASE = '/api/public';

let mToken = localStorage.getItem('member_token') || null;
export function setMToken(t) {
  mToken = t;
  if (t) localStorage.setItem('member_token', t);
  else localStorage.removeItem('member_token');
}
export function getMToken() { return mToken; }

export async function mApi(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(mToken ? { Authorization: `Bearer ${mToken}` } : {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401 && mToken) setMToken(null);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data;
}
export const mGet = (p) => mApi(p);
export const mPost = (p, b) => mApi(p, { method: 'POST', body: b });
