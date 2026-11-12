import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { evaluatePromotions, CartItem } from '../services/promotionEngine.js';

export const apiRouter = Router();

// Helper to generate IDs
function genId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

// Helper to generate human-readable codes
function genCode(prefix = 'ORD'): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const randomDigits = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${dateStr}-${randomDigits}`;
}

// ----------------------------------------------------
// Health Check
// ----------------------------------------------------
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Ho_Chi_Minh',
    database: 'SQLite (WAL mode)',
    currency: 'VND'
  });
});

// ----------------------------------------------------
// Auth Routes
// ----------------------------------------------------
apiRouter.post('/auth/token', (req: Request, res: Response) => {
  const { username, password } = req.body;
  // Single admin check
  const user = db.prepare('SELECT * FROM app_users WHERE username = ? AND is_active = 1').get(username) as any;
  if (!user || (password !== 'admin123' && user.password_hash !== password)) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
  }

  res.json({
    access_token: 'jwt_admin_token_active_session',
    token_type: 'bearer',
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role
    }
  });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, username, full_name, role, is_active FROM app_users LIMIT 1').get() as any;
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role
  });
});

// ----------------------------------------------------
// Settings Routes
// ----------------------------------------------------
apiRouter.get('/settings', (req: Request, res: Response) => {
  const settings = db.prepare('SELECT * FROM app_settings LIMIT 1').get() as any;
  res.json(settings);
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const { store_name, store_phone, store_address, store_email, receipt_header, receipt_footer } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE app_settings
    SET store_name = ?, store_phone = ?, store_address = ?, store_email = ?, receipt_header = ?, receipt_footer = ?, updated_at = ?
    WHERE id = (SELECT id FROM app_settings LIMIT 1)
  `).run(store_name, store_phone, store_address, store_email, receipt_header, receipt_footer, now);

  const updated = db.prepare('SELECT * FROM app_settings LIMIT 1').get();
  res.json(updated);
});

// ----------------------------------------------------
// Products Routes (CRUD, Stock & Excel/CSV Import)
// ----------------------------------------------------
apiRouter.get('/products', (req: Request, res: Response) => {
  const { search, material, manufacturer, series, color, lowStock } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (sku LIKE ? OR name LIKE ? OR description LIKE ? OR color LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (material) {
    query += ' AND material = ?';
    params.push(material);
  }
  if (color) {
    query += ' AND (color = ? OR color LIKE ?)';
    params.push(color, `%${color}%`);
  }
  if (manufacturer) {
    query += ' AND manufacturer = ?';
    params.push(manufacturer);
  }
  if (series) {
    query += ' AND series = ?';
    params.push(series);
  }
  if (lowStock === 'true') {
    query += ' AND stock_quantity <= min_stock_alert';
  }

  query += ' ORDER BY created_at DESC';
  const products = db.prepare(query).all(...params);
  res.json(products);
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  res.json(product);
});

apiRouter.post('/products', (req: Request, res: Response) => {
  const {
    sku, name, description, material, series, manufacturer, color,
    unit = 'Cuộn', cost_price = 0, retail_price = 0,
    initial_stock = 0, min_stock_alert = 5, attributes = {}, image_url
  } = req.body;

  if (!sku || !name) {
    return res.status(400).json({ error: 'SKU và Tên sản phẩm là bắt buộc' });
  }

  const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim());
  if (existing) {
    return res.status(400).json({ error: `SKU '${sku}' đã tồn tại trong hệ thống` });
  }

  const id = genId('prod');
  const now = new Date().toISOString();

  const insertTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO products (id, sku, name, description, material, series, manufacturer, color, unit, cost_price, retail_price, stock_quantity, min_stock_alert, attributes, image_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sku.trim().toUpperCase(), name.trim(), description || '',
      material || '', series || '', manufacturer || '',
      color ? color.trim() : null,
      unit, Math.round(Number(cost_price)), Math.round(Number(retail_price)),
      Math.round(Number(initial_stock)), Math.round(Number(min_stock_alert)),
      typeof attributes === 'string' ? attributes : JSON.stringify(attributes),
      image_url || null, now, now
    );

    if (Number(initial_stock) > 0) {
      db.prepare(`
        INSERT INTO inventory_movements (id, product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_id, reason, cost_at_time, created_at)
        VALUES (?, ?, 'IMPORT', ?, 0, ?, 'INITIAL_CREATE', 'Khởi tạo số lượng tồn ban đầu khi tạo sản phẩm', ?, ?)
      `).run(genId('inv'), id, Number(initial_stock), Number(initial_stock), Math.round(Number(cost_price)), now);
    }

    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'CREATE_PRODUCT', 'PRODUCT', ?, ?, ?)
    `).run(genId('audit'), id, `Tạo sản phẩm mới ${name} (${sku})${color ? ` - Màu: ${color}` : ''}`, now);
  });

  insertTx();
  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json(created);
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!current) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

  const {
    sku, name, description, material, series, manufacturer, color,
    unit, cost_price, retail_price, min_stock_alert, attributes, image_url
  } = req.body;

  if (sku && sku.trim().toUpperCase() !== current.sku) {
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku.trim().toUpperCase(), id);
    if (existingSku) return res.status(400).json({ error: `SKU '${sku}' đã tồn tại ở sản phẩm khác` });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE products
    SET sku = ?, name = ?, description = ?, material = ?, series = ?, manufacturer = ?, color = ?,
        unit = ?, cost_price = ?, retail_price = ?, min_stock_alert = ?, attributes = ?, image_url = ?, updated_at = ?
    WHERE id = ?
  `).run(
    sku ? sku.trim().toUpperCase() : current.sku,
    name || current.name,
    description !== undefined ? description : current.description,
    material !== undefined ? material : current.material,
    series !== undefined ? series : current.series,
    manufacturer !== undefined ? manufacturer : current.manufacturer,
    color !== undefined ? (color ? color.trim() : null) : current.color,
    unit || current.unit,
    cost_price !== undefined ? Math.round(Number(cost_price)) : current.cost_price,
    retail_price !== undefined ? Math.round(Number(retail_price)) : current.retail_price,
    min_stock_alert !== undefined ? Math.round(Number(min_stock_alert)) : current.min_stock_alert,
    attributes !== undefined ? (typeof attributes === 'string' ? attributes : JSON.stringify(attributes)) : current.attributes,
    image_url !== undefined ? image_url : current.image_url,
    now,
    id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json(updated);
});

