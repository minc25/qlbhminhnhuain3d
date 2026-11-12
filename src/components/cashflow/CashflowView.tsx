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
  Banknote,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2
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

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<CashTransaction | null>(null);
  const [direction, setDirection] = useState<CashDirection>('OUT');
  const [category, setCategory] = useState<CashCategory>('RENT');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal
  const [txToDelete, setTxToDelete] = useState<CashTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const openCreateModal = () => {
    setEditingTx(null);
    setDirection('OUT');
    setCategory('RENT');
    setAmount(0);
    setPaymentMethod('TIEN_MAT');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditTx = (tx: CashTransaction) => {
    setEditingTx(tx);
    setDirection(tx.direction);
    setCategory(tx.category);
    setAmount(tx.amount);
    setPaymentMethod(tx.payment_method);
    setNotes(tx.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!amount || amount <= 0) {
      setFormError('Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }

    try {
      if (editingTx) {
        await api.updateCashTransaction(editingTx.id, {
          direction,
          category,
          amount,
          payment_method: paymentMethod as any,
          notes
        });
      } else {
        await api.createCashTransaction({
          direction,
          category,
          amount,
          payment_method: paymentMethod as any,
          notes
        });
      }
      setIsModalOpen(false);
      setEditingTx(null);
      setAmount(0);
      setNotes('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu phiếu thu chi');
    }
  };

  const handleDeleteTx = async () => {
    if (!txToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteCashTransaction(txToDelete.id);
      setTxToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa phiếu');
    } finally {
      setIsDeleting(false);
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
          onClick={openCreateModal}
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
                <th className="py-3 px-4 font-semibold text-center">Thao Tác</th>
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
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditTx(tx)}
                        title="Chỉnh sửa phiếu"
                        className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTxToDelete(tx)}
                        title="Xóa phiếu"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
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
                {editingTx ? `Chỉnh Sửa Phiếu ${editingTx.code}` : 'Lập Phiếu Thu / Chi Quỹ'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveVoucher} className="space-y-3">
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
                  {editingTx ? 'Lưu Cập Nhật' : 'Ghi Sổ Quỹ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Xóa phiếu thu / chi
                </h3>
                <p className="text-slate-500 mt-1">
                  Bạn có chắc muốn xóa phiếu <strong className="font-mono text-slate-900 dark:text-slate-100">{txToDelete.code}</strong> ({formatVND(txToDelete.amount)})?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div>Danh mục: <strong>{getCategoryLabel(txToDelete.category)}</strong></div>
              <div>Ghi chú: {txToDelete.notes || 'Không có'}</div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteTx}
                disabled={isDeleting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
