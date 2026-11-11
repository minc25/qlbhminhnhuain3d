import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Printer,
  Sparkles,
  AlertCircle,
  X,
  Package
} from 'lucide-react';
import { api } from '../../lib/api';
import { Product, Customer, PaymentMethod, SalesOrder } from '../../types';
import { formatVND } from '../../lib/utils';


export interface CartItem {
  product: Product;
  quantity: number;
}

export const PosView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer state
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);

  // Financial inputs
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TIEN_MAT');
  const [paidAmount, setPaidAmount] = useState<string>(''); // If custom partial payment
  const [orderNotes, setOrderNotes] = useState('');

  // Promotion state
  const [appliedPromo, setAppliedPromo] = useState<{ discountAmount: number; promotionName?: string; note: string } | null>(null);

  // Modal state
  const [completedOrder, setCompletedOrder] = useState<SalesOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load products
  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products for POS:', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Customer phone auto-lookup
  useEffect(() => {
    const trimmed = customerPhone.trim();
    if (trimmed.length >= 9) {
      api
        .getCustomerByPhone(trimmed)
        .then((cust) => {
          setExistingCustomer(cust);
          if (cust.name) setCustomerName(cust.name);
          if (cust.address) setShippingAddress(cust.address);
        })
        .catch(() => {
          setExistingCustomer(null);
        });
    } else {
      setExistingCustomer(null);
    }
  }, [customerPhone]);

  // Cart promotion automatic evaluation
  useEffect(() => {
    if (cart.length === 0) {
      setAppliedPromo(null);
      return;
    }

    const payload = cart.map((it) => ({
      productId: it.product.id,
      sku: it.product.sku,
      name: it.product.name,
      unitPrice: it.product.retail_price,
      costPrice: it.product.cost_price,
      quantity: it.quantity,
      material: it.product.material
    }));

    api
      .evaluatePromotion(payload)
      .then((res) => {
        setAppliedPromo(res);
      })
      .catch((err) => {
        console.error('Promotion evaluate error:', err);
      });
  }, [cart]);

  // Add product to cart
  const addToCart = (product: Product) => {
    setErrorMessage('');
    if (product.stock_quantity <= 0) {
      setErrorMessage(`Sản phẩm '${product.name}' đã hết hàng trong kho!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          setErrorMessage(`Số lượng trong giỏ (${existing.quantity}) đã đạt mức tồn kho tối đa!`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMessage('');
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock_quantity) {
              setErrorMessage(`Chỉ còn ${item.product.stock_quantity} sản phẩm trong kho`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerPhone('');
    setCustomerName('');
    setShippingAddress('');
    setShippingFee(0);
    setPaidAmount('');
    setOrderNotes('');
    setAppliedPromo(null);
    setErrorMessage('');
  };

  // Calculations
  const rawSubtotal = cart.reduce((acc, it) => acc + it.product.retail_price * it.quantity, 0);
  const discount = appliedPromo ? appliedPromo.discountAmount : 0;
  const grandTotal = Math.max(0, rawSubtotal - discount + Number(shippingFee || 0));

  // If user typed custom paid amount, otherwise defaults to grandTotal
  const finalPaidAmount = paidAmount !== '' ? Math.min(grandTotal, Math.max(0, Number(paidAmount))) : grandTotal;
  const remainingDebt = Math.max(0, grandTotal - finalPaidAmount);

  // Filter products for catalog side
  const materials = ['ALL', 'PLA', 'PETG', 'ABS', 'Steel', 'Spring Steel'];
  const filteredProducts = products.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMat =
      selectedMaterial === 'ALL' ||
      (p.material && p.material.toLowerCase().includes(selectedMaterial.toLowerCase()));
    return matchesQuery && matchesMat;
  });

  // Handle Order Submit
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('Giỏ hàng đang trống!');
      return;
    }
    if (!customerPhone.trim() || !customerName.trim()) {
      setErrorMessage('Vui lòng nhập Tên và Số điện thoại khách hàng');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      // Generate idempotency key for this order session
      const idempotencyKey = `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const orderPayload = {
        customer_id: existingCustomer?.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress.trim(),
        items: cart.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity
        })),
        shipping_fee: Number(shippingFee || 0),
        paid_amount: finalPaidAmount,
        payment_method: paymentMethod,
        notes: orderNotes,
        idempotency_key: idempotencyKey,
        applied_promotion_id: appliedPromo?.discountAmount ? appliedPromo : undefined
      };

      const createdOrder = await api.createOrder(orderPayload);
      setCompletedOrder(createdOrder);
      // Reload product inventory
      loadProducts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo đơn hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Cols: Product Catalog & Fast Search */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search Bar & Category Segmented Tabs */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo Tên hoặc SKU (vd: VL-PLA, cuộn lụa đỏ, 0.4mm)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 text-slate-900 dark:text-slate-100"
              autoFocus
            />
          </div>

          {/* Segmented Filter Controls */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {materials.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMaterial(m)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedMaterial === m
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {m === 'ALL' ? 'Tất cả vật liệu' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const inCart = cart.find((it) => it.product.id === p.id);
            const isOutOfStock = p.stock_quantity <= 0;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`group p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between select-none ${
                  isOutOfStock
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-60 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-xs cursor-pointer'
                }`}
              >
                <div>
                  {/* Product Image Thumbnail */}
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="w-8 h-8 text-slate-400 opacity-40" />
                    )}

                    {inCart && (
                      <div className="absolute top-1.5 right-1.5 bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Đã chọn: {inCart.quantity}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-mono font-medium">{p.sku}</span>
                    <span
                      className={`tabular-nums font-semibold ${
                        p.stock_quantity <= p.min_stock_alert
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      Kho: {p.stock_quantity}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1.5">
                    {p.name}
                  </h3>

                  {p.color && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 truncate font-medium">
                      {p.color}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatVND(p.retail_price)}
                  </div>
                  {inCart && (
                    <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded">
                      x{inCart.quantity}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
            Không tìm thấy sản phẩm nào khớp với tìm kiếm
          </div>
        )}
      </div>

      {/* Right 5 Cols: Active Cart & Checkout Panel */}
      <div className="lg:col-span-5 space-y-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-slate-900 dark:text-slate-100" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Giỏ Hàng ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium"
              >
                Xóa giỏ
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 text-xs"
              >
                <div className="w-9 h-9 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                  {item.product.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono">{item.product.sku}</span>
                    {item.product.color && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[90px]">{item.product.color}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="tabular-nums font-semibold">{formatVND(item.product.retail_price)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Giỏ hàng trống. Chọn sản phẩm từ danh mục bên trái.
              </div>
            )}
          </div>

          {/* Promotion Banner if evaluated */}
          {appliedPromo && appliedPromo.discountAmount > 0 && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium">{appliedPromo.note || appliedPromo.promotionName}</span>
              </div>
              <span className="font-bold tabular-nums">
                -{formatVND(appliedPromo.discountAmount)}
              </span>
            </div>
          )}

          {/* Customer Lookup & Info */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Thông tin khách hàng
              </span>
              {existingCustomer && (
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                  Khách quen ({existingCustomer.total_orders} đơn) · Nợ cũ: {formatVND(existingCustomer.current_debt)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Số điện thoại (*)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Tên khách hàng (*)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="relative text-xs">
              <input
                type="text"
                placeholder="Địa chỉ giao hàng (tùy chọn)..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          {/* Payment Method & Shipping */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span>Phí giao hàng:</span>
              <input
                type="number"
                min="0"
                step="5000"
                value={shippingFee}
                onChange={(e) => setShippingFee(Number(e.target.value))}
                className="w-28 px-2 py-1 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md tabular-nums focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="text-slate-600 dark:text-slate-400 block mb-1">Phương thức thanh toán:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'TIEN_MAT', label: 'Tiền mặt', icon: <Banknote className="w-3.5 h-3.5" /> },
                  { id: 'CHUYEN_KHOAN', label: 'Chuyển khoản', icon: <CreditCard className="w-3.5 h-3.5" /> },
                  { id: 'VI_DIEN_TU', label: 'Ví điện tử', icon: <Smartphone className="w-3.5 h-3.5" /> },
                  { id: 'CONG_NO', label: 'Ghi nợ 100%', icon: <User className="w-3.5 h-3.5" /> }
                ].map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => {
                      setPaymentMethod(pm.id as PaymentMethod);
                      if (pm.id === 'CONG_NO') setPaidAmount('0');
                    }}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                      paymentMethod === pm.id
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {pm.icon}
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Split Payment / Partial Payment */}
            {paymentMethod !== 'CONG_NO' && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600 dark:text-slate-400">Tiền khách trả thực tế:</span>
                <input
                  type="number"
                  placeholder={String(grandTotal)}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-32 px-2 py-1 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md tabular-nums font-semibold focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Tổng tiền hàng:</span>
              <span className="tabular-nums">{formatVND(rawSubtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Khuyến mãi giảm trừ:</span>
                <span className="tabular-nums">-{formatVND(discount)}</span>
              </div>
            )}
            {shippingFee > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Phí ship:</span>
                <span className="tabular-nums">+{formatVND(shippingFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Tổng thanh toán:</span>
              <span className="tabular-nums text-base">{formatVND(grandTotal)}</span>
            </div>
            {remainingDebt > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold pt-0.5">
                <span>Ghi nhận công nợ đơn:</span>
                <span className="tabular-nums">{formatVND(remainingDebt)}</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang tạo đơn & xuất kho...' : 'Xác nhận Tạo Đơn & Xuất Kho'}</span>
          </button>
        </div>
      </div>

      {/* Completed Order Modal / Printable Retail Receipt */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">Tạo Đơn Hàng Thành Công!</span>
              </div>
              <button
                onClick={() => {
                  setCompletedOrder(null);
                  clearCart();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 text-xs font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  3D TECH & FILAMENT STORE
                </div>
                <div className="text-[11px] text-slate-500">HÓA ĐƠN BÁN LẺ</div>
                <div className="text-[11px] text-slate-500">Mã: {completedOrder.order_code}</div>
              </div>

              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div>Khách hàng: <span className="font-bold text-slate-900 dark:text-slate-100">{completedOrder.customer_name}</span></div>
                <div>Điện thoại: {completedOrder.customer_phone}</div>
                {completedOrder.shipping_address && <div>Đ/C: {completedOrder.shipping_address}</div>}
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 space-y-1.5">
                {completedOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <div>{it.name_snapshot}</div>
                      <div className="text-[10px] text-slate-400">{it.sku_snapshot} x {it.quantity}</div>
                    </div>
                    <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatVND(it.subtotal)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Tiền hàng:</span>
                  <span className="tabular-nums">{formatVND(completedOrder.subtotal)}</span>
                </div>
                {completedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá:</span>
                    <span className="tabular-nums">-{formatVND(completedOrder.discount_amount)}</span>
                  </div>
                )}
                {completedOrder.shipping_fee > 0 && (
                  <div className="flex justify-between">
                    <span>Phí ship:</span>
                    <span className="tabular-nums">+{formatVND(completedOrder.shipping_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                  <span>TỔNG CỘNG:</span>
                  <span className="tabular-nums">{formatVND(completedOrder.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Đã thanh toán:</span>
                  <span className="tabular-nums">{formatVND(completedOrder.paid_amount)}</span>
                </div>
                {completedOrder.debt_amount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Còn nợ:</span>
                    <span className="tabular-nums">{formatVND(completedOrder.debt_amount)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" /> In Hóa Đơn
              </button>
              <button
                onClick={() => {
                  setCompletedOrder(null);
                  clearCart();
                }}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg transition-colors"
              >
                Đơn Mới (F2)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
