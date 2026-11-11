import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Package
} from 'lucide-react';
import { api } from '../../lib/api';
import { PurchaseReceipt, Supplier, Product } from '../../types';
import { formatVND, formatDateTime } from '../../lib/utils';

export const PurchasesView: React.FC = () => {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [receiptItems, setReceiptItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([]);

  // View detail
  const [viewingReceipt, setViewingReceipt] = useState<PurchaseReceipt | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rData, sData, pData] = await Promise.all([
        api.getPurchases(),
        api.getSuppliers(),
        api.getProducts()
      ]);
      setReceipts(rData);
      setSuppliers(sData);
      setProducts(pData);
      if (sData.length > 0) setSelectedSupplierId(sData[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addReceiptItem = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    setReceiptItems((prev) => [
      ...prev,
      { productId: defaultProduct.id, quantity: 10, unitCost: defaultProduct.cost_price || 150000 }
    ]);
  };

  const removeReceiptItem = (index: number) => {
    setReceiptItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateReceiptItem = (index: number, field: string, val: any) => {
    setReceiptItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        if (field === 'productId') {
          const prod = products.find((p) => p.id === val);
          return { ...it, productId: val, unitCost: prod?.cost_price || it.unitCost };
        }
        return { ...it, [field]: Number(val) };
      })
    );
  };

  // Calculations
  const rawSubtotal = receiptItems.reduce((acc, it) => acc + it.quantity * it.unitCost, 0);
  const totalReceipt = rawSubtotal + Number(shippingCost || 0) + Number(otherCost || 0);

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receiptItems.length === 0) {
      alert('Vui lòng thêm ít nhất 1 sản phẩm nhập kho');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    try {
      await api.createPurchase({
        supplier_id: supplier?.id,
        supplier_name: supplier?.name || 'Nhà cung cấp vãng lai',
        items: receiptItems.map((it) => ({
          product_id: it.productId,
          quantity: it.quantity,
          unit_cost: it.unitCost
        })),
        shipping_cost: shippingCost,
        other_cost: otherCost,
        paid_amount: paidAmount > 0 ? paidAmount : totalReceipt,
        notes
      });

      alert('Đã tạo phiếu nhập kho thành công! Giá vốn sản phẩm đã được tính lại theo phương pháp bình quân gia quyền.');
      setIsModalOpen(false);
      setReceiptItems([]);
      setShippingCost(0);
      setOtherCost(0);
      setPaidAmount(0);
      setNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nhập kho');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Nhập Hàng & Quản Lý Giá Vốn
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tự động cập nhật giá vốn theo phương pháp Bình Quân Gia Quyền (Weighted Average Costing)
          </p>
        </div>

        <button
          onClick={() => {
            setReceiptItems([]);
            if (products.length > 0) {
              setReceiptItems([{ productId: products[0].id, quantity: 20, unitCost: products[0].cost_price }]);
            }
            setIsModalOpen(true);
          }}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo Phiếu Nhập Kho</span>
        </button>
      </div>

      {/* Receipts Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4 font-semibold">Mã Phiếu Nhập</th>
                <th className="py-3 px-4 font-semibold">Nhà Cung Cấp</th>
                <th className="py-3 px-4 font-semibold">Ngày Nhập</th>
                <th className="py-3 px-4 font-semibold text-right">Tổng Tiền Hàng</th>
                <th className="py-3 px-4 font-semibold text-right">Đã Trả NCC</th>
                <th className="py-3 px-4 font-semibold text-right">Còn Nợ NCC</th>
                <th className="py-3 px-4 font-semibold text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {r.receipt_code}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {r.supplier_name}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatVND(r.total_cost)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatVND(r.paid_amount)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {r.debt_amount > 0 ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {formatVND(r.debt_amount)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Đã đủ</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setViewingReceipt(r)}
                      title="Xem chi tiết phiếu nhập"
                      className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {receipts.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Chưa có phiếu nhập hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Receipt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Lập Phiếu Nhập Kho & Tính Lại Giá Vốn
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nhà Cung Cấp (*)
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (SĐT: {s.phone}) · Nợ cũ: {formatVND(s.current_debt)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Danh Sách Sản Phẩm Nhập Kho ({receiptItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={addReceiptItem}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Thêm Dòng
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {receiptItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) => updateReceiptItem(idx, 'productId', e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded text-[11px]"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3 flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateReceiptItem(idx, 'quantity', e.target.value)}
                          placeholder="SL"
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded text-right font-bold tabular-nums"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={item.unitCost}
                          onChange={(e) => updateReceiptItem(idx, 'unitCost', e.target.value)}
                          placeholder="Đơn giá nhập"
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded text-right tabular-nums font-semibold"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeReceiptItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Phí vận chuyển:</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Chi phí khác:</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={otherCost}
                    onChange={(e) => setOtherCost(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Tiền trả trước NCC:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Mặc định trả đủ"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded tabular-nums font-semibold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Tiền hàng nhập:</span>
                  <span className="tabular-nums font-semibold">{formatVND(rawSubtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>TỔNG GIÁ TRỊ PHIẾU NHẬP:</span>
                  <span className="tabular-nums">{formatVND(totalReceipt)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-lg"
                >
                  Xác Nhận Nhập Kho & Tính Lại Giá Vốn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Receipt Detail Drawer */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col space-y-4 overflow-y-auto border-l border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Phiếu Nhập {viewingReceipt.receipt_code}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  NCC: {viewingReceipt.supplier_name}
                </p>
              </div>
              <button onClick={() => setViewingReceipt(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Sản phẩm nhập kho:
              </span>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Sản phẩm</th>
                      <th className="py-2 px-3 text-right">SL</th>
                      <th className="py-2 px-3 text-right">Đơn giá</th>
                      <th className="py-2 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {viewingReceipt.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{it.name_snapshot}</div>
                          <div className="font-mono text-[10px] text-slate-400">{it.sku_snapshot}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums">{it.quantity}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{formatVND(it.unit_cost)}</td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums">{formatVND(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span>Tổng chi phí:</span>
                <span className="font-bold tabular-nums">{formatVND(viewingReceipt.total_cost)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Đã thanh toán:</span>
                <span className="tabular-nums font-semibold">{formatVND(viewingReceipt.paid_amount)}</span>
              </div>
              {viewingReceipt.debt_amount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Còn nợ NCC:</span>
                  <span className="tabular-nums">{formatVND(viewingReceipt.debt_amount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
