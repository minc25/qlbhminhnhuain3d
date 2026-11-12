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
  Save,
  Download,
  ExternalLink,
  Github
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

  const githubPushCommands = `# 1. Tạo repo mới trên GitHub (https://github.com/new)
# 2. Đẩy toàn bộ mã nguồn lên GitHub:
git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
git branch -M main
git push -u origin main`;

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

        {/* Right 5 Cols: Production Railway Deployment Cards */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Phương Án 1 - Fullstack Node.js + React (Khuyến nghị) */}
          <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 shadow-xs space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Phương Án 1: Full-Stack Trọn Gói (Khuyến nghị)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                1-Click Railway
              </span>
            </div>

            <p className="text-slate-500 leading-relaxed">
              Toàn bộ hệ thống React POS, Quản lý kho, Đơn hàng, Sổ quỹ, Báo cáo và Backend Express chạy chung trên 1 Service duy nhất. Đã có sẵn <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-indigo-600">Dockerfile</code> và <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-indigo-600">railway.toml</code>.
            </p>

            {/* Direct Download ZIP button */}
            <div className="pt-1">
              <a
                href="/uploads/bms_railway_project.zip"
                download="bms_railway_project.zip"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-xs"
              >
                <Download className="w-4 h-4" /> Tải Mã Nguồn Trọn Gói Đã Đóng Gói (.ZIP)
              </a>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Đẩy lên GitHub để Railway tự động deploy:</span>
                </span>
                <button
                  onClick={() => handleCopy(githubPushCommands, 'github')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  {copiedSection === 'github' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'github' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre">
                {githubPushCommands}
              </pre>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Database className="w-3.5 h-3.5" /> Gắn Railway Volume lưu trữ vĩnh viễn:
              </div>
              <p>
                Sau khi tạo Service trên Railway, vào tab <strong>Volumes</strong> -&gt; chọn <strong>Add Volume</strong>:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Volume 1: Mount Path <code className="font-mono font-bold">/app/data</code> (Lưu trữ cơ sở dữ liệu)</li>
                <li>Volume 2: Mount Path <code className="font-mono font-bold">/app/uploads</code> (Lưu trữ ảnh sản phẩm)</li>
              </ul>
            </div>
          </div>

          {/* Card 2: Phương Án 2 - Backend Python FastAPI + PostgreSQL */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <Cloud className="w-4 h-4 text-sky-500" />
              <span>Phương Án 2: Python FastAPI + PostgreSQL (/railway_export)</span>
            </div>

            <p className="text-slate-500 leading-relaxed">
              Mã nguồn độc lập đã được tạo sẵn trong thư mục <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-sky-600">/railway_export</code> với đầy đủ SQLAlchemy 2, Pydantic v2 schemas và PostgreSQL migration.
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
          </div>
        </div>
      </div>
    </div>
  );
};
