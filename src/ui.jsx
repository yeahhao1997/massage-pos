// 共享 UI：弹窗、轻提示 toast
import { createContext, useContext, useState, useCallback } from 'react';

// ---------- Toast ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((msg, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setList((l) => [...l, { id, msg, type }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 2600);
  }, []);
  const toast = {
    info: (m) => push(m, 'info'),
    ok: (m) => push(m, 'ok'),
    err: (m) => push(m, 'err'),
  };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 space-y-2">
        {list.map((t) => (
          <div
            key={t.id}
            className={
              'rounded-lg px-4 py-2 text-sm text-white shadow-lg ' +
              (t.type === 'ok' ? 'bg-emerald-600' : t.type === 'err' ? 'bg-rose-600' : 'bg-slate-800')
            }
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={'max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ' + (wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