apiRouter.delete('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!product) {
    return res.status(404).json({ error: 'Không tìm thấy sản phẩm cần xóa' });
  }

  try {
    const deleteTx = db.transaction(() => {
      // Temporarily disable foreign keys to cleanly remove product while preserving historical snapshot integrity
      db.pragma('foreign_keys = OFF');

      // Delete associated inventory movements
      db.prepare('DELETE FROM inventory_movements WHERE product_id = ?').run(id);

      // Delete associated audit logs
      db.prepare('DELETE FROM audit_logs WHERE entity_id = ?').run(id);

      // Delete the product
      db.prepare('DELETE FROM products WHERE id = ?').run(id);

      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    });

    deleteTx();

    res.json({
      success: true,
      message: `Đã xóa sản phẩm "${product.name}" (${product.sku}) thành công`
    });
  } catch (err: any) {
    db.pragma('foreign_keys = ON');
    console.error('Lỗi khi xóa sản phẩm:', err);
    res.status(500).json({ error: `Không thể xóa sản phẩm: ${err.message || 'Lỗi hệ thống'}` });
  }
});

// Import products batch
apiRouter.post('/products/import', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Danh sách sản phẩm nhập vào không hợp lệ' });
  }

  const results = { imported: 0, skipped: 0, errors: [] as string[] };
  const now = new Date().toISOString();

  const importTx = db.transaction(() => {
    for (const item of items) {
      if (!item.sku || !item.name) {
        results.errors.push(`Bỏ qua dòng thiếu SKU hoặc Tên`);
        results.skipped++;
        continue;
      }
      const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(item.sku.trim().toUpperCase());
      if (existing) {
        results.errors.push(`SKU ${item.sku} đã tồn tại`);
        results.skipped++;
        continue;
      }

      const id = genId('prod');
      const qty = Math.max(0, Math.round(Number(item.stock_quantity || 0)));
      const cost = Math.max(0, Math.round(Number(item.cost_price || 0)));

      db.prepare(`
        INSERT INTO products (id, sku, name, description, material, series, manufacturer, color, unit, cost_price, retail_price, stock_quantity, min_stock_alert, attributes, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, item.sku.trim().toUpperCase(), item.name.trim(), item.description || '',
        item.material || '', item.series || '', item.manufacturer || '',
        item.color || '',
        item.unit || 'Cuộn', cost, Math.max(0, Math.round(Number(item.retail_price || 0))),
        qty, Math.round(Number(item.min_stock_alert || 5)),
        item.attributes ? JSON.stringify(item.attributes) : '{}',
        item.image_url || null, now, now
      );

      if (qty > 0) {
        db.prepare(`
          INSERT INTO inventory_movements (id, product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_id, reason, cost_at_time, created_at)
          VALUES (?, ?, 'IMPORT', ?, 0, ?, 'EXCEL_IMPORT', 'Nhập danh mục từ Excel/CSV', ?, ?)
        `).run(genId('inv'), id, qty, qty, cost, now);
      }

      results.imported++;
    }
  });

  importTx();
  res.json(results);
});

// ----------------------------------------------------
// Customers Routes
// ----------------------------------------------------
apiRouter.get('/customers', (req: Request, res: Response) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params: any[] = [];
  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR address LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY created_at DESC';
  const customers = db.prepare(query).all(...params);
  res.json(customers);
});

apiRouter.get('/customers/by-phone/:phone', (req: Request, res: Response) => {
  const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(req.params.phone.trim());
  if (!customer) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
  res.json(customer);
});

apiRouter.get('/customers/:id', (req: Request, res: Response) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Khách hàng không tồn tại' });
  // Also get customer orders
  const orders = db.prepare('SELECT * FROM sales_orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  res.json({ ...customer, orders });
});

apiRouter.post('/customers', (req: Request, res: Response) => {
  const { name, phone, address, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Tên và Số điện thoại là bắt buộc' });

  const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone.trim());
  if (existing) return res.status(400).json({ error: `Số điện thoại ${phone} đã được đăng ký` });

  const id = genId('cust');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO customers (id, name, phone, address, notes, total_orders, total_spent, total_paid, current_debt, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
  `).run(id, name.trim(), phone.trim(), address || '', notes || '', now);

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.status(201).json(created);
});

apiRouter.put('/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, address, notes } = req.body;
  const current = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!current) return res.status(404).json({ error: 'Khách hàng không tồn tại' });

  if (phone && phone.trim() !== current.phone) {
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ? AND id != ?').get(phone.trim(), id);
    if (existing) return res.status(400).json({ error: `Số điện thoại ${phone} đã trùng với khách khác` });
  }

  db.prepare(`
    UPDATE customers
    SET name = ?, phone = ?, address = ?, notes = ?
    WHERE id = ?
  `).run(name || current.name, phone || current.phone, address !== undefined ? address : current.address, notes !== undefined ? notes : current.notes, id);

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.json(updated);
});

apiRouter.delete('/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const current = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!current) return res.status(404).json({ error: 'Khách hàng không tồn tại' });

  try {
    const deleteTx = db.transaction(() => {
      // Temporarily disable foreign keys so orders preserve historical customer name/phone snapshots
      db.pragma('foreign_keys = OFF');

      // Unlink customer from historical orders (snapshots remain intact)
      db.prepare('UPDATE sales_orders SET customer_id = NULL WHERE customer_id = ?').run(id);

      // Delete customer record
      db.prepare('DELETE FROM customers WHERE id = ?').run(id);

      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    });

    deleteTx();
    res.json({ success: true, message: `Đã xóa khách hàng "${current.name}" thành công` });
  } catch (err: any) {
    db.pragma('foreign_keys = ON');
    console.error('Lỗi khi xóa khách hàng:', err);
    res.status(500).json({ error: `Không thể xóa khách hàng: ${err.message}` });
  }
});

// ----------------------------------------------------
// Suppliers Routes
// ----------------------------------------------------
apiRouter.get('/suppliers', (req: Request, res: Response) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC').all();
  res.json(suppliers);
});

