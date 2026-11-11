from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    material: Optional[str] = None
    series: Optional[str] = None
    manufacturer: Optional[str] = None
    color: Optional[str] = None
    unit: str = "Cuộn"
    cost_price: int = Field(default=0, ge=0)
    retail_price: int = Field(default=0, ge=0)
    stock_quantity: int = Field(default=0, ge=0)
    min_stock_alert: int = Field(default=5, ge=0)
    attributes: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class CustomerBase(BaseModel):
    name: str
    phone: str
    address: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    total_orders: int
    total_spent: int
    total_paid: int
    current_debt: int
    created_at: datetime
    class Config:
        from_attributes = True

class CartItemInput(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)

class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    shipping_address: Optional[str] = None
    items: List[CartItemInput]
    shipping_fee: int = 0
    paid_amount: Optional[int] = None
    payment_method: str = "TIEN_MAT"
    notes: Optional[str] = None
    idempotency_key: Optional[str] = None
    applied_promotion_id: Optional[str] = None

class StockAdjustmentInput(BaseModel):
    product_id: str
    new_quantity: int = Field(ge=0)
    reason: str

class CashTransactionCreate(BaseModel):
    direction: str # IN or OUT
    category: str
    amount: int = Field(gt=0)
    payment_method: str = "TIEN_MAT"
    notes: Optional[str] = None
    receipt_image_url: Optional[str] = None

class UploadImageRequest(BaseModel):
    data: str  # Base64 data URL or raw base64 string
    filename: Optional[str] = None

class UploadImageResponse(BaseModel):
    success: bool
    url: str
    filename: str
    size: int

