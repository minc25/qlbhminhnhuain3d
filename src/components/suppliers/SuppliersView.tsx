import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, MapPin, FileText, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Supplier } from '../../types';
import { formatVND } from '../../lib/utils';

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const phone = (formData.get('phone') as string).trim();
    const address = (formData.get('address') as string).trim();
    const tax_id = (formData.get('tax_id') as string).trim();

    try {
      await api.createSupplier({ name, phone, address, tax_id });
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu nhà cung cấp');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Quản lý Nhà Cung Cấp & Công Nợ NCC
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Danh bạ đối tác cung ứng vật liệu in 3D, thông tin liên hệ và theo dõi công nợ nhập hàng
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Nhà Cung Cấp</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold">Tên Nhà Cung Cấp</th>
                <th className="py-3 px-4 font-semibold">Số Điện Thoại</th>
                <th className="py-3 px-4 font-semibold">Địa Chỉ</th>
                <th className="py-3 px-4 font-semibold">Mã Số Thuế</th>
                <th className="py-3 px-4 font-semibold text-right">Tổng Mua Hàng</th>
                <th className="py-3 px-4 font-semibold text-right">Công Nợ Hiện Tại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {s.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {s.phone}
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-[220px] truncate">
                    {s.address || '-'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {s.tax_id || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatVND(s.total_purchases)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {s.current_debt > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {formatVND(s.current_debt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">0 ₫</span>
                    )}
                  </td>
                </tr>
              ))}

              {suppliers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Chưa có thông tin nhà cung cấp nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Thêm Mới Nhà Cung Cấp
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Nhà Cung Cấp (*)
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="VD: Cty TNHH Nhập Khẩu Veelaine VN"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số Điện Thoại (*)
                </label>
                <input
                  name="phone"
                  type="text"
                  required
                  placeholder="VD: 0912345678"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Địa Chỉ
                </label>
                <input
                  name="address"
                  type="text"
                  placeholder="Khu công nghiệp, xưởng phân phối..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã Số Thuế (MST)
                </label>
                <input
                  name="tax_id"
                  type="text"
                  placeholder="VD: 0314567890"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-lg"
                >
                  Lưu Nhà Cung Cấp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