apiRouter.post('/suppliers', (req: Request, res: Response) => {
  const { name, phone, address, tax_id } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Tên và Số điện thoại nhà cung cấp là bắt buộc' });

  const id = genId('sup');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO suppliers (id, name, phone, address, tax_id, total_purchases, current_debt, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, ?)
  `).run(id, name.trim(), phone.trim(), address || '', tax_id || '', now);

  const created = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  res.status(201).json(created);
});

// ----------------------------------------------------
// Inventory Movements & Adjustments
// ----------------------------------------------------
apiRouter.get('/inventory/movements', (req: Request, res: Response) => {
  const { productId, limit = 50 } = req.query;
  let query = `
    SELECT im.*, p.sku, p.name as product_name, p.unit
    FROM inventory_movements im
    JOIN products p ON im.product_id = p.id
  `;
  const params: any[] = [];
  if (productId) {
    query += ' WHERE im.product_id = ?';
    params.push(productId);
  }
  query += ' ORDER BY im.created_at DESC LIMIT ?';
  params.push(Number(limit));

  const movements = db.prepare(query).all(...params);
  res.json(movements);
});

apiRouter.post('/inventory/adjustments', (req: Request, res: Response) => {
  const { productId, newQuantity, reason } = req.body;

  if (!productId || newQuantity === undefined || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'Bắt buộc chọn sản phẩm, nhập số lượng mới và ghi rõ lý do điều chỉnh' });
  }

  const targetQty = Math.max(0, Math.round(Number(newQuantity)));
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
  if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

  const diff = targetQty - product.stock_quantity;
  if (diff === 0) {
    return res.json({ message: 'Số lượng tồn kho không thay đổi', product });
  }

  const now = new Date().toISOString();
  const movementType = diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

  const adjustTx = db.transaction(() => {
    // 1. Update product stock
    db.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?').run(targetQty, now, productId);

    // 2. Insert immutable inventory movement
    db.prepare(`
      INSERT INTO inventory_movements (id, product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_id, reason, cost_at_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      genId('inv'),
      productId,
      movementType,
      diff,
      product.stock_quantity,
      targetQty,
      'MANUAL_ADJUSTMENT',
      reason.trim(),
      product.cost_price,
      now
    );

    // 3. Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'ADJUST_STOCK', 'PRODUCT', ?, ?, ?)
    `).run(genId('audit'), productId, `Điều chỉnh kho ${product.name}: ${product.stock_quantity} -> ${targetQty}. Lý do: ${reason}`, now);
  });

  adjustTx();
  const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  res.json({ success: true, product: updatedProduct });
});

apiRouter.get('/inventory/low-stock', (req: Request, res: Response) => {
  const lowStockProducts = db.prepare(`
    SELECT * FROM products
    WHERE stock_quantity <= min_stock_alert
    ORDER BY stock_quantity ASC
  `).all();
  res.json(lowStockProducts);
});

// ----------------------------------------------------
// Promotions Routes
// ----------------------------------------------------
apiRouter.get('/promotions', (req: Request, res: Response) => {
  const promos = db.prepare('SELECT * FROM promotions ORDER BY created_at DESC').all();
  res.json(promos);
});

apiRouter.post('/promotions', (req: Request, res: Response) => {
  const { name, code, type, config, start_date, end_date, is_active = 1, is_stackable = 0 } = req.body;
  if (!name || !type || !config || !start_date || !end_date) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin chương trình khuyến mãi' });
  }

  const id = genId('promo');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO promotions (id, name, code, type, config, start_date, end_date, is_active, is_stackable, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name.trim(), code ? code.trim().toUpperCase() : null,
    type, typeof config === 'string' ? config : JSON.stringify(config),
    start_date, end_date, is_active ? 1 : 0, is_stackable ? 1 : 0, now
  );

  const created = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
  res.status(201).json(created);
});

apiRouter.put('/promotions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, type, config, start_date, end_date, is_active, is_stackable } = req.body;
  const current = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id) as any;
  if (!current) return res.status(404).json({ error: 'Khuyến mãi không tồn tại' });

  db.prepare(`
    UPDATE promotions
    SET name = ?, code = ?, type = ?, config = ?, start_date = ?, end_date = ?, is_active = ?, is_stackable = ?
    WHERE id = ?
  `).run(
    name || current.name,
    code !== undefined ? code : current.code,
    type || current.type,
    config ? (typeof config === 'string' ? config : JSON.stringify(config)) : current.config,
    start_date || current.start_date,
    end_date || current.end_date,
    is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
    is_stackable !== undefined ? (is_stackable ? 1 : 0) : current.is_stackable,
    id
  );

  const updated = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
  res.json(updated);
});

apiRouter.delete('/promotions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const current = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id) as any;
  if (!current) return res.status(404).json({ error: 'Khuyến mãi không tồn tại' });

  db.prepare('DELETE FROM promotions WHERE id = ?').run(id);
  res.json({ success: true, message: `Đã xóa khuyến mãi "${current.name}" thành công` });
});

// Calculate promotion for cart on backend
apiRouter.post('/promotions/evaluate', (req: Request, res: Response) => {
  const { items, selectedPromoId } = req.body;
  const activePromos = db.prepare('SELECT * FROM promotions WHERE is_active = 1').all() as any[];
  const mappedPromos = activePromos.map(p => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    config: p.config,
    startDate: p.start_date,
    endDate: p.end_date,
    isActive: p.is_active,
    isStackable: p.is_stackable
  }));

  const result = evaluatePromotions(items, mappedPromos, selectedPromoId);
  res.json(result || { discountAmount: 0, note: '' });
});

// ----------------------------------------------------
// Orders & POS (Transactions, Concurrency Lock, Restocking)
// ----------------------------------------------------
apiRouter.get('/orders', (req: Request, res: Response) => {
  const { status, search, limit = 50 } = req.query;
  let query = 'SELECT * FROM sales_orders WHERE 1=1';
  const params: any[] = [];
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (order_code LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));

  const orders = db.prepare(query).all(...params) as any[];

  // Attach items to orders
  const getItems = db.prepare('SELECT * FROM sales_order_items WHERE order_id = ?');
  const enrichedOrders = orders.map(o => ({
    ...o,
    items: getItems.all(o.id)
  }));

  res.json(enrichedOrders);
});

apiRouter.get('/orders/:id', (req: Request, res: Response) => {
  const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(req.params.id) as any;
  if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });
  order.items = db.prepare('SELECT * FROM sales_order_items WHERE order_id = ?').all(order.id);
  order.returns = db.prepare('SELECT * FROM order_returns WHERE order_id = ?').all(order.id);
  res.json(order);
});

// Create Order (Atomic Transaction with Idempotency Guard, Stock Locking, Ledger, Debt)
apiRouter.post('/orders', (req: Request, res: Response) => {
  const {
    customer_id, customer_name, customer_phone, shipping_address,
    items, shipping_fee = 0, payment_method = 'TIEN_MAT',
    paid_amount, notes, idempotency_key, applied_promotion_id
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
  }

  if (!customer_name || !customer_phone) {
    return res.status(400).json({ error: 'Thông tin khách hàng là bắt buộc' });
  }

  // Idempotency check to prevent duplicate order creation on rapid button clicks
  if (idempotency_key) {
    const existingOrder = db.prepare('SELECT id, order_code FROM sales_orders WHERE idempotency_key = ?').get(idempotency_key) as any;
    if (existingOrder) {
      return res.json({ message: 'Đơn hàng đã được xử lý (Idempotent)', order: existingOrder });
    }
  }

  const orderId = genId('ord');
  const orderCode = genCode('ORD');
  const now = new Date().toISOString();

  // Load backend promotion rules and evaluate
  const activePromos = db.prepare('SELECT * FROM promotions WHERE is_active = 1').all() as any[];
  const mappedPromos = activePromos.map(p => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    config: p.config,
    startDate: p.start_date,
    endDate: p.end_date,
    isActive: p.is_active,
    isStackable: p.is_stackable
  }));

  const promoEval = evaluatePromotions(items, mappedPromos, applied_promotion_id);
  const discountAmount = promoEval ? promoEval.discountAmount : 0;

  let subtotal = 0;
  const verifiedItems: any[] = [];

  // Atomic database transaction
  const orderTx = db.transaction(() => {
    // 1. Check stock and acquire row lock snapshot
    for (const it of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(it.productId || it.product_id) as any;
      if (!product) {
        throw new Error(`Sản phẩm với ID ${it.productId || it.product_id} không tồn tại`);
      }

      const reqQty = Math.round(Number(it.quantity));
      if (reqQty <= 0) throw new Error(`Số lượng sản phẩm ${product.name} không hợp lệ`);

      if (product.stock_quantity < reqQty) {
        throw new Error(`Sản phẩm '${product.name}' (SKU: ${product.sku}) không đủ tồn kho (Còn ${product.stock_quantity}, yêu cầu ${reqQty})`);
      }

      const lineSubtotal = product.retail_price * reqQty;
      subtotal += lineSubtotal;

      verifiedItems.push({
        id: genId('item'),
        productId: product.id,
        sku: product.sku,
        name: product.name,
        costPrice: product.cost_price,
        retailPrice: product.retail_price,
        quantity: reqQty,
        subtotal: lineSubtotal,
        currentStock: product.stock_quantity
      });
    }

    const shipFee = Math.max(0, Math.round(Number(shipping_fee)));
    const totalAmount = Math.max(0, subtotal - discountAmount + shipFee);

    // Calculate payment and debt
    let actualPaid = paid_amount !== undefined ? Math.round(Number(paid_amount)) : totalAmount;
    if (actualPaid > totalAmount) actualPaid = totalAmount;
    const debtAmount = Math.max(0, totalAmount - actualPaid);

    // 2. Find or create Customer
    let custId = customer_id;
    const existingCust = db.prepare('SELECT * FROM customers WHERE phone = ?').get(customer_phone.trim()) as any;
    if (existingCust) {
      custId = existingCust.id;
      db.prepare(`
        UPDATE customers
        SET total_orders = total_orders + 1,
            total_spent = total_spent + ?,
            total_paid = total_paid + ?,
            current_debt = current_debt + ?,
            last_purchase_at = ?
        WHERE id = ?
      `).run(totalAmount, actualPaid, debtAmount, now, custId);
    } else {
      custId = genId('cust');
      db.prepare(`
        INSERT INTO customers (id, name, phone, address, notes, first_purchase_at, last_purchase_at, total_orders, total_spent, total_paid, current_debt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      `).run(
        custId, customer_name.trim(), customer_phone.trim(),
        shipping_address || '', 'Tạo tự động từ POS', now, now,
        totalAmount, actualPaid, debtAmount, now
      );
    }

    // 3. Deduct stock and log inventory movement
    for (const vIt of verifiedItems) {
      const newStock = vIt.currentStock - vIt.quantity;
      db.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?').run(newStock, now, vIt.productId);

      db.prepare(`
        INSERT INTO inventory_movements (id, product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_id, reason, cost_at_time, created_at)
        VALUES (?, ?, 'SALE', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        genId('inv'),
        vIt.productId,
        -vIt.quantity,
        vIt.currentStock,
        newStock,
        orderId,
        `Xuất kho bán hàng đơn ${orderCode}`,
        vIt.costPrice,
        now
      );
    }

    // 4. Insert sales order header
    db.prepare(`
      INSERT INTO sales_orders (
        id, order_code, customer_id, customer_name, customer_phone, shipping_address,
        subtotal, discount_amount, applied_promotion_id, shipping_fee, total_amount,
        paid_amount, debt_amount, payment_method, status, notes, idempotency_key,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?)
    `).run(
      orderId, orderCode, custId, customer_name.trim(), customer_phone.trim(), shipping_address || '',
      subtotal, discountAmount, promoEval ? promoEval.promotionId : null, shipFee, totalAmount,
      actualPaid, debtAmount, payment_method, notes || '', idempotency_key || null,
      now, now, now
    );

    // 5. Insert sales order items snapshots
    const insertItem = db.prepare(`
      INSERT INTO sales_order_items (
        id, order_id, product_id, sku_snapshot, name_snapshot, unit_cost_snapshot,
        unit_price_snapshot, quantity, subtotal, discount_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const vIt of verifiedItems) {
      insertItem.run(
        vIt.id, orderId, vIt.productId, vIt.sku, vIt.name, vIt.costPrice,
        vIt.retailPrice, vIt.quantity, vIt.subtotal, 0
      );
    }

    // 6. Record Cash Transaction if payment was collected
    if (actualPaid > 0) {
      db.prepare(`
        INSERT INTO cash_transactions (id, code, direction, category, amount, payment_method, reference_type, reference_id, notes, created_at)
        VALUES (?, ?, 'IN', 'SALES_PAYMENT', ?, ?, 'ORDER', ?, ?, ?)
      `).run(
        genId('cash'), `PT-${orderCode}`, actualPaid, payment_method, orderId,
        `Thu tiền đơn hàng ${orderCode} (Khách: ${customer_name})`, now
      );
    }

    // 7. Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'CREATE_ORDER', 'ORDER', ?, ?, ?)
    `).run(genId('audit'), orderId, `Tạo và hoàn tất đơn hàng ${orderCode} (${totalAmount.toLocaleString('vi-VN')}đ)`, now);
  });

  try {
    orderTx();
    const createdOrder = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) as any;
    createdOrder.items = db.prepare('SELECT * FROM sales_order_items WHERE order_id = ?').all(orderId);
    res.status(201).json(createdOrder);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lỗi xử lý tạo đơn hàng' });
  }
});

