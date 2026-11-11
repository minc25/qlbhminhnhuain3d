import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  FileText,
  Eye,
  Edit2,
  X,
  CreditCard
} from 'lucide-react';
import { api } from '../../lib/api';
import { Customer } from '../../types';
import { formatVND, formatDateTime } from '../../lib/utils';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers(searchQuery);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const phone = (formData.get('phone') as string).trim();
    const address = (formData.get('address') as string).trim();
    const notes = (formData.get('notes') as string).trim();

    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, { name, phone, address, notes });
      } else {
        await api.createCustomer({ name, phone, address, notes });
      }
      setIsCustomerModalOpen(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu khách hàng');
    }
  };

  const handleViewCustomer = async (id: string) => {
    try {
      const full = await api.getCustomerById(id);
      setSelectedCustomer(full);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Quản lý Khách hàng & Công nợ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lịch sử mua hàng tự động đồng bộ khi nhập số điện thoại tại màn hình POS
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setIsCustomerModalOpen(true);
          }}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Khách Hàng</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo Tên, Số điện thoại hoặc Địa chỉ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold">Tên Khách Hàng</th>
                <th className="py-3 px-4 font-semibold">Số Điện Thoại</th>
                <th className="py-3 px-4 font-semibold">Địa Chỉ</th>
                <th className="py-3 px-4 font-semibold text-center">Số Đơn</th>
                <th className="py-3 px-4 font-semibold text-right">Tổng Chi Tiêu</th>
                <th className="py-3 px-4 font-semibold text-right">Công Nợ Hiện Tại</th>
                <th className="py-3 px-4 font-semibold text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {c.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {c.phone}
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                    {c.address || '-'}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                    {c.total_orders}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatVND(c.total_spent)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {c.current_debt > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {formatVND(c.current_debt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">0 ₫</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleViewCustomer(c.id)}
                        title="Xem lịch sử mua hàng"
                        className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCustomer(c);
                          setIsCustomerModalOpen(true);
                        }}
                        title="Sửa thông tin"
                        className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy khách hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer with Purchase History */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col space-y-4 overflow-y-auto border-l border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedCustomer.name}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  SĐT: {selectedCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 block mb-0.5">Tổng tiền mua:</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatVND(selectedCustomer.total_spent)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Công nợ hiện tại:</span>
                <span className="text-base font-bold text-rose-600 tabular-nums">
                  {formatVND(selectedCustomer.current_debt)}
                </span>
              </div>
            </div>

            {selectedCustomer.address && (
              <div>
                <span className="text-slate-500 font-medium">Địa chỉ:</span>{' '}
                <span className="text-slate-800 dark:text-slate-200">{selectedCustomer.address}</span>
              </div>
            )}
            {selectedCustomer.notes && (
              <div>
                <span className="text-slate-500 font-medium">Ghi chú:</span>{' '}
                <span className="text-slate-800 dark:text-slate-200">{selectedCustomer.notes}</span>
              </div>
            )}

            {/* Orders History */}
            <div className="space-y-2 pt-2">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Lịch Sử Mua Hàng ({selectedCustomer.orders?.length || 0} đơn gần nhất)
              </div>
              <div className="space-y-2">
                {selectedCustomer.orders?.map((o) => (
                  <div
                    key={o.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{o.order_code}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{formatDateTime(o.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatVND(o.total_amount)}
                      </div>
                      <div className="text-[11px] font-medium text-emerald-600">
                        Đã trả: {formatVND(o.paid_amount)}
                      </div>
                    </div>
                  </div>
                ))}

                {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                  <div className="text-center py-6 text-slate-400">Chưa có đơn hàng nào</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingCustomer ? 'Sửa Thông Tin Khách Hàng' : 'Tạo Mới Khách Hàng'}
              </h2>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Khách Hàng (*)
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="VD: Anh Minh Tuấn (MakerLab)"
                  defaultValue={editingCustomer?.name || ''}
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
                  placeholder="VD: 0903123456"
                  defaultValue={editingCustomer?.phone || ''}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Địa Chỉ
                </label>
                <input
                  name="address"
                  type="text"
                  placeholder="Số nhà, đường, quận/huyện..."
                  defaultValue={editingCustomer?.address || ''}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi Chú
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Yêu cầu riêng, thói quen mua hàng..."
                  defaultValue={editingCustomer?.notes || ''}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-lg"
                >
                  {editingCustomer ? 'Cập Nhật' : 'Lưu Khách Hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
