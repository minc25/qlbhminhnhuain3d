import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Printer,
  Cloud,
  Database,
  Check,
  Copy,
  Server,
  Terminal,
  ShieldCheck,
  Save
} from 'lucide-react';
import { api } from '../../lib/api';
import { AppSetting } from '../../types';

interface SettingsViewProps {
  onUpdateStoreName?: (name: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onUpdateStoreName }) => {
  const [settings, setSettings] = useState<AppSetting | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setSettings(s)).catch(console.error);
  }, []);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const store_name = (formData.get('store_name') as string).trim();
    const store_phone = (formData.get('store_phone') as string).trim();
    const store_address = (formData.get('store_address') as string).trim();
    const store_email = (formData.get('store_email') as string).trim();
    const receipt_header = (formData.get('receipt_header') as string).trim();
    const receipt_footer = (formData.get('receipt_footer') as string).trim();

    try {
      const updated = await api.updateSettings({
        store_name,
        store_phone,
        store_address,
        store_email,
        receipt_header,
        receipt_footer
      });
      setSettings(updated);
      if (onUpdateStoreName) onUpdateStoreName(updated.store_name);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu cài đặt');
    }
  };

  const railwayEnvExample = `# Biến môi trường cho Railway FastAPI Service:
DATABASE_URL=\${{Postgres.DATABASE_URL}}
PORT=8000
SECRET_KEY=bms_super_secret_jwt_key_2026
TZ=Asia/Ho_Chi_Minh
CURRENCY=VND`;

  const railwayDeployCli = `# Triển khai trực tiếp qua Railway CLI:
cd railway_export
railway login
railway init
railway add --database postgres
railway up`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Cài Đặt Hệ Thống & Gói Triển Khai Railway
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Tùy biến thông tin cửa hàng, mẫu hóa đơn POS và cấu hình FastAPI + PostgreSQL cho Railway
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Store Settings Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Store className="w-4 h-4" />
                <span>Thông Tin Cửa Hàng & In Hóa Đơn</span>
              </div>
              {savedSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đã lưu thành công
                </span>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Cửa Hàng
                </label>
                <input
                  name="store_name"
                  type="text"
                  required
                  defaultValue={settings?.store_name || '3D Tech & Filament Store'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hotline / Số Điện Thoại
                  </label>
                  <input
                    name="store_phone"
                    type="text"
                    required
                    defaultValue={settings?.store_phone || '0908 123 456'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Liên Hệ
                  </label>
                  <input
                    name="store_email"
                    type="email"
                    defaultValue={settings?.store_email || 'contact@3dtechstore.vn'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Địa Chỉ Cửa Hàng / Kho Hàng
                </label>
                <input
                  name="store_address"
                  type="text"
                  required
                  defaultValue={settings?.store_address || 'Số 120 Đường Hoàng Văn Thụ, Phường 9, Quận Phú Nhuận, TP.HCM'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="block font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Tiêu Đề & Chân Trang Hóa Đơn Bán Lẻ
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Lời Chào Tiêu Đề Hóa Đơn (Header)
                    </label>
                    <input
                      name="receipt_header"
                      type="text"
                      defaultValue={settings?.receipt_header || 'CHUYÊN CUNG CẤP VẬT LIỆU IN 3D & LINH KIỆN CAO CẤP'}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Lời Cảm Ơn Chân Trang (Footer)
                    </label>
                    <input
                      name="receipt_footer"
                      type="text"
                      defaultValue={settings?.receipt_footer || 'Cảm ơn Quý khách! Đổi trả trong 7 ngày nếu lỗi nhà sản xuất.'}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu Cài Đặt Cửa Hàng
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 5 Cols: Production Railway Export Information */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <Cloud className="w-4 h-4 text-sky-500" />
              <span>Gói Triển Khai Railway (FastAPI + PostgreSQL)</span>
            </div>

            <p className="text-slate-500 leading-relaxed">
              Mã nguồn độc lập đã được tạo sẵn trong thư mục <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-sky-600">/railway_export</code> với đầy đủ Dockerfile, railway.toml, SQLAlchemy 2 và Pydantic schemas.
            </p>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Biến môi trường Railway:</span>
                <button
                  onClick={() => handleCopy(railwayEnvExample, 'env')}
                  className="text-sky-600 hover:underline flex items-center gap-1"
                >
                  {copiedSection === 'env' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'env' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre">
                {railwayEnvExample}
              </pre>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Lệnh CLI Deploy nhanh:</span>
                <button
                  onClick={() => handleCopy(railwayDeployCli, 'cli')}
                  className="text-sky-600 hover:underline flex items-center gap-1"
                >
                  {copiedSection === 'cli' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'cli' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre">
                {railwayDeployCli}
              </pre>
            </div>

            <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Tính toàn vẹn nghiệp vụ:
              </div>
              <p>
                Cả hai backend (Express SQLite nội bộ và FastAPI PostgreSQL) đều chia sẻ cùng quy tắc lưu trữ tiền tệ BIGINT VND, snapshot giá bán/vốn và kiểm tra giao dịch tương tranh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