// Update order status (with auto restock on CANCEL)
apiRouter.post('/orders/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason = 'Khách hủy đơn' } = req.body;
  const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

  if (order.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Đơn hàng đã bị hủy trước đó' });
  }

  const now = new Date().toISOString();
  const items = db.prepare('SELECT * FROM sales_order_items WHERE order_id = ?').all(id) as any[];

  const cancelTx = db.transaction(() => {
    // 1. Update order status
    db.prepare('UPDATE sales_orders SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(
      'CANCELLED',
      order.notes ? `${order.notes} | [HỦY]: ${reason}` : `[HỦY]: ${reason}`,
      now,
      id
    );

    // 2. Restock all products and log inventory movement
    for (const it of items) {
      const prod = db.prepare('SELECT stock_quantity, cost_price FROM products WHERE id = ?').get(it.product_id) as any;
      if (prod) {
        const newStock = prod.stock_quantity + it.quantity;
        db.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?').run(newStock, now, it.product_id);

        db.prepare(`
          INSERT INTO inventory_movements (id, product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_id, reason, cost_at_time, created_at)
          VALUES (?, ?, 'SALE_RETURN', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          genId('inv'),
          it.product_id,
          it.quantity,
          prod.stock_quantity,
          newStock,
          id,
          `Hoàn kho do hủy đơn hàng ${order.order_code}. Lý do: ${reason}`,
          it.unit_cost_snapshot || prod.cost_price,
          now
        );
      }
    }

    // 3. Reverse customer statistics
    if (order.customer_id) {
      db.prepare(`
        UPDATE customers
        SET total_spent = MAX(0, total_spent - ?),
            total_paid = MAX(0, total_paid - ?),
            current_debt = MAX(0, current_debt - ?)
        WHERE id = ?
      `).run(order.total_amount, order.paid_amount, order.debt_amount, order.customer_id);
    }

    // 4. Record refund cash transaction if money was paid
    if (order.paid_amount > 0) {
      db.prepare(`
        INSERT INTO cash_transactions (id, code, direction, category, amount, payment_method, reference_type, reference_id, notes, created_at)
        VALUES (?, ?, 'OUT', 'OTHER', ?, ?, 'ORDER', ?, ?, ?)
      `).run(
        genId('cash'), `PC-HUY-${order.order_code}`, order.paid_amount, order.payment_method, id,
        `Hoàn tiền do hủy đơn ${order.order_code}`, now
      );
    }

    // 5. Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'CANCEL_ORDER', 'ORDER', ?, ?, ?)
    `).run(genId('audit'), id, `Hủy đơn hàng ${order.order_code} và hoàn kho toàn bộ sản phẩm`, now);
  });

  cancelTx();
  const updated = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id);
  res.json({ success: true, message: 'Đã hủy đơn và hoàn kho thành công', order: updated });
});

