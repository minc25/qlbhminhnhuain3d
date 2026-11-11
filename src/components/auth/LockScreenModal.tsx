import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

interface LockScreenModalProps {
  isOpen: boolean;
  onUnlock: () => void;
  adminName?: string;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({ isOpen, onUnlock, adminName = 'Chủ Cửa Hàng (Admin)' }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123' || password === 'admin' || password === '') {
      setError('');
      setPassword('');
      onUnlock();
    } else {
      setError('Mật khẩu không chính xác. Mặc định là admin123 hoặc nhấn mở khóa.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-700 dark:text-slate-300">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Hệ Thống Đang Khóa
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Tài khoản: <span className="font-semibold text-slate-700 dark:text-slate-300">{adminName}</span>
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mật khẩu Admin
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Nhập mật khẩu (mặc định: admin123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 text-slate-900 dark:text-slate-100"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Gợi ý nhanh: mật khẩu là admin123 hoặc để trống</p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Mở khóa hệ thống
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
