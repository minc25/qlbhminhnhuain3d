import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  XCircle,
  RotateCcw,
  CreditCard,
  Printer,
  X,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../../lib/api';
import { SalesOrder, OrderStatus } from '../../types';
import { formatVND, formatDateTime } from '../../lib/utils';

export const OrdersView: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Khách yêu cầu hủy đơn');

  // Debt payment modal state
  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('TIEN_MAT');

  // Return goods modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<{ productId: string; name: string; sku: string; quantity: number; maxQty: number; unitPrice: number }[]>([]);
  const [returnReason, setReturnReason] = useState('Sản phẩm lỗi kỹ thuật');

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery
      });
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // View order detail
  const handleViewDetail = async (orderId: string) => {
    try {
      const fullOrder = await api.getOrderById(orderId);
      setSelectedOrder(fullOrder);
    } catch (err) {
      showToast('error', 'Không thể xem chi tiết đơn hàng');
    }
  };

  // Open Cancel Modal
  const openCancelModal = (order: SalesOrder) => {
    setSelectedOrder(order);
    setCancelReason('Khách yêu cầu hủy đơn');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.cancelOrder(selectedOrder.id, cancelReason);
      showToast('success', `Đã hủy đơn ${selectedOrder.order_code} và hoàn kho thành công`);
      setIsCancelModalOpen(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi hủy đơn');
    }
  };

  // Open Pay Debt Modal
  const openPayDebtModal = (order: SalesOrder) => {
    setSelectedOrder(order);
    setPayAmount(order.debt_amount);
    setIsPayDebtModalOpen(true);
  };

  const handlePayDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.recordOrderPayment(selectedOrder.id, payAmount, payMethod, `Khách thanh toán công nợ đơn`);
      showToast('success', `Đã ghi nhận thu nợ ${formatVND(payAmount)} cho đơn ${selectedOrder.order_code}`);
      setIsPayDebtModalOpen(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi ghi nhận thu nợ');
    }
  };

  // Open Return Goods Modal
  const openReturnModal = (order: SalesOrder) => {
    setSelectedOrder(order);
    if (order.items) {
      setReturnItems(
        order.items.map((it) => ({
          productId: it.product_id,
          name: it.name_snapshot,
          sku: it.sku_snapshot,
          quantity: it.quantity,
          maxQty: it.quantity,
          unitPrice: it.unit_price_snapshot
        }))
      );
    }
    setIsReturnModalOpen(true);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const itemsToReturn = returnItems.filter((it) => it.quantity > 0);
    if (itemsToReturn.length === 0) {
      showToast('error', 'Chọn ít nhất 1 sản phẩm để hoàn');
      return;
    }

    const refundAmount = itemsToReturn.reduce((a, b) => a + b.unitPrice * b.quantity, 0);

    try {
      const res = await api.returnOrder(selectedOrder.id, itemsToReturn, returnReason, refundAmount);
      showToast('success', `Đã lập phiếu hoàn ${res.returnCode} và nhập lại kho thành công`);
      setIsReturnModalOpen(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi hoàn hàng');
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="font-semibold text-emerald-600 dark:text-emerald-400">Hoàn thành</span>;
      case 'PROCESSING':
        return <span className="font-semibold text-sky-600 dark:text-sky-400">Đang xử lý</span>;
      case 'SHIPPING':
        return <span className="font-semibold text-amber-600 dark:text-amber-400">Đang giao</span>;
      case 'CANCELLED':
        return <span className="font-semibold text-slate-400 line-through">Đã hủy</span>;
      case 'RETURNED':
        return <span className="font-semibold text-purple-600 dark:text-purple-400">Đã hoàn hàng</span>;
      default:
        return <span className="font-semibold text-slate-500">{status}</span>;
    }
  };

  const statuses = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'COMPLETED', label: 'Hoàn thành' },
    { id: 'PROCESSING', label: 'Đang xử lý' },
    { id: 'SHIPPING', label: 'Đang giao' },
    { id: 'CANCELLED', label: 'Đã hủy' },
    { id: 'RETURNED', label: 'Hoàn hàng' }
  ];

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-md ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Quản lý Đơn hàng Bán lẻ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lưu vết snapshot giá vốn & giá bán tại thời điểm lập đơn · Không xóa đơn đã phát sinh giao dịch
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo Mã đơn, tên khách, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {statuses.map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  statusFilter === st.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold">Mã Đơn</th>
                <th className="py-3 px-4 font-semibold">Khách Hàng</th>
                <th className="py-3 px-4 font-semibold">Thời Gian</th>
                <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                <th className="py-3 px-4 font-semibold text-right">Tổng Tiền</th>
                <th className="py-3 px-4 font-semibold text-right">Đã Thu</th>
                <th className="py-3 px-4 font-semibold text-right">Còn Nợ</th>
                <th className="py-3 px-4 font-semibold text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {o.order_code}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{o.customer_name}</div>
                    <div className="text-[11px] text-slate-500">{o.customer_phone}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formatDateTime(o.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(o.status)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatVND(o.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatVND(o.paid_amount)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {o.debt_amount > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {formatVND(o.debt_amount)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Đủ</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleViewDetail(o.id)}
                        title="Xem chi tiết đơn"
                        className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {o.debt_amount > 0 && o.status !== 'CANCELLED' && (
                        <button
                          onClick={() => openPayDebtModal(o)}
                          title="Thu nợ đơn hàng"
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {o.status === 'COMPLETED' && (
                        <button
                          onClick={() => openReturnModal(o)}
                          title="Lập phiếu hoàn hàng"
                          className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {o.status !== 'CANCELLED' && o.status !== 'RETURNED' && (
                        <button
                          onClick={() => openCancelModal(o)}
                          title="Hủy đơn và hoàn kho"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy đơn hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && !isCancelModalOpen && !isPayDebtModalOpen && !isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col space-y-4 overflow-y-auto border-l border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Chi Tiết Đơn Hàng {selectedOrder.order_code}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Ngày tạo: {formatDateTime(selectedOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div><span className="text-slate-500">Khách hàng:</span> <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedOrder.customer_name}</span></div>
              <div><span className="text-slate-500">Số điện thoại:</span> {selectedOrder.customer_phone}</div>
              {selectedOrder.shipping_address && (
                <div><span className="text-slate-500">Địa chỉ giao:</span> {selectedOrder.shipping_address}</div>
              )}
              <div><span className="text-slate-500">Phương thức:</span> {selectedOrder.payment_method}</div>
              {selectedOrder.notes && <div><span className="text-slate-500">Ghi chú:</span> {selectedOrder.notes}</div>}
            </div>

            {/* Line Items Snapshot */}
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 mb-2">
                Danh Sách Sản Phẩm (Snapshot Giá Bán & Giá Vốn)
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Sản phẩm</th>
                      <th className="py-2 px-3 font-semibold text-right">SL</th>
                      <th className="py-2 px-3 font-semibold text-right">Giá vốn</th>
                      <th className="py-2 px-3 font-semibold text-right">Giá bán</th>
                      <th className="py-2 px-3 font-semibold text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedOrder.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{it.name_snapshot}</div>
                          <div className="font-mono text-[10px] text-slate-400">{it.sku_snapshot}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums">
                          {it.quantity}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500 tabular-nums">
                          {formatVND(it.unit_cost_snapshot)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium tabular-nums">
                          {formatVND(it.unit_price_snapshot)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatVND(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
              <div className="flex justify-between">
                <span>Tiền hàng:</span>
                <span className="tabular-nums">{formatVND(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Giảm giá khuyến mãi:</span>
                  <span className="tabular-nums">-{formatVND(selectedOrder.discount_amount)}</span>
                </div>
              )}
              {selectedOrder.shipping_fee > 0 && (
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="tabular-nums">+{formatVND(selectedOrder.shipping_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>TỔNG TIỀN:</span>
                <span className="tabular-nums">{formatVND(selectedOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Đã thanh toán:</span>
                <span className="tabular-nums">{formatVND(selectedOrder.paid_amount)}</span>
              </div>
              {selectedOrder.debt_amount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Công nợ còn lại:</span>
                  <span className="tabular-nums">{formatVND(selectedOrder.debt_amount)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" /> In Hóa Đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Debt Modal */}
      {isPayDebtModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Thu Nợ Đơn Hàng {selectedOrder.order_code}
              </h2>
              <button onClick={() => setIsPayDebtModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayDebtSubmit} className="space-y-3">
              <div>
                <span className="text-slate-500 block mb-0.5">Khách hàng:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedOrder.customer_name}</span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Công nợ hiện tại:</span>
                <span className="text-base font-bold text-rose-600 tabular-nums">
                  {formatVND(selectedOrder.debt_amount)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số tiền thu thêm (*):
                </label>
                <input
                  type="number"
                  min="1000"
                  max={selectedOrder.debt_amount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phương thức thu:
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="TIEN_MAT">Tiền mặt</option>
                  <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                  <option value="VI_DIEN_TU">Ví điện tử</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayDebtModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                >
                  Xác Nhận Thu Nợ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {isCancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Xác Nhận Hủy Đơn Hàng
              </h2>
              <button onClick={() => setIsCancelModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-300">
              Hệ thống sẽ <strong>tự động hoàn toàn bộ sản phẩm về lại kho hàng</strong> và ghi nhận lịch sử biến động kho.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do hủy đơn (*):
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
                >
                  Xác Nhận Hủy & Hoàn Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Goods Modal (Phiếu hoàn) */}
      {isReturnModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Lập Phiếu Hoàn Hàng - Đơn {selectedOrder.order_code}
              </h2>
              <button onClick={() => setIsReturnModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-3">
              <div className="space-y-2">
                <label className="font-semibold block text-slate-700 dark:text-slate-300">
                  Chọn số lượng hoàn từng sản phẩm:
                </label>
                {returnItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.sku}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Hoàn:</span>
                      <input
                        type="number"
                        min="0"
                        max={item.maxQty}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Math.min(item.maxQty, Math.max(0, Number(e.target.value)));
                          setReturnItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                          );
                        }}
                        className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold tabular-nums"
                      />
                      <span className="text-slate-500">/ {item.maxQty}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do hoàn hàng:
                </label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
                >
                  Xác Nhận Lập Phiếu Hoàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