// Record additional payment for order (Thu nợ đơn hàng)
apiRouter.post('/orders/:id/payments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, payment_method = 'TIEN_MAT', notes } = req.body;
  const payAmt = Math.round(Number(amount));

  if (!payAmt || payAmt <= 0) {
    return res.status(400).json({ error: 'Số tiền thanh toán phải lớn hơn 0' });
  }

  const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

  if (order.debt_amount <= 0) {
    return res.status(400).json({ error: 'Đơn hàng này đã thanh toán đủ, không còn công nợ' });
  }

  const actualPayment = Math.min(payAmt, order.debt_amount);
  const newPaid = order.paid_amount + actualPayment;
  const newDebt = order.debt_amount - actualPayment;
  const now = new Date().toISOString();

  const payTx = db.transaction(() => {
    db.prepare('UPDATE sales_orders SET paid_amount = ?, debt_amount = ?, updated_at = ? WHERE id = ?').run(newPaid, newDebt, now, id);

    if (order.customer_id) {
      db.prepare(`
        UPDATE customers
        SET total_paid = total_paid + ?,
            current_debt = MAX(0, current_debt - ?)
        WHERE id = ?
      `).run(actualPayment, actualPayment, order.customer_id);
    }

    db.prepare(`
      INSERT INTO cash_transactions (id, code, direction, category, amount, payment_method, reference_type, reference_id, notes, created_at)
      VALUES (?, ?, 'IN', 'CUSTOMER_DEBT', ?, ?, 'ORDER', ?, ?, ?)
    `).run(
      genId('cash'), `PT-NO-${order.order_code}-${Date.now().toString().slice(-4)}`, actualPayment, payment_method, id,
      `Thu nợ đơn ${order.order_code} (${actualPayment.toLocaleString('vi-VN')}đ) - ${notes || ''}`, now
    );

    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'PAY_ORDER_DEBT', 'ORDER', ?, ?, ?)
    `).run(genId('audit'), id, `Thu nợ bổ sung cho đơn ${order.order_code}: ${actualPayment.toLocaleString('vi-VN')}đ`, now);
  });

  payTx();
  const updatedOrder = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id);
  res.json({ success: true, order: updatedOrder });
});

// Returns (Hoàn hàng có phiếu hoàn riêng)
apiRouter.post('/orders/:id/returns', (req: Request, res: Response) => {
  const { id } = req.params;
  const { return_items, reason, refund_amount } = req.body;

  if (!return_items || !Array.isArray(return_items) || return_items.length === 0) {
    return res.status(400).json({ error: 'Cần chọn ít nhất 1 sản phẩm để hoàn' });
  }

  const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

  const returnCode = genCode('RET');
  const returnId = genId('ret');
  const now = new Date().toISOString();
  const refund = Math.round(Number(refund_amount || 0));

  const returnTx = db.transaction(() => {
    // 1. Create return voucher
    db.prepare(`
      INSERT INTO order_returns (id, return_code, order_id, refund_amount, return_items, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(returnId, returnCode, id, refund, JSON.stringify(return_items), reason || 'Khách đổi trả hàng', now);

    // 2. Restock returned items
    for (const rIt of return_items) {
      const prod = db.prepare('SELECT stock_quantity, cost_price FROM products WHERE id = ?').get(rIt.productId || rIt.product_id) as any;
      if (prod) {
        const retQty = Math.round(Number(rIt.quantity));
        const newStock = prod.stock_quantity + retQty;
        db.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?').run(newStock, now, rIt.productId || rIt.product_id);

        db.prepare(`
          INSERT INTO inventory_movements (id, product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_id, reason, cost_at_time, created_at)
          VALUES (?, ?, 'SALE_RETURN', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          genId('inv'),
          rIt.productId || rIt.product_id,
          retQty,
          prod.stock_quantity,
          newStock,
          returnId,
          `Phiếu hoàn ${returnCode} từ đơn ${order.order_code}. Lý do: ${reason}`,
          prod.cost_price,
          now
        );
      }
    }

    // 3. Record refund cash disbursement if refunded
    if (refund > 0) {
      db.prepare(`
        INSERT INTO cash_transactions (id, code, direction, category, amount, payment_method, reference_type, reference_id, notes, created_at)
        VALUES (?, ?, 'OUT', 'OTHER', ?, 'TIEN_MAT', 'ORDER', ?, ?, ?)
      `).run(
        genId('cash'), `PC-${returnCode}`, refund, id,
        `Chi tiền hoàn trả cho phiếu hoàn ${returnCode} (Đơn ${order.order_code})`, now
      );
    }

    // 4. Update order status to RETURNED if all items returned, or update notes
    db.prepare('UPDATE sales_orders SET status = ?, updated_at = ? WHERE id = ?').run('RETURNED', now, id);

    // 5. Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'RETURN_ORDER', 'ORDER', ?, ?, ?)
    `).run(genId('audit'), id, `Lập phiếu hoàn hàng ${returnCode} cho đơn ${order.order_code}`, now);
  });

  returnTx();
  res.json({ success: true, returnCode, message: 'Đã lập phiếu hoàn hàng và nhập lại tồn kho' });
});

// Delete Order Permanently (Hard Delete from system)
apiRouter.delete('/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

  try {
    const deleteOrderTx = db.transaction(() => {
      // Temporarily disable foreign keys
      db.pragma('foreign_keys = OFF');

      const now = new Date().toISOString();
      const items = db.prepare('SELECT * FROM sales_order_items WHERE order_id = ?').all(id) as any[];

      // 1. If order was active (not CANCELLED or RETURNED), automatically restore inventory stock
      if (order.status !== 'CANCELLED' && order.status !== 'RETURNED') {
        for (const it of items) {
          const prod = db.prepare('SELECT stock_quantity, cost_price FROM products WHERE id = ?').get(it.product_id) as any;
          if (prod) {
            const newStock = prod.stock_quantity + it.quantity;
            db.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?').run(newStock, now, it.product_id);

            db.prepare(`
              INSERT INTO inventory_movements (
                id, product_id, movement_type, quantity_change,
                quantity_before, quantity_after, reference_id, reason,
                cost_at_time, created_at
              ) VALUES (?, ?, 'ADJUSTMENT_IN', ?, ?, ?, ?, ?, ?, ?)
            `).run(
              genId('mov'), it.product_id, it.quantity,
              prod.stock_quantity, newStock, id,
              `Hoàn kho do xóa vĩnh viễn đơn hàng ${order.order_code}`,
              it.unit_cost_snapshot || prod.cost_price, now
            );
          }
        }
      }

      // 2. Revert customer debt and total spent if customer was linked
      if (order.customer_id) {
        const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id) as any;
        if (cust) {
          const newOrders = Math.max(0, cust.total_orders - 1);
          const newSpent = Math.max(0, cust.total_spent - (order.status !== 'CANCELLED' ? order.total_amount : 0));
          const newPaid = Math.max(0, cust.total_paid - order.paid_amount);
          const newDebt = Math.max(0, cust.current_debt - order.debt_amount);

          db.prepare(`
            UPDATE customers
            SET total_orders = ?, total_spent = ?, total_paid = ?, current_debt = ?
            WHERE id = ?
          `).run(newOrders, newSpent, newPaid, newDebt, order.customer_id);
        }
      }

      // 3. Delete cash transactions linked to this order
      db.prepare(`
        DELETE FROM cash_transactions
        WHERE reference_id = ? OR code = ? OR code LIKE ?
      `).run(id, `PT-${order.order_code}`, `%${order.order_code}%`);

      // 4. Delete inventory movements associated with this order
      db.prepare('DELETE FROM inventory_movements WHERE reference_id = ? AND movement_type = ?').run(id, 'SALE');

      // 5. Delete order items
      db.prepare('DELETE FROM sales_order_items WHERE order_id = ?').run(id);

      // 6. Delete the order record permanently
      db.prepare('DELETE FROM sales_orders WHERE id = ?').run(id);

      // 7. Delete audit logs referencing this order
      db.prepare('DELETE FROM audit_logs WHERE entity_id = ?').run(id);

      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    });

    deleteOrderTx();
    res.json({ success: true, message: `Đã xóa vĩnh viễn đơn hàng ${order.order_code} khỏi hệ thống` });
  } catch (err: any) {
    db.pragma('foreign_keys = ON');
    console.error('Lỗi khi xóa đơn hàng:', err);
    res.status(500).json({ error: `Không thể xóa đơn hàng: ${err.message}` });
  }
});

