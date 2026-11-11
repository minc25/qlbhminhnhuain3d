import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Filter,
  Calendar,
  X,
  CreditCard,
  Banknote
} from 'lucide-react';
import { api } from '../../lib/api';
import { CashTransaction, CashDirection, CashCategory } from '../../types';
import { formatVND, formatDateTime } from '../../lib/utils';

export const CashflowView: React.FC = () => {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [direction, setDirection] = useState<CashDirection>('OUT');
  const [category, setCategory] = useState<CashCategory>('RENT');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getCashTransactions({
        direction: directionFilter === 'ALL' ? undefined : directionFilter,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter
      });
      setTransactions(res.transactions);
      setSummary(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [directionFilter, categoryFilter]);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }

    try {
      await api.createCashTransaction({
        direction,
        category,
        amount,
        payment_method: paymentMethod as any,
        notes
      });
      setIsModalOpen(false);
      setAmount(0);
      setNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo phiếu thu chi');
    }
  };

  const getCategoryLabel = (cat: CashCategory) => {
    switch (cat) {
      case 'SALES_PAYMENT':
        return 'Thu tiền bán hàng';
      case 'CUSTOMER_DEBT':
        return 'Thu công nợ khách';
      case 'PURCHASE_PAYMENT':
        return 'Chi tiền nhập hàng';
      case 'SALARY':
        return 'Chi lương nhân viên';
      case 'RENT':
        return 'Chi thuê mặt bằng kho';
      case 'UTILITIES':
        return 'Chi điện, nước, internet';
      case 'MARKETING':
        return 'Chi quảng cáo & marketing';
      case 'OTHER':
        return 'Khác / Chi phí vận hành';
      default:
        return cat;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sổ Quỹ Tiền Mặt & Dòng Tiền (Thu - Chi)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý dòng tiền vào ra thực tế · Không ghi nhận trùng lặp doanh thu đơn hàng vào thu khác
          </p>
        </div>

        <button
          onClick={() => {
            setDirection('OUT');
            setCategory('RENT');
            setIsModalOpen(true);
          }}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Lập Phiếu Thu / Chi</span>
        </button>
      </div>

      {/* KPI Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
              Tổng Thu (Dòng tiền vào)
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatVND(summary.totalIn)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
              Tổng Chi (Dòng tiền ra)
            </div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              -{formatVND(summary.totalOut)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
              Số Dư Quỹ Hiện Tại
            </div>
            <div
              className={`text-xl font-bold tabular-nums ${
                summary.balance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600'
              }`}
            >
              {formatVND(summary.balance)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Lọc chiều:</span>
          {['ALL', 'IN', 'OUT'].map((d) => (
            <button
              key={d}
              onClick={() => setDirectionFilter(d)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                directionFilter === d
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {d === 'ALL' ? 'Tất cả' : d === 'IN' ? 'Thu (+)' : 'Chi (-)'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold">Mã Phiếu</th>
                <th className="py-3 px-4 font-semibold">Thời Gian</th>
                <th className="py-3 px-4 font-semibold">Loại</th>
                <th className="py-3 px-4 font-semibold">Danh Mục</th>
                <th className="py-3 px-4 font-semibold">Ghi Chú</th>
                <th className="py-3 px-4 font-semibold text-right">Số Tiền (VND)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {tx.code}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formatDateTime(tx.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        tx.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.direction === 'IN' ? 'Phiếu Thu' : 'Phiếu Chi'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                    {getCategoryLabel(tx.category)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-[260px] truncate">
                    {tx.notes || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold tabular-nums">
                    <span
                      className={
                        tx.direction === 'IN'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {tx.direction === 'IN' ? '+' : '-'}
                      {formatVND(tx.amount)}
                    </span>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Chưa có giao dịch thu chi nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cash Voucher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Lập Phiếu Thu / Chi Quỹ
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Loại Giao Dịch
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDirection('IN');
                      setCategory('OTHER');
                    }}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      direction === 'IN'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Phiếu Thu (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirection('OUT');
                      setCategory('RENT');
                    }}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      direction === 'OUT'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    Phiếu Chi (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Danh Mục Thu / Chi (*)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CashCategory)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {direction === 'IN' ? (
                    <>
                      <option value="CUSTOMER_DEBT">Thu công nợ khách hàng</option>
                      <option value="OTHER">Thu nhập khác / Hoàn tiền</option>
                    </>
                  ) : (
                    <>
                      <option value="RENT">Chi tiền thuê mặt bằng kho</option>
                      <option value="SALARY">Chi lương nhân viên / thợ in</option>
                      <option value="UTILITIES">Chi tiền điện, nước, internet</option>
                      <option value="MARKETING">Chi quảng cáo / tiếp thị</option>
                      <option value="OTHER">Chi phí vận hành khác</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số Tiền (VND, số nguyên *)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="5000"
                  required
                  placeholder="VD: 500000"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold tabular-nums focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phương Thức Thanh Toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="TIEN_MAT">Tiền mặt tại quỹ</option>
                  <option value="CHUYEN_KHOAN">Chuyển khoản ngân hàng</option>
                  <option value="VI_DIEN_TU">Ví điện tử</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nội Dung / Diễn Giải
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ chi tiết chứng từ..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
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
                  Ghi Sổ Quỹ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
