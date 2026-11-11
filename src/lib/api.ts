import {
  Product,
  Customer,
  Supplier,
  Promotion,
  SalesOrder,
  PurchaseReceipt,
  CashTransaction,
  InventoryMovement,
  DashboardSummary,
  AppSetting
} from '../types';

const BASE_URL = '/api/v1';

async function handleResponse<T>(res: globalThis.Response): Promise<T> {
  if (!res.ok) {
    let errMessage = 'Đã xảy ra lỗi khi giao tiếp với máy chủ';
    try {
      const data = await res.json();
      if (data.error) errMessage = data.error;
      else if (data.detail) errMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  // System Health
  health: () => fetch(`${BASE_URL}/health`).then(r => handleResponse<any>(r)),

  // Settings
  getSettings: () => fetch(`${BASE_URL}/settings`).then(r => handleResponse<AppSetting>(r)),
  updateSettings: (data: Partial<AppSetting>) =>
    fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<AppSetting>(r)),

  // Products
  getProducts: (params?: { search?: string; material?: string; manufacturer?: string; lowStock?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.material) q.append('material', params.material);
    if (params?.manufacturer) q.append('manufacturer', params.manufacturer);
    if (params?.lowStock) q.append('lowStock', 'true');
    return fetch(`${BASE_URL}/products?${q.toString()}`).then(r => handleResponse<Product[]>(r));
  },
  getProductById: (id: string) => fetch(`${BASE_URL}/products/${id}`).then(r => handleResponse<Product>(r)),
  createProduct: (data: Partial<Product> & { initial_stock?: number }) =>
    fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Product>(r)),
  updateProduct: (id: string, data: Partial<Product>) =>
    fetch(`${BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Product>(r)),
  deleteProduct: (id: string) =>
    fetch(`${BASE_URL}/products/${id}`, { method: 'DELETE' }).then(r => handleResponse<{ success: boolean; message: string }>(r)),
  importProducts: (items: any[]) =>
    fetch(`${BASE_URL}/products/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    }).then(r => handleResponse<{ imported: number; skipped: number; errors: string[] }>(r)),
  uploadImage: async (fileOrData: File | { data: string; filename?: string }): Promise<{ success: boolean; url: string; filename: string; size?: number }> => {
    let payload: { data: string; filename?: string };
    if (fileOrData instanceof File) {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrData);
      });
      payload = { data, filename: fileOrData.name };
    } else {
      payload = fileOrData;
    }

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ success: boolean; url: string; filename: string; size?: number }>(res);
  },

  // Customers
  getCustomers: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetch(`${BASE_URL}/customers${q}`).then(r => handleResponse<Customer[]>(r));
  },
  getCustomerByPhone: (phone: string) =>
    fetch(`${BASE_URL}/customers/by-phone/${encodeURIComponent(phone)}`).then(r => handleResponse<Customer>(r)),
  getCustomerById: (id: string) => fetch(`${BASE_URL}/customers/${id}`).then(r => handleResponse<Customer>(r)),
  createCustomer: (data: Partial<Customer>) =>
    fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Customer>(r)),
  updateCustomer: (id: string, data: Partial<Customer>) =>
    fetch(`${BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Customer>(r)),

  // Suppliers
  getSuppliers: () => fetch(`${BASE_URL}/suppliers`).then(r => handleResponse<Supplier[]>(r)),
  createSupplier: (data: Partial<Supplier>) =>
    fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Supplier>(r)),

  // Inventory
  getMovements: (productId?: string) => {
    const q = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    return fetch(`${BASE_URL}/inventory/movements${q}`).then(r => handleResponse<InventoryMovement[]>(r));
  },
  adjustStock: (productId: string, newQuantity: number, reason: string) =>
    fetch(`${BASE_URL}/inventory/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, newQuantity, reason })
    }).then(r => handleResponse<{ success: boolean; product: Product }>(r)),
  getLowStock: () => fetch(`${BASE_URL}/inventory/low-stock`).then(r => handleResponse<Product[]>(r)),

  // Promotions
  getPromotions: () => fetch(`${BASE_URL}/promotions`).then(r => handleResponse<Promotion[]>(r)),
  createPromotion: (data: Partial<Promotion>) =>
    fetch(`${BASE_URL}/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Promotion>(r)),
  updatePromotion: (id: string, data: Partial<Promotion>) =>
    fetch(`${BASE_URL}/promotions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Promotion>(r)),
  evaluatePromotion: (items: any[], selectedPromoId?: string) =>
    fetch(`${BASE_URL}/promotions/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, selectedPromoId })
    }).then(r => handleResponse<{ discountAmount: number; promotionId?: string; promotionName?: string; note: string }>(r)),

  // Orders
  getOrders: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    return fetch(`${BASE_URL}/orders?${q.toString()}`).then(r => handleResponse<SalesOrder[]>(r));
  },
  getOrderById: (id: string) => fetch(`${BASE_URL}/orders/${id}`).then(r => handleResponse<SalesOrder>(r)),
  createOrder: (data: any) =>
    fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<SalesOrder>(r)),
  cancelOrder: (id: string, reason: string) =>
    fetch(`${BASE_URL}/orders/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    }).then(r => handleResponse<any>(r)),
  recordOrderPayment: (id: string, amount: number, payment_method: string, notes?: string) =>
    fetch(`${BASE_URL}/orders/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, payment_method, notes })
    }).then(r => handleResponse<any>(r)),
  returnOrder: (id: string, return_items: any[], reason: string, refund_amount: number) =>
    fetch(`${BASE_URL}/orders/${id}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_items, reason, refund_amount })
    }).then(r => handleResponse<any>(r)),

  // Purchases
  getPurchases: () => fetch(`${BASE_URL}/purchases`).then(r => handleResponse<PurchaseReceipt[]>(r)),
  createPurchase: (data: any) =>
    fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<PurchaseReceipt>(r)),

  // Cash Transactions
  getCashTransactions: (params?: { direction?: string; category?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.direction) q.append('direction', params.direction);
    if (params?.category) q.append('category', params.category);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    return fetch(`${BASE_URL}/cash-transactions?${q.toString()}`).then(r =>
      handleResponse<{ transactions: CashTransaction[]; summary: { totalIn: number; totalOut: number; balance: number } }>(r)
    );
  },
  createCashTransaction: (data: Partial<CashTransaction>) =>
    fetch(`${BASE_URL}/cash-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<CashTransaction>(r)),

  // Dashboard
  getDashboardSummary: (params?: string | {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    selectedDate?: string;
    selectedMonth?: string;
    selectedYear?: string;
  }) => {
    const q = new URLSearchParams();
    if (typeof params === 'string') {
      q.append('timeRange', params);
    } else if (params) {
      if (params.timeRange) q.append('timeRange', params.timeRange);
      if (params.startDate) q.append('startDate', params.startDate);
      if (params.endDate) q.append('endDate', params.endDate);
      if (params.selectedDate) q.append('selectedDate', params.selectedDate);
      if (params.selectedMonth) q.append('selectedMonth', params.selectedMonth);
      if (params.selectedYear) q.append('selectedYear', params.selectedYear);
    }
    return fetch(`${BASE_URL}/dashboard/summary?${q.toString()}`).then(r => handleResponse<DashboardSummary>(r));
  },
  getDashboardCharts: (params?: string | {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    selectedDate?: string;
    selectedMonth?: string;
    selectedYear?: string;
  }) => {
    const q = new URLSearchParams();
    if (typeof params === 'string') {
      q.append('timeRange', params);
    } else if (params) {
      if (params.timeRange) q.append('timeRange', params.timeRange);
      if (params.startDate) q.append('startDate', params.startDate);
      if (params.endDate) q.append('endDate', params.endDate);
      if (params.selectedDate) q.append('selectedDate', params.selectedDate);
      if (params.selectedMonth) q.append('selectedMonth', params.selectedMonth);
      if (params.selectedYear) q.append('selectedYear', params.selectedYear);
    }
    return fetch(`${BASE_URL}/dashboard/charts?${q.toString()}`).then(r => handleResponse<any>(r));
  }
};
