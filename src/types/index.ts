export type PaymentMethod = 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'VI_DIEN_TU' | 'CONG_NO';

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED';

export type PromotionType =
  | 'PERCENTAGE'
  | 'FIXED_AMOUNT'
  | 'TIER_QUANTITY'
  | 'COMBO'
  | 'BUY_X_GET_Y';

export type MovementType =
  | 'IMPORT'
  | 'SALE'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT';

export type CashDirection = 'IN' | 'OUT';

export type CashCategory =
  | 'SALES_PAYMENT'
  | 'CUSTOMER_DEBT'
  | 'PURCHASE_PAYMENT'
  | 'SALARY'
  | 'RENT'
  | 'UTILITIES'
  | 'MARKETING'
  | 'OTHER';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  material?: string;
  series?: string;
  manufacturer?: string;
  color?: string; // Thuộc tính màu sắc: ví dụ "Đỏ", "Đen", "Trắng", "Xanh Dương", "#FF0000"
  unit: string;
  cost_price: number;
  retail_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  attributes?: string | Record<string, any>;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_id?: string;
  reason?: string;
  cost_at_time: number;
  sku?: string;
  product_name?: string;
  unit?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  first_purchase_at?: string;
  last_purchase_at?: string;
  total_orders: number;
  total_spent: number;
  total_paid: number;
  current_debt: number;
  created_at: string;
  orders?: SalesOrder[];
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  tax_id?: string;
  total_purchases: number;
  current_debt: number;
  created_at: string;
}

export interface Promotion {
  id: string;
  name: string;
  code?: string;
  type: PromotionType;
  config: string | Record<string, any>;
  start_date: string;
  end_date: string;
  is_active: number | boolean;
  is_stackable: number | boolean;
  created_at: string;
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku_snapshot: string;
  name_snapshot: string;
  unit_cost_snapshot: number;
  unit_price_snapshot: number;
  quantity: number;
  subtotal: number;
  discount_amount: number;
}

export interface SalesOrder {
  id: string;
  order_code: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  shipping_address?: string;
  subtotal: number;
  discount_amount: number;
  applied_promotion_id?: string;
  shipping_fee: number;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  notes?: string;
  items?: SalesOrderItem[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface PurchaseReceiptItem {
  id: string;
  receipt_id: string;
  product_id: string;
  sku_snapshot: string;
  name_snapshot: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface PurchaseReceipt {
  id: string;
  receipt_code: string;
  supplier_id?: string;
  supplier_name: string;
  total_cost: number;
  shipping_cost: number;
  other_cost: number;
  paid_amount: number;
  debt_amount: number;
  status: 'DRAFT' | 'POSTED';
  notes?: string;
  items?: PurchaseReceiptItem[];
  created_at: string;
  posted_at?: string;
}

export interface CashTransaction {
  id: string;
  code: string;
  direction: CashDirection;
  category: CashCategory;
  amount: number;
  payment_method: PaymentMethod;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  receipt_image_url?: string;
  created_at: string;
}

export interface DashboardSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  totalOrders: number;
  averageOrderValue: number;
  totalStockQuantity: number;
  totalInventoryValuation: number;
  lowStockCount: number;
  totalCustomerDebt: number;
  totalCollected: number;
}

export interface AppSetting {
  id: string;
  store_name: string;
  store_phone: string;
  store_address: string;
  store_email?: string;
  receipt_header?: string;
  receipt_footer?: string;
  tax_rate: number;
  currency: string;
  timezone: string;
}
