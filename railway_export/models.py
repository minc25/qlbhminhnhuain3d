import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, BigInteger, Integer, Float,
    Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from database import Base

def gen_uuid():
    return str(uuid.uuid4())

class AppUser(Base):
    __tablename__ = "app_users"
    id = Column(String, primary_key=True, default=gen_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), default="admin", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class AppSetting(Base):
    __tablename__ = "app_settings"
    id = Column(String, primary_key=True, default=gen_uuid)
    store_name = Column(String(255), nullable=False)
    store_phone = Column(String(50), nullable=False)
    store_address = Column(Text, nullable=False)
    store_email = Column(String(100))
    receipt_header = Column(Text)
    receipt_footer = Column(Text)
    tax_rate = Column(Float, default=0.0)
    currency = Column(String(10), default="VND")
    timezone = Column(String(50), default="Asia/Ho_Chi_Minh")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=gen_uuid)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    material = Column(String(100), index=True)
    series = Column(String(100))
    manufacturer = Column(String(100), index=True)
    color = Column(String(100), index=True)
    unit = Column(String(50), default="Cuộn", nullable=False)
    cost_price = Column(BigInteger, default=0, nullable=False)  # VND Integer BIGINT
    retail_price = Column(BigInteger, default=0, nullable=False) # VND Integer BIGINT
    stock_quantity = Column(Integer, default=0, nullable=False)
    min_stock_alert = Column(Integer, default=5, nullable=False)
    attributes = Column(Text) # JSON string
    image_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    movements = relationship("InventoryMovement", back_populates="product")
    order_items = relationship("SalesOrderItem", back_populates="product")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id = Column(String, primary_key=True, default=gen_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    movement_type = Column(String(50), nullable=False) # IMPORT, SALE, SALE_RETURN, ADJUSTMENT_IN, ADJUSTMENT_OUT
    quantity_change = Column(Integer, nullable=False)
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    reference_id = Column(String(100), index=True)
    reason = Column(Text)
    cost_at_time = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    product = relationship("Product", back_populates="movements")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), unique=True, nullable=False, index=True)
    address = Column(Text)
    notes = Column(Text)
    first_purchase_at = Column(DateTime)
    last_purchase_at = Column(DateTime)
    total_orders = Column(Integer, default=0, nullable=False)
    total_spent = Column(BigInteger, default=0, nullable=False)
    total_paid = Column(BigInteger, default=0, nullable=False)
    current_debt = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    orders = relationship("SalesOrder", back_populates="customer")

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(Text)
    tax_id = Column(String(50))
    total_purchases = Column(BigInteger, default=0, nullable=False)
    current_debt = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    receipts = relationship("PurchaseReceipt", back_populates="supplier")

class Promotion(Base):
    __tablename__ = "promotions"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=True)
    type = Column(String(50), nullable=False) # PERCENTAGE, FIXED_AMOUNT, TIER_QUANTITY, COMBO, BUY_X_GET_Y
    config = Column(Text, nullable=False) # JSON
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_stackable = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class SalesOrder(Base):
    __tablename__ = "sales_orders"
    id = Column(String, primary_key=True, default=gen_uuid)
    order_code = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    shipping_address = Column(Text)
    subtotal = Column(BigInteger, default=0, nullable=False)
    discount_amount = Column(BigInteger, default=0, nullable=False)
    applied_promotion_id = Column(String, ForeignKey("promotions.id"), nullable=True)
    shipping_fee = Column(BigInteger, default=0, nullable=False)
    total_amount = Column(BigInteger, default=0, nullable=False)
    paid_amount = Column(BigInteger, default=0, nullable=False)
    debt_amount = Column(BigInteger, default=0, nullable=False)
    payment_method = Column(String(50), default="TIEN_MAT", nullable=False)
    status = Column(String(50), default="COMPLETED", nullable=False, index=True)
    notes = Column(Text)
    idempotency_key = Column(String(100), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("SalesOrderItem", back_populates="order", cascade="all, delete-orphan")

class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"
    id = Column(String, primary_key=True, default=gen_uuid)
    order_id = Column(String, ForeignKey("sales_orders.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    sku_snapshot = Column(String(100), nullable=False)
    name_snapshot = Column(String(255), nullable=False)
    unit_cost_snapshot = Column(BigInteger, default=0, nullable=False)
    unit_price_snapshot = Column(BigInteger, default=0, nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(BigInteger, default=0, nullable=False)
    discount_amount = Column(BigInteger, default=0, nullable=False)

    order = relationship("SalesOrder", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class PurchaseReceipt(Base):
    __tablename__ = "purchase_receipts"
    id = Column(String, primary_key=True, default=gen_uuid)
    receipt_code = Column(String(50), unique=True, nullable=False, index=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    supplier_name = Column(String(255), nullable=False)
    total_cost = Column(BigInteger, default=0, nullable=False)
    shipping_cost = Column(BigInteger, default=0, nullable=False)
    other_cost = Column(BigInteger, default=0, nullable=False)
    paid_amount = Column(BigInteger, default=0, nullable=False)
    debt_amount = Column(BigInteger, default=0, nullable=False)
    status = Column(String(50), default="POSTED", nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    posted_at = Column(DateTime)

    supplier = relationship("Supplier", back_populates="receipts")
    items = relationship("PurchaseReceiptItem", cascade="all, delete-orphan")

class PurchaseReceiptItem(Base):
    __tablename__ = "purchase_receipt_items"
    id = Column(String, primary_key=True, default=gen_uuid)
    receipt_id = Column(String, ForeignKey("purchase_receipts.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    sku_snapshot = Column(String(100), nullable=False)
    name_snapshot = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(BigInteger, nullable=False)
    subtotal = Column(BigInteger, nullable=False)

class CashTransaction(Base):
    __tablename__ = "cash_transactions"
    id = Column(String, primary_key=True, default=gen_uuid)
    code = Column(String(50), unique=True, nullable=False, index=True)
    direction = Column(String(10), nullable=False) # IN, OUT
    category = Column(String(50), nullable=False, index=True)
    amount = Column(BigInteger, nullable=False)
    payment_method = Column(String(50), default="TIEN_MAT", nullable=False)
    reference_type = Column(String(50))
    reference_id = Column(String(100))
    notes = Column(Text)
    receipt_image_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=gen_uuid)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100))
    details = Column(Text)
    user_name = Column(String(100), default="Admin")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