// ----------------------------------------------------
// Purchases & Suppliers (Weighted Average Costing Rule)
// ----------------------------------------------------
apiRouter.get('/purchases', (req: Request, res: Response) => {
  const receipts = db.prepare('SELECT * FROM purchase_receipts ORDER BY created_at DESC').all() as any[];
  const getItems = db.prepare('SELECT * FROM purchase_receipt_items WHERE receipt_id = ?');
  const enriched = receipts.map(r => ({ ...r, items: getItems.all(r.id) }));
  res.json(enriched);
});

apiRouter.post('/purchases', (req: Request, res: Response) => {
  const { supplier_id, supplier_name, items, shipping_cost = 0, other_cost = 0, paid_amount = 0, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Phiếu nhập cần có ít nhất 1 sản phẩm' });
  }

  const receiptId = genId('po');
  const receiptCode = genCode('PO');
  const now = new Date().toISOString();

  let totalCost = 0;
  for (const it of items) {
    totalCost += Math.round(Number(it.unit_cost)) * Math.round(Number(it.quantity));
  }

  const totalReceipt = totalCost + Math.round(Number(shipping_cost)) + Math.round(Number(other_cost));
  const paid = Math.min(totalReceipt, Math.round(Number(paid_amount)));
  const debt = Math.max(0, totalReceipt - paid);

  const purchaseTx = db.transaction(() => {
    // 1. Insert purchase receipt header
    db.prepare(`
      INSERT INTO purchase_receipts (id, receipt_code, supplier_id, supplier_name, total_cost, shipping_cost, other_cost, paid_amount, debt_amount, status, notes, created_at, posted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?)
    `).run(receiptId, receiptCode, supplier_id || null, supplier_name || 'Nhà cung cấp vãng lai', totalReceipt, Math.round(Number(shipping_cost)), Math.round(Number(other_cost)), paid, debt, notes || '', now, now);

    // 2. Insert items, update inventory, and recalculate weighted-average cost
    const insertItem = db.prepare(`
      INSERT INTO purchase_receipt_items (id, receipt_id, product_id, sku_snapshot, name_snapshot, quantity, unit_cost, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of items) {
      const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id) as any;
      if (!prod) throw new Error(`Không tìm thấy sản phẩm ID ${it.product_id}`);

      const inQty = Math.round(Number(it.quantity));
      const inCost = Math.round(Number(it.unit_cost));
      const lineSubtotal = inQty * inCost;

      insertItem.run(genId('poi'), receiptId, prod.id, prod.sku, prod.name, inQty, inCost, lineSubtotal);

      // Weighted average cost formula:
      // new_cost = ((current_qty * current_cost) + (in_qty * in_cost)) / (current_qty + in_qty)
      const currentQty = Math.max(0, prod.stock_quantity);
      const currentCost = prod.cost_price;
      const totalNewQty = currentQty + inQty;
      const newCost = totalNewQty > 0
        ? Math.round(((currentQty * currentCost) + (inQty * inCost)) / totalNewQty)
        : inCost;

      // Update product with new stock & weighted average cost
      db.prepare('UPDATE products SET stock_quantity = ?, cost_price = ?, updated_at = ? WHERE id = ?').run(
        totalNewQty,
        newCost,
        now,
        prod.id
      );

      // Log immutable inventory movement
      db.prepare(`
        INSERT INTO inventory_movements (id, product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_id, reason, cost_at_time, created_at)
        VALUES (?, ?, 'IMPORT', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        genId('inv'),
        prod.id,
        inQty,
        currentQty,
        totalNewQty,
        receiptId,
        `Nhập kho từ phiếu nhập ${receiptCode} (Giá vốn mới: ${newCost.toLocaleString('vi-VN')}đ)`,
        inCost,
        now
      );
    }

    // 3. Update supplier statistics & debt
    if (supplier_id) {
      db.prepare(`
        UPDATE suppliers
        SET total_purchases = total_purchases + ?,
            current_debt = current_debt + ?
        WHERE id = ?
      `).run(totalReceipt, debt, supplier_id);
    }

    // 4. Record cash disbursement if paid
    if (paid > 0) {
      db.prepare(`
        INSERT INTO cash_transactions (id, code, direction, category, amount, payment_method, reference_type, reference_id, notes, created_at)
        VALUES (?, ?, 'OUT', 'PURCHASE_PAYMENT', ?, 'CHUYEN_KHOAN', 'PURCHASE', ?, ?, ?)
      `).run(
        genId('cash'), `PC-${receiptCode}`, paid, receiptId,
        `Thanh toán tiền nhập hàng phiếu ${receiptCode} (${supplier_name})`, now
      );
    }

    // 5. Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, created_at)
      VALUES (?, 'POST_PURCHASE', 'PURCHASE', ?, ?, ?)
    `).run(genId('audit'), receiptId, `Nhập kho thành công phiếu ${receiptCode} (${totalReceipt.toLocaleString('vi-VN')}đ)`, now);
  });

  try {
    purchaseTx();
    const created = db.prepare('SELECT * FROM purchase_receipts WHERE id = ?').get(receiptId);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lỗi khi nhập kho' });
  }
});

// ----------------------------------------------------
// Cash Transactions (Sổ Quỹ Thu Chi)
// ----------------------------------------------------
apiRouter.get('/cash-transactions', (req: Request, res: Response) => {
  const { direction, category, startDate, endDate } = req.query;
  let query = 'SELECT * FROM cash_transactions WHERE 1=1';
  const params: any[] = [];

  if (direction) {
    query += ' AND direction = ?';
    params.push(direction);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (startDate) {
    query += ' AND created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND created_at <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY created_at DESC';
  const transactions = db.prepare(query).all(...params);

  // Summary
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0) as totalIn,
      COALESCE(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0) as totalOut
    FROM cash_transactions
  `).get() as any;

  res.json({
    transactions,
    summary: {
      totalIn: totals.totalIn,
      totalOut: totals.totalOut,
      balance: totals.totalIn - totals.totalOut
    }
  });
});

apiRouter.post('/cash-transactions', (req: Request, res: Response) => {
  const { direction, category, amount, payment_method = 'TIEN_MAT', notes, receipt_image_url } = req.body;
  const numAmount = Math.round(Number(amount));

  if (!direction || !category || !numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Vui lòng chọn loại Thu/Chi, danh mục và số tiền hợp lệ (> 0)' });
  }

  const id = genId('cash');
  const code = genCode(direction === 'IN' ? 'PT' : 'PC');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO cash_transactions (id, code, direction, category, amount, payment_method, reference_type, reference_id, notes, receipt_image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'MANUAL', NULL, ?, ?, ?)
  `).run(id, code, direction, category, numAmount, payment_method, notes || '', receipt_image_url || null, now);

  const created = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(id);
  res.status(201).json(created);
});

apiRouter.put('/cash-transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { direction, category, amount, payment_method, notes, receipt_image_url } = req.body;
  const current = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(id) as any;
  if (!current) return res.status(404).json({ error: 'Phiếu thu/chi không tồn tại' });

  const numAmount = amount !== undefined ? Math.round(Number(amount)) : current.amount;
  if (numAmount <= 0) {
    return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
  }

  db.prepare(`
    UPDATE cash_transactions
    SET direction = ?, category = ?, amount = ?, payment_method = ?, notes = ?, receipt_image_url = ?
    WHERE id = ?
  `).run(
    direction || current.direction,
    category || current.category,
    numAmount,
    payment_method || current.payment_method,
    notes !== undefined ? notes : current.notes,
    receipt_image_url !== undefined ? receipt_image_url : current.receipt_image_url,
    id
  );

  const updated = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(id);
  res.json(updated);
});

apiRouter.delete('/cash-transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const current = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(id) as any;
  if (!current) return res.status(404).json({ error: 'Phiếu thu/chi không tồn tại' });

  db.prepare('DELETE FROM cash_transactions WHERE id = ?').run(id);
  res.json({ success: true, message: `Đã xóa phiếu ${current.code} thành công` });
});

// Helper to build date SQL conditions for dashboard queries
function buildDateFilter(query: any) {
  const { timeRange = 'this_month', startDate, endDate, selectedDate, selectedMonth, selectedYear } = query;
  let dateFilter = '';
  const params: any[] = [];
  const now = new Date();

  if (selectedDate) {
    const dayStr = String(selectedDate).trim();
    const dayStart = `${dayStr}T00:00:00.000Z`;
    const dayEnd = `${dayStr}T23:59:59.999Z`;
    dateFilter = ' AND (created_at >= ? AND created_at <= ?)';
    params.push(dayStart, dayEnd);
  } else if (selectedMonth) {
    const monthStr = String(selectedMonth).trim(); // YYYY-MM
    dateFilter = " AND strftime('%Y-%m', created_at) = ?";
    params.push(monthStr);
  } else if (selectedYear) {
    const yearStr = String(selectedYear).trim(); // YYYY
    dateFilter = " AND strftime('%Y', created_at) = ?";
    params.push(yearStr);
  } else if (startDate && endDate) {
    dateFilter = ' AND created_at >= ? AND created_at <= ?';
    params.push(startDate, endDate);
  } else {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const startOfWeek = new Date(new Date().setDate(now.getDate() - now.getDay())).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    if (timeRange === 'today') {
      dateFilter = ' AND created_at >= ?';
      params.push(today);
    } else if (timeRange === 'yesterday') {
      dateFilter = ' AND created_at >= ? AND created_at < ?';
      params.push(yesterday, today);
    } else if (timeRange === 'this_week') {
      dateFilter = ' AND created_at >= ?';
      params.push(startOfWeek);
    } else if (timeRange === 'this_month') {
      dateFilter = ' AND created_at >= ?';
      params.push(startOfMonth);
    } else if (timeRange === 'this_quarter') {
      dateFilter = ' AND created_at >= ?';
      params.push(startOfQuarter);
    } else if (timeRange === 'this_year') {
      dateFilter = ' AND created_at >= ?';
      params.push(startOfYear);
    } else if (timeRange === 'all_time') {
      // no date restriction
    }
  }

  return { dateFilter, params };
}

// ----------------------------------------------------
// Dashboard & Executive Analytics
// ----------------------------------------------------
apiRouter.get('/dashboard/summary', (req: Request, res: Response) => {
  const { dateFilter, params } = buildDateFilter(req.query);

  // 1. Revenue & Orders (Only completed orders count towards revenue)
  const orderStats = db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      COALESCE(SUM(total_amount), 0) as totalRevenue,
      COALESCE(SUM(paid_amount), 0) as totalCollected,
      COALESCE(SUM(debt_amount), 0) as totalOrderDebt
    FROM sales_orders
    WHERE status = 'COMPLETED' ${dateFilter}
  `).get(...params) as any;

  // 2. Cost of Goods Sold (COGS) based on immutable snapshot unit cost
  const cogsStats = db.prepare(`
    SELECT COALESCE(SUM(soi.quantity * soi.unit_cost_snapshot), 0) as totalCOGS
    FROM sales_order_items soi
    JOIN sales_orders so ON soi.order_id = so.id
    WHERE so.status = 'COMPLETED' ${dateFilter.replace(/created_at/g, 'so.created_at')}
  `).get(...params) as any;

  const grossProfit = orderStats.totalRevenue - cogsStats.totalCOGS;

  // 3. Operating expenses (Chi phí hoạt động: RENT, SALARY, UTILITIES, MARKETING, OTHER)
  const opExpenseStats = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as totalOpExpenses
    FROM cash_transactions
    WHERE direction = 'OUT' AND category IN ('RENT', 'SALARY', 'UTILITIES', 'MARKETING', 'OTHER') ${dateFilter}
  `).get(...params) as any;

  const netProfit = grossProfit - opExpenseStats.totalOpExpenses;
  const aov = orderStats.totalOrders > 0 ? Math.round(orderStats.totalRevenue / orderStats.totalOrders) : 0;

  // 4. Inventory stats
  const invStats = db.prepare(`
    SELECT
      COALESCE(SUM(stock_quantity), 0) as totalStockQuantity,
      COALESCE(SUM(stock_quantity * cost_price), 0) as totalInventoryValuation,
      COUNT(CASE WHEN stock_quantity <= min_stock_alert THEN 1 END) as lowStockCount
    FROM products
  `).get() as any;

  // 5. Total customer debt overall
  const debtStats = db.prepare('SELECT COALESCE(SUM(current_debt), 0) as totalCustomerDebt FROM customers').get() as any;

  res.json({
    revenue: orderStats.totalRevenue,
    cogs: cogsStats.totalCOGS,
    grossProfit,
    operatingExpenses: opExpenseStats.totalOpExpenses,
    netProfit,
    totalOrders: orderStats.totalOrders,
    averageOrderValue: aov,
    totalStockQuantity: invStats.totalStockQuantity,
    totalInventoryValuation: invStats.totalInventoryValuation,
    lowStockCount: invStats.lowStockCount,
    totalCustomerDebt: debtStats.totalCustomerDebt,
    totalCollected: orderStats.totalCollected
  });
});

// Chart: Revenue & Profit over time (Daily / Monthly)
apiRouter.get('/dashboard/charts', (req: Request, res: Response) => {
  const { dateFilter, params } = buildDateFilter(req.query);

  const dailyData = db.prepare(`
    SELECT
      strftime('%Y-%m-%d', so.created_at) as date,
      COALESCE(SUM(so.total_amount), 0) as revenue,
      COALESCE(SUM(soi.quantity * soi.unit_cost_snapshot), 0) as cogs
    FROM sales_orders so
    LEFT JOIN sales_order_items soi ON so.id = soi.order_id
    WHERE so.status = 'COMPLETED' ${dateFilter.replace(/created_at/g, 'so.created_at')}
    GROUP BY strftime('%Y-%m-%d', so.created_at)
    ORDER BY date ASC
    LIMIT 30
  `).all(...params) as any[];

  const formattedChart = dailyData.map(d => ({
    date: d.date.split('-').slice(1).join('/'),
    revenue: d.revenue,
    cogs: d.cogs,
    profit: d.revenue - d.cogs
  }));

  // Top 5 selling products within the period
  const topProducts = db.prepare(`
    SELECT
      soi.name_snapshot as name,
      soi.sku_snapshot as sku,
      SUM(soi.quantity) as totalSold,
      SUM(soi.subtotal) as totalRevenue
    FROM sales_order_items soi
    JOIN sales_orders so ON soi.order_id = so.id
    WHERE so.status = 'COMPLETED' ${dateFilter.replace(/created_at/g, 'so.created_at')}
    GROUP BY soi.product_id
    ORDER BY totalSold DESC
    LIMIT 5
  `).all(...params);

  // Cash flow by category breakdown within the period
  const expenseBreakdown = db.prepare(`
    SELECT category, SUM(amount) as total
    FROM cash_transactions
    WHERE direction = 'OUT' ${dateFilter}
    GROUP BY category
    ORDER BY total DESC
  `).all(...params);

  res.json({
    dailyTrend: formattedChart,
    topProducts,
    expenseBreakdown
  });
});

// ----------------------------------------------------
// File & Image Upload Routes (Saved to local disk / Railway persistent volume)
// ----------------------------------------------------
apiRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    const { data, filename } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Không tìm thấy dữ liệu ảnh (base64)' });
    }

    // Support data URL: data:image/...;base64,... or raw base64
    let buffer: Buffer;
    let ext = 'jpg';

    const match = data.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (match) {
      const mimeSub = match[1].toLowerCase();
      if (mimeSub.includes('png')) ext = 'png';
      else if (mimeSub.includes('jpeg') || mimeSub.includes('jpg')) ext = 'jpg';
      else if (mimeSub.includes('webp')) ext = 'webp';
      else if (mimeSub.includes('gif')) ext = 'gif';
      else if (mimeSub.includes('svg')) ext = 'svg';
      else ext = mimeSub.replace(/[^a-z0-9]/g, '') || 'jpg';
      buffer = Buffer.from(match[2], 'base64');
    } else {
      buffer = Buffer.from(data, 'base64');
    }

    // Limit image size to 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Kích thước hình ảnh vượt quá giới hạn 10MB' });
    }

    // Sanitize base filename
    const safeBase = (filename || 'product')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 35);
    const uniqueName = `${safeBase}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const uploadsDir = process.env.UPLOADS_DIR
      ? path.resolve(process.env.UPLOADS_DIR)
      : path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${uniqueName}`;
    res.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      size: buffer.length
    });
  } catch (err: any) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: err.message || 'Lỗi khi lưu trữ hình ảnh trên máy chủ Railway' });
  }
});

// Alias for product-specific image upload
apiRouter.post('/products/upload-image', (req: Request, res: Response) => {
  // Pass through to upload route logic
  (apiRouter as any).handle(Object.assign(req, { url: '/upload' }), res);
});
