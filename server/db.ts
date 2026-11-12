import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'business_management.db');
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high-performance ACID operations
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- 1. App Users (Single Admin, internal use)
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- 2. App Settings
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      store_name TEXT NOT NULL,
      store_phone TEXT NOT NULL,
      store_address TEXT NOT NULL,
      store_email TEXT,
      receipt_header TEXT,
      receipt_footer TEXT,
      tax_rate REAL DEFAULT 0,
      currency TEXT DEFAULT 'VND',
      timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
      updated_at TEXT NOT NULL
    );

    -- 3. Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      material TEXT,
      series TEXT,
      manufacturer TEXT,
      color TEXT,
      unit TEXT NOT NULL DEFAULT 'Cuộn',
      cost_price INTEGER NOT NULL DEFAULT 0,
      retail_price INTEGER NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 5,
      attributes TEXT, -- JSON string
      image_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

    -- 4. Inventory Movements Ledger (Strictly Immutable)
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      movement_type TEXT NOT NULL, -- IMPORT, SALE, SALE_RETURN, ADJUSTMENT_IN, ADJUSTMENT_OUT
      quantity_change INTEGER NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      reference_id TEXT, -- order_id or purchase_id or adjustment_id
      reason TEXT,
      cost_at_time INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inv_product ON inventory_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_inv_date ON inventory_movements(created_at);

    -- 5. Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      address TEXT,
      notes TEXT,
      first_purchase_at TEXT,
      last_purchase_at TEXT,
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_spent INTEGER NOT NULL DEFAULT 0,
      total_paid INTEGER NOT NULL DEFAULT 0,
      current_debt INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    -- 6. Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      tax_id TEXT,
      total_purchases INTEGER NOT NULL DEFAULT 0,
      current_debt INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- 7. Promotions
    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      type TEXT NOT NULL, -- PERCENTAGE, FIXED_AMOUNT, TIER_QUANTITY, COMBO, BUY_X_GET_Y
      config TEXT NOT NULL, -- JSON
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_stackable INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- 8. Sales Orders
    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      order_code TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address TEXT,
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      applied_promotion_id TEXT,
      shipping_fee INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      debt_amount INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'TIEN_MAT', -- TIEN_MAT, CHUYEN_KHOAN, VI_DIEN_TU, CONG_NO
      status TEXT NOT NULL DEFAULT 'COMPLETED', -- DRAFT, CONFIRMED, PROCESSING, SHIPPING, COMPLETED, CANCELLED, RETURNED
      notes TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_orders_code ON sales_orders(order_code);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON sales_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON sales_orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_date ON sales_orders(created_at);

    -- 9. Sales Order Items (Immutable Snapshots)
    CREATE TABLE IF NOT EXISTS sales_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      sku_snapshot TEXT NOT NULL,
      name_snapshot TEXT NOT NULL,
      unit_cost_snapshot INTEGER NOT NULL DEFAULT 0,
      unit_price_snapshot INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL,
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_order_items_order ON sales_order_items(order_id);

    -- 10. Purchase Receipts
    CREATE TABLE IF NOT EXISTS purchase_receipts (
      id TEXT PRIMARY KEY,
      receipt_code TEXT UNIQUE NOT NULL,
      supplier_id TEXT REFERENCES suppliers(id),
      supplier_name TEXT NOT NULL,
      total_cost INTEGER NOT NULL DEFAULT 0,
      shipping_cost INTEGER NOT NULL DEFAULT 0,
      other_cost INTEGER NOT NULL DEFAULT 0,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      debt_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'POSTED', -- DRAFT, POSTED
      notes TEXT,
      created_at TEXT NOT NULL,
      posted_at TEXT
    );

    -- 11. Purchase Receipt Items
    CREATE TABLE IF NOT EXISTS purchase_receipt_items (
      id TEXT PRIMARY KEY,
      receipt_id TEXT NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      sku_snapshot TEXT NOT NULL,
      name_snapshot TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost INTEGER NOT NULL,
      subtotal INTEGER NOT NULL
    );

    -- 12. Cash Transactions (Sổ Quỹ Thu Chi)
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      direction TEXT NOT NULL, -- IN (Thu), OUT (Chi)
      category TEXT NOT NULL, -- SALES_PAYMENT, CUSTOMER_DEBT, PURCHASE_PAYMENT, SALARY, RENT, UTILITIES, MARKETING, OTHER
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'TIEN_MAT',
      reference_type TEXT, -- ORDER, PURCHASE, CUSTOMER, MANUAL
      reference_id TEXT,
      notes TEXT,
      receipt_image_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cash_date ON cash_transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_cash_cat ON cash_transactions(category);

    -- 13. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      user_name TEXT DEFAULT 'Admin',
      created_at TEXT NOT NULL
    );

    -- 14. Order Returns (Phiếu hoàn hàng)
    CREATE TABLE IF NOT EXISTS order_returns (
      id TEXT PRIMARY KEY,
      return_code TEXT UNIQUE NOT NULL,
      order_id TEXT NOT NULL REFERENCES sales_orders(id),
      refund_amount INTEGER NOT NULL DEFAULT 0,
      return_items TEXT NOT NULL, -- JSON array of { product_id, sku, name, quantity, unit_price }
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Safe migration: Add color column if not present in existing SQLite database
  try {
    db.prepare(`ALTER TABLE products ADD COLUMN color TEXT`).run();
  } catch {
    // Column already exists
  }

  // Populate color for sample products if null
  try {
    db.prepare(`UPDATE products SET color = 'Đỏ (Red)' WHERE sku = 'VL-PLA-SILK-RED' AND (color IS NULL OR color = '')`).run();
    db.prepare(`UPDATE products SET color = 'Vàng (Gold)' WHERE sku = 'VL-PLA-SILK-GOLD' AND (color IS NULL OR color = '')`).run();
    db.prepare(`UPDATE products SET color = 'Đen (Black)' WHERE sku = 'VL-PLA-MATTE-BLK' AND (color IS NULL OR color = '')`).run();
    db.prepare(`UPDATE products SET color = 'Trắng (White)' WHERE sku = 'VL-PLA-MATTE-WHT' AND (color IS NULL OR color = '')`).run();
    db.prepare(`UPDATE products SET color = 'Trong Suốt (Clear)' WHERE sku = 'SL-PETG-PRO-CLR' AND (color IS NULL OR color = '')`).run();
    db.prepare(`UPDATE products SET color = 'Xám (Grey)' WHERE sku = 'ES-ABS-PLUS-GRY' AND (color IS NULL OR color = '')`).run();
    db.prepare(`UPDATE products SET color = 'Bạc Thép (Silver)' WHERE sku = 'NZL-HS-04-BAMBU' AND (color IS NULL OR color = '')`).run();
    db.prepare(`UPDATE products SET color = 'Vàng PEI (Gold)' WHERE sku = 'ACC-PEI-PLATE-256' AND (color IS NULL OR color = '')`).run();
  } catch {
    // Ignore if table not ready
  }

  // Ensure products have high-fidelity local generated images
  db.prepare(`UPDATE products SET image_url = '/src/assets/images/filament_pla_red_1794400749382.jpg' WHERE sku IN ('VL-PLA-SILK-RED', 'VL-PLA-SILK-GOLD')`).run();
  db.prepare(`UPDATE products SET image_url = '/src/assets/images/filament_pla_black_1794400748718.jpg' WHERE sku IN ('VL-PLA-MATTE-BLK', 'VL-PLA-MATTE-WHT', 'SL-PETG-PRO-CLR', 'ES-ABS-PLUS-GRY')`).run();
  db.prepare(`UPDATE products SET image_url = '/src/assets/images/nozzle_hardened_steel_1794400749294.jpg' WHERE sku = 'NZL-HS-04-BAMBU'`).run();
  db.prepare(`UPDATE products SET image_url = '/src/assets/images/pei_build_plate_1794400749556.jpg' WHERE sku = 'ACC-PEI-PLATE-256'`).run();

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM app_users').get() as { count: number };
  if (userCount.count > 0) return; // Already seeded

  const now = new Date().toISOString();

  // 1. Seed Admin user
  db.prepare(`
    INSERT INTO app_users (id, username, password_hash, full_name, role, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('user-admin-1', 'admin', 'admin123_hash', 'Chủ Cửa Hàng (Admin)', 'admin', 1, now);

  // 2. Seed Settings
  db.prepare(`
    INSERT INTO app_settings (id, store_name, store_phone, store_address, store_email, receipt_header, receipt_footer, tax_rate, currency, timezone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'setting-default',
    '3D Tech & Filament Store',
    '0908 123 456',
    'Số 120 Đường Hoàng Văn Thụ, Phường 9, Quận Phú Nhuận, TP.HCM',
    'contact@3dtechstore.vn',
    'CHUYÊN CUNG CẤP VẬT LIỆU IN 3D & LINH KIỆN CAO CẤP',
    'Cảm ơn Quý khách! Đổi trả trong vòng 7 ngày nếu lỗi nhà sản xuất.',
    0,
    'VND',
    'Asia/Ho_Chi_Minh',
    now
  );

  // 3. Seed Suppliers
  const suppliers = [
    {
      id: 'sup-1',
      name: 'Công ty TNHH Nhập Khẩu Veelaine VN',
      phone: '0912 345 678',
      address: 'KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM',
      tax_id: '0314567890',
      total_purchases: 32500000,
      current_debt: 4500000,
      created_at: now
    },
    {
      id: 'sup-2',
      name: 'Sunlu & eSun Official Distributor',
      phone: '0988 776 655',
      address: 'Lô B2 Đường số 7, KCN Vĩnh Lộc, Bình Chánh, TP.HCM',
      tax_id: '0315998877',
      total_purchases: 18200000,
      current_debt: 0,
      created_at: now
    },
    {
      id: 'sup-3',
      name: 'Linh Kiện Cơ Điện Tử Precision Tech',
      phone: '0933 112 233',
      address: '45 Tạ Quang Bửu, Quận 8, TP.HCM',
      tax_id: '0316445566',
      total_purchases: 9400000,
      current_debt: 1200000,
      created_at: now
    }
  ];

  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (id, name, phone, address, tax_id, total_purchases, current_debt, created_at)
    VALUES (@id, @name, @phone, @address, @tax_id, @total_purchases, @current_debt, @created_at)
  `);
  for (const s of suppliers) insertSupplier.run(s);

  // 4. Seed Products (3D Printing Materials & Tech Goods - matching prompt specs)
  const products = [
    {
      id: 'prod-1',
      sku: 'VL-PLA-SILK-RED',
      name: 'PLA Silk Veelaine Đỏ (1.75mm 1kg)',
      description: 'Nhựa in 3D PLA Silk bề mặt bóng ánh kim lụa, độ dẻo dai tốt, dễ in, chuẩn cuộn 1kg.',
      material: 'PLA',
      series: 'Silk Metallic',
      manufacturer: 'Veelaine',
      unit: 'Cuộn',
      cost_price: 150000,
      retail_price: 195000,
      stock_quantity: 35,
      min_stock_alert: 10,
      attributes: JSON.stringify({ color: 'Red Silk', diameter: '1.75mm', weight: '1kg', temp: '200-220C' }),
      image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
      created_at: now,
      updated_at: now
    },
    {
      id: 'prod-2',
      sku: 'VL-PLA-SILK-GOLD',
      name: 'PLA Silk Veelaine Vàng Ánh Kim (1.75mm 1kg)',
      description: 'Nhựa in 3D bề mặt ánh kim vàng hoàng gia sang trọng, không nghẹt đầu đùn.',
      material: 'PLA',
      series: 'Silk Metallic',
      manufacturer: 'Veelaine',
      unit: 'Cuộn',
      cost_price: 155000,
      retail_price: 210000,
      stock_quantity: 28,
      min_stock_alert: 8,
      attributes: JSON.stringify({ color: 'Gold Silk', diameter: '1.75mm', weight: '1kg', temp: '205-225C' }),
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      created_at: now,
      updated_at: now
    },
    {
      id: 'prod-3',
      sku: 'VL-PLA-MATTE-BLK',
      name: 'PLA Matte Veelaine Đen Nhám (1.75mm 1kg)',
      description: 'Nhựa in bề mặt nhám mịn giấu đường lớp layer cực đỉnh, thích hợp mô hình kiến trúc, decor.',
      material: 'PLA',
      series: 'Matte Premium',
      manufacturer: 'Veelaine',
      unit: 'Cuộn',
      cost_price: 145000,
      retail_price: 185000,
      stock_quantity: 42,
      min_stock_alert: 15,
      attributes: JSON.stringify({ color: 'Matte Black', diameter: '1.75mm', weight: '1kg', temp: '195-215C' }),
      image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80',
      created_at: now,
      updated_at: now
    },
    {
      id: 'prod-4',
      sku: 'VL-PLA-MATTE-WHT',
      name: 'PLA Matte Veelaine Trắng Sứ (1.75mm 1kg)',
      description: 'Màu trắng mờ thuần khiết, ăn màu sơn lót cực tốt, chống co ngót.',
      material: 'PLA',
      series: 'Matte Premium',
      manufacturer: 'Veelaine',
      unit: 'Cuộn',
      cost_price: 145000,
      retail_price: 185000,
      stock_quantity: 6, // Low stock alert demo
      min_stock_alert: 15,
      attributes: JSON.stringify({ color: 'Matte White', diameter: '1.75mm', weight: '1kg', temp: '195-215C' }),
      image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
      created_at: now,
      updated_at: now
    },
    {
      id: 'prod-5',
      sku: 'SL-PETG-PRO-CLR',
      name: 'PETG Pro Sunlu Trong Suốt (1.75mm 1kg)',
      description: 'Độ bền cơ tính cao, kháng nước, chịu nhiệt lên đến 75C, độ truyền sáng tốt.',
      material: 'PETG',
      series: 'Pro Industrial',
      manufacturer: 'Sunlu',
      unit: 'Cuộn',
      cost_price: 160000,
      retail_price: 215000,
      stock_quantity: 18,
      min_stock_alert: 10,
      attributes: JSON.stringify({ color: 'Clear Transparent', diameter: '1.75mm', weight: '1kg', temp: '230-250C' }),
      image_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
      created_at: now,
      updated_at: now
    },
    {
      id: 'prod-6',
      sku: 'ES-ABS-PLUS-GRY',
      name: 'eSun ABS+ Chống Cong Vênh Xám (1.75mm 1kg)',
      description: 'Công thức biến tính chống cong vênh mép bàn in, chịu va đập và mài mòn cao.',
      material: 'ABS',
      series: 'ABS Plus',
      manufacturer: 'eSun',
      unit: 'Cuộn',
      cost_price: 175000,
      retail_price: 235000,
      stock_quantity: 4, // Low stock
      min_stock_alert: 10,
      attributes: JSON.stringify({ color: 'Gray', diameter: '1.75mm', weight: '1kg', temp: '240-260C' }),
      image_url: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&auto=format&fit=crop&q=80',
      created_at: now,
      updated_at: now
    },
    {
      id: 'prod-7',
      sku: 'NZL-HS-04-BAMBU',
      name: 'Đầu Phun Thép Tôi Hardened Steel 0.4mm Bambu Lab',
      description: 'Chuyên in vật liệu pha sợi carbon CF, thủy tinh GF và phát sáng dạ quang.',
      material: 'Steel',
      series: 'High Flow',
      manufacturer: 'Precision Tech',
      unit: 'Cái',
      cost_price: 90000,
      retail_price: 145000,
      stock_quantity: 25,
      min_stock_alert: 5,
      attributes: JSON.stringify({ size: '0.4mm', thread: 'M6', hardness: 'HRC 60+' }),
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      created_at: now,
      updated_at: now
    },
    {
      id: 'prod-8',
      sku: 'ACC-PEI-PLATE-256',
      name: 'Bàn In Nam Châm PEI Hai Mặt Nhám 257x257mm',
      description: 'Bề mặt phủ hạt PEI vàng gold bám dính cực chắc khi nóng, gỡ mô hình dễ dàng khi nguội.',
      material: 'Spring Steel / PEI',
      series: 'Accessories',
      manufacturer: 'Precision Tech',
      unit: 'Tấm',
      cost_price: 220000,
      retail_price: 320000,
      stock_quantity: 12,
      min_stock_alert: 5,
      attributes: JSON.stringify({ dimension: '257x257mm', coating: 'Textured PEI' }),
      image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80',
      created_at: now,
      updated_at: now
    }
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (id, sku, name, description, material, series, manufacturer, unit, cost_price, retail_price, stock_quantity, min_stock_alert, attributes, image_url, created_at, updated_at)
    VALUES (@id, @sku, @name, @description, @material, @series, @manufacturer, @unit, @cost_price, @retail_price, @stock_quantity, @min_stock_alert, @attributes, @image_url, @created_at, @updated_at)
  `);

  const insertMovement = db.prepare(`
    INSERT INTO inventory_movements (id, product_id, movement_type, quantity_change, quantity_before, quantity_after, reference_id, reason, cost_at_time, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    insertProduct.run(p);
    // Initial movement log
    insertMovement.run(
      `inv-init-${p.sku}`,
      p.id,
      'IMPORT',
      p.stock_quantity,
      0,
      p.stock_quantity,
      'INITIAL_SEED',
      'Khởi tạo số dư kho ban đầu',
      p.cost_price,
      now
    );
  }

  // 5. Seed Customers
  const customers = [
    {
      id: 'cust-1',
      name: 'Anh Trần Minh Tuấn (MakerLab)',
      phone: '0903123456',
      address: '42 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP.HCM',
      notes: 'Khách VIP xưởng in mô hình 3D, lấy hàng định kỳ',
      first_purchase_at: '2026-10-15T08:30:00Z',
      last_purchase_at: '2026-11-09T14:20:00Z',
      total_orders: 8,
      total_spent: 6850000,
      total_paid: 5850000,
      current_debt: 1000000, // 1.000.000 VND debt
      created_at: '2026-10-15T08:00:00Z'
    },
    {
      id: 'cust-2',
      name: 'Chị Lê Thị Bích Trâm',
      phone: '0977889900',
      address: 'Tòa Landmark 2, KĐT Vinhomes Central Park, Bình Thạnh, TP.HCM',
      notes: 'In chậu cây & decor gia đình',
      first_purchase_at: '2026-10-20T10:00:00Z',
      last_purchase_at: '2026-11-05T16:45:00Z',
      total_orders: 3,
      total_spent: 1250000,
      total_paid: 1250000,
      current_debt: 0,
      created_at: '2026-10-20T09:30:00Z'
    },
    {
      id: 'cust-3',
      name: 'Khoa Cơ Khí ĐH Bách Khoa',
      phone: '0918765432',
      address: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM',
      notes: 'Đồ án sinh viên, yêu cầu hóa đơn và biên nhận',
      first_purchase_at: '2026-11-01T09:15:00Z',
      last_purchase_at: '2026-11-10T11:30:00Z',
      total_orders: 2,
      total_spent: 2450000,
      total_paid: 1500000,
      current_debt: 950000,
      created_at: '2026-11-01T09:00:00Z'
    }
  ];

  const insertCust = db.prepare(`
    INSERT INTO customers (id, name, phone, address, notes, first_purchase_at, last_purchase_at, total_orders, total_spent, total_paid, current_debt, created_at)
    VALUES (@id, @name, @phone, @address, @notes, @first_purchase_at, @last_purchase_at, @total_orders, @total_spent, @total_paid, @current_debt, @created_at)
  `);
  for (const c of customers) insertCust.run(c);

  // 6. Seed Promotions (5 specific types from prompt)
  const promotions = [
    {
      id: 'promo-1',
      name: 'Giảm 10% Cho Toàn Bộ Đơn Hàng Trên 1 Triệu',
      code: 'SALE10',
      type: 'PERCENTAGE',
      config: JSON.stringify({ percentage: 10, min_order_amount: 1000000, max_discount: 200000 }),
      start_date: '2026-11-01T00:00:00Z',
      end_date: '2026-11-30T23:59:59Z',
      is_active: 1,
      is_stackable: 0,
      created_at: now
    },
    {
      id: 'promo-2',
      name: 'Giảm Ngay 5.000đ Mỗi Cuộn',
      code: 'DISC5K',
      type: 'FIXED_AMOUNT',
      config: JSON.stringify({ fixed_discount_per_unit: 5000, apply_all_units: true }),
      start_date: '2026-11-01T00:00:00Z',
      end_date: '2026-11-30T23:59:59Z',
      is_active: 1,
      is_stackable: 1,
      created_at: now
    },
    {
      id: 'promo-3',
      name: 'Mua Từ 5 Cuộn Giảm 50.000đ',
      code: 'VOL5CUON',
      type: 'TIER_QUANTITY',
      config: JSON.stringify({ min_quantity: 5, discount_amount: 50000 }),
      start_date: '2026-11-01T00:00:00Z',
      end_date: '2026-12-31T23:59:59Z',
      is_active: 1,
      is_stackable: 0,
      created_at: now
    },
    {
      id: 'promo-4',
      name: 'Combo 5 Cuộn PLA Đồng Giá 900.000đ',
      code: 'COMBO900K',
      type: 'COMBO',
      config: JSON.stringify({ required_quantity: 5, combo_fixed_price: 900000, allowed_materials: ['PLA'] }),
      start_date: '2026-11-01T00:00:00Z',
      end_date: '2026-11-30T23:59:59Z',
      is_active: 1,
      is_stackable: 0,
      created_at: now
    },
    {
      id: 'promo-5',
      name: 'Chương Trình Mua 5 Tặng 1 (Buy 5 Get 1)',
      code: 'BUY5GET1',
      type: 'BUY_X_GET_Y',
      config: JSON.stringify({ buy_qty: 5, get_qty: 1 }),
      start_date: '2026-11-01T00:00:00Z',
      end_date: '2026-12-31T23:59:59Z',
      is_active: 1,
      is_stackable: 0,
      created_at: now
    }
  ];

  const insertPromo = db.prepare(`
    INSERT INTO promotions (id, name, code, type, config, start_date, end_date, is_active, is_stackable, created_at)
    VALUES (@id, @name, @code, @type, @config, @start_date, @end_date, @is_active, @is_stackable, @created_at)
  `);
  for (const pr of promotions) insertPromo.run(pr);

  // 7. Seed Sample Orders with items snapshot & cash transactions
  const sampleOrders = [
    {
      id: 'ord-101',
      order_code: 'ORD-20261108-001',
      customer_id: 'cust-1',
      customer_name: 'Anh Trần Minh Tuấn (MakerLab)',
      customer_phone: '0903123456',
      shipping_address: '42 Nguyễn Thị Minh Khai, P. Bến Nghé, Q.1, TP.HCM',
      subtotal: 975000,
      discount_amount: 50000,
      applied_promotion_id: 'promo-3',
      shipping_fee: 30000,
      total_amount: 955000,
      paid_amount: 955000,
      debt_amount: 0,
      payment_method: 'CHUYEN_KHOAN',
      status: 'COMPLETED',
      notes: 'Giao trong giờ hành chính',
      created_at: '2026-11-08T09:15:00Z',
      updated_at: '2026-11-08T11:00:00Z',
      completed_at: '2026-11-08T11:00:00Z',
      items: [
        {
          id: 'item-101-1',
          product_id: 'prod-1',
          sku: 'VL-PLA-SILK-RED',
          name: 'PLA Silk Veelaine Đỏ (1.75mm 1kg)',
          unit_cost: 150000,
          unit_price: 195000,
          quantity: 3,
          subtotal: 585000,
          discount_amount: 0
        },
        {
          id: 'item-101-2',
          product_id: 'prod-2',
          sku: 'VL-PLA-SILK-GOLD',
          name: 'PLA Silk Veelaine Vàng Ánh Kim (1.75mm 1kg)',
          unit_cost: 155000,
          unit_price: 210000,
          quantity: 2,
          subtotal: 420000,
          discount_amount: 50000
        }
      ]
    },
    {
      id: 'ord-102',
      order_code: 'ORD-20261109-002',
      customer_id: 'cust-2',
      customer_name: 'Chị Lê Thị Bích Trâm',
      customer_phone: '0977889900',
      shipping_address: 'Tòa Landmark 2, KĐT Vinhomes Central Park, Bình Thạnh',
      subtotal: 370000,
      discount_amount: 10000,
      applied_promotion_id: 'promo-2',
      shipping_fee: 20000,
      total_amount: 380000,
      paid_amount: 380000,
      debt_amount: 0,
      payment_method: 'TIEN_MAT',
      status: 'COMPLETED',
      notes: 'Đã nhận đủ hàng tại cửa hàng',
      created_at: '2026-11-09T14:20:00Z',
      updated_at: '2026-11-09T14:30:00Z',
      completed_at: '2026-11-09T14:30:00Z',
      items: [
        {
          id: 'item-102-1',
          product_id: 'prod-3',
          sku: 'VL-PLA-MATTE-BLK',
          name: 'PLA Matte Veelaine Đen Nhám (1.75mm 1kg)',
          unit_cost: 145000,
          unit_price: 185000,
          quantity: 2,
          subtotal: 370000,
          discount_amount: 10000
        }
      ]
    },
    {
      id: 'ord-103',
      order_code: 'ORD-20261110-003',
      customer_id: 'cust-1',
      customer_name: 'Anh Trần Minh Tuấn (MakerLab)',
      customer_phone: '0903123456',
      shipping_address: '42 Nguyễn Thị Minh Khai, P. Bến Nghé, Q.1, TP.HCM',
      subtotal: 1950000,
      discount_amount: 100000,
      applied_promotion_id: 'promo-1',
      shipping_fee: 0,
      total_amount: 1850000,
      paid_amount: 850000,
      debt_amount: 1000000, // Partial payment with debt
      payment_method: 'CHUYEN_KHOAN',
      status: 'COMPLETED',
      notes: 'Khách nợ 1.000.000đ hẹn thanh toán tuần sau',
      created_at: '2026-11-10T11:00:00Z',
      updated_at: '2026-11-10T11:15:00Z',
      completed_at: '2026-11-10T11:15:00Z',
      items: [
        {
          id: 'item-103-1',
          product_id: 'prod-1',
          sku: 'VL-PLA-SILK-RED',
          name: 'PLA Silk Veelaine Đỏ (1.75mm 1kg)',
          unit_cost: 150000,
          unit_price: 195000,
          quantity: 10,
          subtotal: 1950000,
          discount_amount: 100000
        }
      ]
    }
  ];

  const insertOrder = db.prepare(`
    INSERT INTO sales_orders (id, order_code, customer_id, customer_name, customer_phone, shipping_address, subtotal, discount_amount, applied_promotion_id, shipping_fee, total_amount, paid_amount, debt_amount, payment_method, status, notes, created_at, updated_at, completed_at)
    VALUES (@id, @order_code, @customer_id, @customer_name, @customer_phone, @shipping_address, @subtotal, @discount_amount, @applied_promotion_id, @shipping_fee, @total_amount, @paid_amount, @debt_amount, @payment_method, @status, @notes, @created_at, @updated_at, @completed_at)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO sales_order_items (id, order_id, product_id, sku_snapshot, name_snapshot, unit_cost_snapshot, unit_price_snapshot, quantity, subtotal, discount_amount)
    VALUES (@id, @order_id, @product_id, @sku_snapshot, @name_snapshot, @unit_cost_snapshot, @unit_price_snapshot, @quantity, @subtotal, @discount_amount)
  `);

  const insertCash = db.prepare(`
    INSERT INTO cash_transactions (id, code, direction, category, amount, payment_method, reference_type, reference_id, notes, created_at)
    VALUES (@id, @code, @direction, @category, @amount, @payment_method, @reference_type, @reference_id, @notes, @created_at)
  `);

  for (const o of sampleOrders) {
    insertOrder.run(o);
    for (const it of o.items) {
      insertOrderItem.run({
        id: it.id,
        order_id: o.id,
        product_id: it.product_id,
        sku_snapshot: it.sku,
        name_snapshot: it.name,
        unit_cost_snapshot: it.unit_cost,
        unit_price_snapshot: it.unit_price,
        quantity: it.quantity,
        subtotal: it.subtotal,
        discount_amount: it.discount_amount
      });
    }

    if (o.paid_amount > 0) {
      insertCash.run({
        id: `cash-ord-${o.id}`,
        code: `PT-${o.order_code}`,
        direction: 'IN',
        category: 'SALES_PAYMENT',
        amount: o.paid_amount,
        payment_method: o.payment_method,
        reference_type: 'ORDER',
        reference_id: o.id,
        notes: `Thu tiền đơn hàng ${o.order_code}`,
        created_at: o.created_at
      });
    }
  }

  // 8. Seed Sample Operational Cash Transactions (Thu Chi thực tế)
  const opExpenses = [
    {
      id: 'cash-exp-1',
      code: 'PC-20261101-01',
      direction: 'OUT',
      category: 'RENT',
      amount: 8000000,
      payment_method: 'CHUYEN_KHOAN',
      reference_type: 'MANUAL',
      reference_id: null,
      notes: 'Thanh toán tiền thuê mặt bằng kho tháng 11/2026',
      created_at: '2026-11-01T08:00:00Z'
    },
    {
      id: 'cash-exp-2',
      code: 'PC-20261105-02',
      direction: 'OUT',
      category: 'UTILITIES',
      amount: 1450000,
      payment_method: 'CHUYEN_KHOAN',
      reference_type: 'MANUAL',
      reference_id: null,
      notes: 'Tiền điện và internet kho hàng tháng 10',
      created_at: '2026-11-05T10:30:00Z'
    },
    {
      id: 'cash-exp-3',
      code: 'PC-20261107-03',
      direction: 'OUT',
      category: 'MARKETING',
      amount: 1200000,
      payment_method: 'CHUYEN_KHOAN',
      reference_type: 'MANUAL',
      reference_id: null,
      notes: 'Chạy quảng cáo Facebook Group In 3D Việt Nam',
      created_at: '2026-11-07T15:00:00Z'
    }
  ];

  for (const exp of opExpenses) insertCash.run(exp);

  // 9. Initial Audit Log
  db.prepare(`
    INSERT INTO audit_logs (id, action, entity_type, entity_id, details, user_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'audit-seed',
    'INIT_SYSTEM',
    'SYSTEM',
    'ALL',
    'Khởi tạo thành công cơ sở dữ liệu mẫu Business Management System',
    'System Bootstrapper',
    now
  );
}
