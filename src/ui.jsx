// 共享 UI：弹窗、轻提示 toast、照片选择
import { createContext, useContext, useState, useCallback } from 'react';
import { useT } from './i18n.jsx';

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

// 把图片文件缩到 maxW 宽以内并转成 jpeg dataURL，避免存太大
export function resizeImage(file, maxW = 900, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// 照片选择：手机选图自动压缩，或粘贴图片链接
export function PhotoInput({ value, onChange, label }) {
  const { t } = useT();
  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(await resizeImage(file));
  }
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200">
          {value
            ? <img src={value} className="h-full w-full object-cover" alt="" />
            : <div className="flex h-full items-center justify-center text-xs text-stone-400">{t('无照片')}</div>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="btn-ghost cursor-pointer px-3 py-1 text-xs">
            {t('选择照片')}
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
          {value && <button type="button" className="text-left text-xs text-rose-500" onClick={() => onChange('')}>{t('移除')}</button>}
        </div>
      </div>
      <input
        className="input mt-2 text-xs"
        placeholder={t('或粘贴图片链接 https://...')}
        value={value && value.startsWith('http') ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
