export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  material?: string;
}

export interface PromotionRule {
  id: string;
  name: string;
  code?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'TIER_QUANTITY' | 'COMBO' | 'BUY_X_GET_Y';
  config: string; // JSON
  startDate: string;
  endDate: string;
  isActive: number | boolean;
  isStackable: number | boolean;
}

export interface PromotionCalculationResult {
  promotionId: string;
  promotionName: string;
  promotionType: string;
  discountAmount: number;
  itemDiscounts: Record<string, number>; // productId -> discount
  note: string;
}

export function evaluatePromotions(
  items: CartItem[],
  promotions: PromotionRule[],
  selectedPromoId?: string
): PromotionCalculationResult | null {
  if (!items || items.length === 0) return null;

  const totalQuantity = items.reduce((acc, it) => acc + it.quantity, 0);
  const rawSubtotal = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);

  // Filter valid active promotions
  const now = new Date();
  const activePromos = promotions.filter(p => {
    if (!p.isActive) return false;
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    if (now < start || now > end) return false;
    if (selectedPromoId && p.id !== selectedPromoId) return false;
    return true;
  });

  if (activePromos.length === 0) return null;

  let bestResult: PromotionCalculationResult | null = null;

  for (const promo of activePromos) {
    let cfg: any = {};
    try {
      cfg = typeof promo.config === 'string' ? JSON.parse(promo.config) : promo.config;
    } catch {
      continue;
    }

    let discount = 0;
    const itemDiscounts: Record<string, number> = {};
    let note = '';

    switch (promo.type) {
      case 'PERCENTAGE': {
        // e.g. { percentage: 10, min_order_amount: 1000000, max_discount: 200000 }
        const minOrder = Number(cfg.min_order_amount || 0);
        if (rawSubtotal >= minOrder) {
          const pct = Number(cfg.percentage || 0);
          let rawDiscount = Math.round((rawSubtotal * pct) / 100);
          if (cfg.max_discount && rawDiscount > Number(cfg.max_discount)) {
            rawDiscount = Number(cfg.max_discount);
          }
          discount = rawDiscount;
          note = `Giảm ${pct}% cho đơn từ ${minOrder.toLocaleString('vi-VN')}đ`;
        }
        break;
      }

      case 'FIXED_AMOUNT': {
        // e.g. { fixed_discount_per_unit: 5000, apply_all_units: true }
        const fixedPerUnit = Number(cfg.fixed_discount_per_unit || 0);
        if (fixedPerUnit > 0) {
          discount = fixedPerUnit * totalQuantity;
          items.forEach(it => {
            itemDiscounts[it.productId] = fixedPerUnit * it.quantity;
          });
          note = `Giảm ${fixedPerUnit.toLocaleString('vi-VN')}đ mỗi cuộn (x${totalQuantity})`;
        }
        break;
      }

      case 'TIER_QUANTITY': {
        // e.g. { min_quantity: 5, discount_amount: 50000 }
        const minQty = Number(cfg.min_quantity || 0);
        if (totalQuantity >= minQty) {
          discount = Number(cfg.discount_amount || 0);
          note = `Mua từ ${minQty} cuộn giảm ngay ${discount.toLocaleString('vi-VN')}đ`;
        }
        break;
      }

      case 'COMBO': {
        // e.g. { required_quantity: 5, combo_fixed_price: 900000, allowed_materials: ['PLA'] }
        const reqQty = Number(cfg.required_quantity || 5);
        const comboFixedPrice = Number(cfg.combo_fixed_price || 900000);

        // Find eligible items
        const eligibleItems = items.filter(it => {
          if (!cfg.allowed_materials || cfg.allowed_materials.length === 0) return true;
          return cfg.allowed_materials.some((m: string) =>
            it.material?.toLowerCase().includes(m.toLowerCase()) ||
            it.name.toLowerCase().includes(m.toLowerCase())
          );
        });

        const eligibleQty = eligibleItems.reduce((acc, it) => acc + it.quantity, 0);
        if (eligibleQty >= reqQty) {
          const comboSets = Math.floor(eligibleQty / reqQty);
          // Standard price for reqQty
          const avgStandardSubtotal = eligibleItems.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0) * (reqQty / eligibleQty);
          const savingPerSet = Math.max(0, avgStandardSubtotal - comboFixedPrice);
          discount = Math.round(savingPerSet * comboSets);
          note = `Áp dụng Combo ${reqQty} cuộn giá ${comboFixedPrice.toLocaleString('vi-VN')}đ (${comboSets} combo)`;
        }
        break;
      }

      case 'BUY_X_GET_Y': {
        // e.g. { buy_qty: 5, get_qty: 1 }
        const buyQty = Number(cfg.buy_qty || 5);
        const getQty = Number(cfg.get_qty || 1);
        const cycle = buyQty + getQty;

        if (totalQuantity >= cycle) {
          const freeUnits = Math.floor(totalQuantity / cycle) * getQty;
          // Find lowest unit price to discount
          const sorted = [...items].sort((a, b) => a.unitPrice - b.unitPrice);
          let remainingFree = freeUnits;
          let calculatedDiscount = 0;

          for (const item of sorted) {
            if (remainingFree <= 0) break;
            const applyQty = Math.min(item.quantity, remainingFree);
            const itemDisc = applyQty * item.unitPrice;
            calculatedDiscount += itemDisc;
            itemDiscounts[item.productId] = (itemDiscounts[item.productId] || 0) + itemDisc;
            remainingFree -= applyQty;
          }

          discount = calculatedDiscount;
          note = `Mua ${buyQty} tặng ${getQty} (Miễn phí ${freeUnits} sản phẩm)`;
        }
        break;
      }
    }

    if (discount > 0) {
      if (!bestResult || discount > bestResult.discountAmount) {
        bestResult = {
          promotionId: promo.id,
          promotionName: promo.name,
          promotionType: promo.type,
          discountAmount: discount,
          itemDiscounts,
          note
        };
      }
    }
  }

  return bestResult;
}
