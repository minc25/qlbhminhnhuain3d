import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Calendar,
  CheckCircle2,
  XCircle,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api';
import { Promotion, PromotionType } from '../../types';
import { formatDateOnly, formatVND } from '../../lib/utils';

export const PromotionsView: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form fields
  const [promoType, setPromoType] = useState<PromotionType>('PERCENTAGE');

  const loadPromos = async () => {
    try {
      setLoading(true);
      const data = await api.getPromotions();
      setPromotions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleToggleActive = async (promo: Promotion) => {
    try {
      await api.updatePromotion(promo.id, {
        is_active: !promo.is_active
      });
      loadPromos();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const code = (formData.get('code') as string).trim().toUpperCase();
    const start_date = formData.get('start_date') as string;
    const end_date = formData.get('end_date') as string;

    // Build configuration JSON based on type
    let configObj: any = {};
    if (promoType === 'PERCENTAGE') {
      configObj = {
        percentage: Number(formData.get('percentage') || 10),
        min_order_amount: Number(formData.get('min_order_amount') || 0),
        max_discount: Number(formData.get('max_discount') || 0)
      };
    } else if (promoType === 'FIXED_AMOUNT') {
      configObj = {
        fixed_discount_per_unit: Number(formData.get('fixed_discount_per_unit') || 5000),
        apply_all_units: true
      };
    } else if (promoType === 'TIER_QUANTITY') {
      configObj = {
        min_quantity: Number(formData.get('min_quantity') || 5),
        discount_amount: Number(formData.get('discount_amount') || 50000)
      };
    } else if (promoType === 'COMBO') {
      configObj = {
        required_quantity: Number(formData.get('required_quantity') || 5),
        combo_fixed_price: Number(formData.get('combo_fixed_price') || 900000),
        allowed_materials: ['PLA']
      };
    } else if (promoType === 'BUY_X_GET_Y') {
      configObj = {
        buy_qty: Number(formData.get('buy_qty') || 5),
        get_qty: Number(formData.get('get_qty') || 1)
      };
    }

    try {
      if (editingPromo) {
        await api.updatePromotion(editingPromo.id, {
          name,
          code,
          type: promoType,
          config: JSON.stringify(configObj),
          start_date,
          end_date
        });
      } else {
        await api.createPromotion({
          name,
          code,
          type: promoType,
          config: JSON.stringify(configObj),
          start_date,
          end_date,
          is_active: 1,
          is_stackable: 0
        });
      }
      setIsModalOpen(false);
      setEditingPromo(null);
      loadPromos();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu chương trình');
    }
  };

  const getTypeName = (t: PromotionType) => {
    switch (t) {
      case 'PERCENTAGE':
        return 'Giảm theo %';
      case 'FIXED_AMOUNT':
        return 'Giảm số tiền cố định / cuộn';
      case 'TIER_QUANTITY':
        return 'Mua từ X cuộn giảm Y tiền';
      case 'COMBO':
        return 'Combo giá cố định';
      case 'BUY_X_GET_Y':
        return 'Mua X tặng Y';
      default:
        return t;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Quản lý Khuyến mãi & Giảm giá
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            5 cơ chế khuyến mãi tự động tính toán từ Backend: Giảm %, Giảm tiền, Mua đủ số lượng, Combo, Mua X tặng Y
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPromo(null);
            setPromoType('PERCENTAGE');
            setIsModalOpen(true);
          }}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo Chương Trình Mới</span>
        </button>
      </div>

      {/* Grid of Promotions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map((p) => {
          let cfg: any = {};
          try {
            cfg = typeof p.config === 'string' ? JSON.parse(p.config) : p.config;
          } catch {}

          return (
            <div
              key={p.id}
              className={`p-4 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                p.is_active
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    {getTypeName(p.type)}
                  </span>
                  {p.code && (
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">
                      {p.code}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {p.name}
                </h3>

                {/* Configuration details */}
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 space-y-1 text-[11px] mb-3">
                  {p.type === 'PERCENTAGE' && (
                    <>
                      <div>Giảm: <span className="font-bold">{cfg.percentage}%</span></div>
                      {cfg.min_order_amount > 0 && <div>Đơn tối thiểu: {formatVND(cfg.min_order_amount)}</div>}
                      {cfg.max_discount > 0 && <div>Giảm tối đa: {formatVND(cfg.max_discount)}</div>}
                    </>
                  )}
                  {p.type === 'FIXED_AMOUNT' && (
                    <div>Giảm ngay: <span className="font-bold">{formatVND(cfg.fixed_discount_per_unit)}</span> / cuộn</div>
                  )}
                  {p.type === 'TIER_QUANTITY' && (
                    <div>Mua từ <span className="font-bold">{cfg.min_quantity} cuộn</span> ➔ Giảm ngay <span className="font-bold">{formatVND(cfg.discount_amount)}</span></div>
                  )}
                  {p.type === 'COMBO' && (
                    <div>Combo <span className="font-bold">{cfg.required_quantity} cuộn PLA</span> ➔ Đồng giá <span className="font-bold">{formatVND(cfg.combo_fixed_price)}</span></div>
                  )}
                  {p.type === 'BUY_X_GET_Y' && (
                    <div>Mua <span className="font-bold">{cfg.buy_qty}</span> tặng <span className="font-bold">{cfg.get_qty} cuộn miễn phí</span></div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <div className="text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDateOnly(p.start_date)} - {formatDateOnly(p.end_date)}</span>
                </div>

                <button
                  onClick={() => handleToggleActive(p)}
                  className={`font-semibold flex items-center gap-1 ${
                    p.is_active ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {p.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{p.is_active ? 'Đang chạy' : 'Tạm dừng'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Promotion Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingPromo ? 'Cập Nhật Chương Trình' : 'Tạo Chương Trình Khuyến Mãi Mới'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Chương Trình (*)
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="VD: Tri ân khách hàng - Giảm 10% đơn trên 1 triệu"
                  defaultValue={editingPromo?.name || ''}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã Khuyến Mãi (Code)
                  </label>
                  <input
                    name="code"
                    type="text"
                    placeholder="VD: SALE10, COMBO5..."
                    defaultValue={editingPromo?.code || ''}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loại Khuyến Mãi (*)
                  </label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as PromotionType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Giảm theo %</option>
                    <option value="FIXED_AMOUNT">Giảm số tiền cố định</option>
                    <option value="TIER_QUANTITY">Mua đủ số lượng giảm tiền</option>
                    <option value="COMBO">Combo giá cố định</option>
                    <option value="BUY_X_GET_Y">Mua X tặng Y</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Type Fields */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                {promoType === 'PERCENTAGE' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Phần trăm giảm (%)</label>
                      <input name="percentage" type="number" min="1" max="100" defaultValue="10" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Đơn tối thiểu (VND)</label>
                      <input name="min_order_amount" type="number" step="10000" defaultValue="1000000" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Giảm tối đa (VND)</label>
                      <input name="max_discount" type="number" step="10000" defaultValue="200000" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                  </div>
                )}

                {promoType === 'FIXED_AMOUNT' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Số tiền giảm trừ mỗi cuộn (VND)</label>
                    <input name="fixed_discount_per_unit" type="number" step="1000" defaultValue="5000" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                  </div>
                )}

                {promoType === 'TIER_QUANTITY' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Số lượng tối thiểu (Cuộn)</label>
                      <input name="min_quantity" type="number" min="1" defaultValue="5" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Số tiền giảm (VND)</label>
                      <input name="discount_amount" type="number" step="10000" defaultValue="50000" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                  </div>
                )}

                {promoType === 'COMBO' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Số lượng cuộn trong Combo</label>
                      <input name="required_quantity" type="number" min="2" defaultValue="5" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Giá trọn gói Combo (VND)</label>
                      <input name="combo_fixed_price" type="number" step="10000" defaultValue="900000" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                  </div>
                )}

                {promoType === 'BUY_X_GET_Y' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Số lượng Mua (X)</label>
                      <input name="buy_qty" type="number" min="1" defaultValue="5" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Số lượng Tặng Miễn Phí (Y)</label>
                      <input name="get_qty" type="number" min="1" defaultValue="1" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border rounded" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày Bắt Đầu (*)
                  </label>
                  <input
                    name="start_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày Kết Thúc (*)
                  </label>
                  <input
                    name="end_date"
                    type="date"
                    required
                    defaultValue="2026-12-31"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
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
                  Lưu Chương Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
