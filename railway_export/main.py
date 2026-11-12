import os
import base64
import re
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import engine, get_db, Base
import models
import schemas

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Business Management System API",
    version="1.0.0",
    description="Backend API for Business Management System (Inventory, POS & Finance)"
)

# Persistent Uploads Directory (Mountable to Railway Volume)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "Business Management System - FastAPI",
        "timestamp": datetime.utcnow().isoformat(),
        "timezone": "Asia/Ho_Chi_Minh"
    }

# ----------------- Products -----------------
@app.get("/api/v1/products", response_model=List[schemas.ProductResponse], tags=["Products"])
def list_products(
    search: Optional[str] = None,
    material: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Product)
    if search:
        query = query.filter(models.Product.name.ilike(f"%{search}%") | models.Product.sku.ilike(f"%{search}%"))
    if material:
        query = query.filter(models.Product.material == material)
    return query.order_by(desc(models.Product.created_at)).all()

@app.post("/api/v1/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED, tags=["Products"])
def create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Product).filter(models.Product.sku == product_in.sku.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"SKU {product_in.sku} already exists")
    
    prod = models.Product(
        sku=product_in.sku.upper().strip(),
        name=product_in.name.strip(),
        description=product_in.description,
        material=product_in.material,
        series=product_in.series,
        manufacturer=product_in.manufacturer,
        color=product_in.color,
        unit=product_in.unit,
        cost_price=product_in.cost_price,
        retail_price=product_in.retail_price,
        stock_quantity=product_in.stock_quantity,
        min_stock_alert=product_in.min_stock_alert,
        image_url=product_in.image_url
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod

@app.delete("/api/v1/products/{id}", tags=["Products"])
def delete_product(id: str, db: Session = Depends(get_db)):
    prod = db.query(models.Product).filter(models.Product.id == id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete inventory movements for this product
    db.query(models.InventoryMovement).filter(models.InventoryMovement.product_id == id).delete(synchronize_session=False)
    
    # Delete product
    db.delete(prod)
    db.commit()
    return {"success": True, "message": f"Product {prod.name} deleted successfully"}

# ----------------- Customers -----------------
@app.get("/api/v1/customers", response_model=List[schemas.CustomerResponse], tags=["Customers"])
def list_customers(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Customer)
    if search:
        query = query.filter(models.Customer.name.ilike(f"%{search}%") | models.Customer.phone.ilike(f"%{search}%"))
    return query.order_by(desc(models.Customer.created_at)).all()

@app.get("/api/v1/customers/by-phone/{phone}", response_model=schemas.CustomerResponse, tags=["Customers"])
def get_customer_by_phone(phone: str, db: Session = Depends(get_db)):
    cust = db.query(models.Customer).filter(models.Customer.phone == phone.strip()).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return cust

@app.delete("/api/v1/customers/{id}", tags=["Customers"])
def delete_customer(id: str, db: Session = Depends(get_db)):
    cust = db.query(models.Customer).filter(models.Customer.id == id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Nullify customer_id in sales orders so historical receipts are preserved
    db.query(models.SalesOrder).filter(models.SalesOrder.customer_id == id).update({"customer_id": None}, synchronize_session=False)
    
    db.delete(cust)
    db.commit()
    return {"success": True, "message": f"Customer {cust.name} deleted successfully"}

# ----------------- Orders / POS -----------------
@app.post("/api/v1/orders", status_code=status.HTTP_201_CREATED, tags=["Orders"])
def create_sales_order(order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    # 1. Idempotency Check
    if order_in.idempotency_key:
        existing = db.query(models.SalesOrder).filter(models.SalesOrder.idempotency_key == order_in.idempotency_key).first()
        if existing:
            return {"message": "Order already processed (Idempotent)", "order_code": existing.order_code}

    # 2. Check stock and calculate subtotal
    subtotal = 0
    items_to_save = []
    
    for item_input in order_in.items:
        prod = db.query(models.Product).with_for_update().filter(models.Product.id == item_input.product_id).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product {item_input.product_id} not found")
        if prod.stock_quantity < item_input.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {prod.name}. Required: {item_input.quantity}, available: {prod.stock_quantity}")
        
        line_subtotal = prod.retail_price * item_input.quantity
        subtotal += line_subtotal
        items_to_save.append({
            "product": prod,
            "quantity": item_input.quantity,
            "unit_price": prod.retail_price,
            "unit_cost": prod.cost_price,
            "subtotal": line_subtotal
        })

    total_amount = subtotal + order_in.shipping_fee
    paid = order_in.paid_amount if order_in.paid_amount is not None else total_amount
    paid = min(paid, total_amount)
    debt = max(0, total_amount - paid)

    # 3. Create or Update Customer
    cust = db.query(models.Customer).filter(models.Customer.phone == order_in.customer_phone.strip()).first()
    if not cust:
        cust = models.Customer(
            name=order_in.customer_name.strip(),
            phone=order_in.customer_phone.strip(),
            address=order_in.shipping_address,
            total_orders=1,
            total_spent=total_amount,
            total_paid=paid,
            current_debt=debt,
            first_purchase_at=datetime.utcnow(),
            last_purchase_at=datetime.utcnow()
        )
        db.add(cust)
        db.flush()
    else:
        cust.total_orders += 1
        cust.total_spent += total_amount
        cust.total_paid += paid
        cust.current_debt += debt
        cust.last_purchase_at = datetime.utcnow()

    # 4. Generate Order Code
    now_str = datetime.utcnow().strftime("%Y%m%d")
    count_today = db.query(models.SalesOrder).count() + 1
    order_code = f"ORD-{now_str}-{count_today:03d}"

    # 5. Create Order
    new_order = models.SalesOrder(
        order_code=order_code,
        customer_id=cust.id,
        customer_name=order_in.customer_name,
        customer_phone=order_in.customer_phone,
        shipping_address=order_in.shipping_address,
        subtotal=subtotal,
        discount_amount=0,
        shipping_fee=order_in.shipping_fee,
        total_amount=total_amount,
        paid_amount=paid,
        debt_amount=debt,
        payment_method=order_in.payment_method,
        status="COMPLETED",
        notes=order_in.notes,
        idempotency_key=order_in.idempotency_key,
        completed_at=datetime.utcnow()
    )
    db.add(new_order)
    db.flush()

    # 6. Deduct Stock & Record Items & Inventory Movement
    for entry in items_to_save:
        p = entry["product"]
        q = entry["quantity"]
        
        # Deduct
        qty_before = p.stock_quantity
        p.stock_quantity -= q
        
        # Order Item Snapshot
        oi = models.SalesOrderItem(
            order_id=new_order.id,
            product_id=p.id,
            sku_snapshot=p.sku,
            name_snapshot=p.name,
            unit_cost_snapshot=p.cost_price,
            unit_price_snapshot=p.retail_price,
            quantity=q,
            subtotal=entry["subtotal"]
        )
        db.add(oi)

        # Inventory Movement
        movement = models.InventoryMovement(
            product_id=p.id,
            movement_type="SALE",
            quantity_change=-q,
            quantity_before=qty_before,
            quantity_after=p.stock_quantity,
            reference_id=new_order.id,
            reason=f"POS Sale {order_code}",
            cost_at_time=p.cost_price
        )
        db.add(movement)

    # 7. Record Cash Transaction if payment was received
    if paid > 0:
        cash_tx = models.CashTransaction(
            code=f"PT-{order_code}",
            direction="IN",
            category="SALES_PAYMENT",
            amount=paid,
            payment_method=order_in.payment_method,
            reference_type="ORDER",
            reference_id=new_order.id,
            notes=f"Thu tiền đơn hàng {order_code}"
        )
        db.add(cash_tx)

    db.commit()
    return {"success": True, "order_id": new_order.id, "order_code": order_code, "total_amount": total_amount}

# ----------------- Image Upload & Railway Storage -----------------
@app.post("/api/v1/upload", response_model=schemas.UploadImageResponse, tags=["Uploads"])
def upload_image(payload: schemas.UploadImageRequest):
    try:
        data_str = payload.data.strip()
        ext = "jpg"

        match = re.match(r"^data:image/([a-zA-Z0-9+.-]+);base64,(.+)$", data_str)
        if match:
            mime_sub = match.group(1).lower()
            if "png" in mime_sub:
                ext = "png"
            elif "jpeg" in mime_sub or "jpg" in mime_sub:
                ext = "jpg"
            elif "webp" in mime_sub:
                ext = "webp"
            elif "gif" in mime_sub:
                ext = "gif"
            elif "svg" in mime_sub:
                ext = "svg"
            b64_content = match.group(2)
        else:
            b64_content = data_str

        file_bytes = base64.b64decode(b64_content)
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Kích thước file ảnh vượt quá 10MB")

        raw_name = (payload.filename or "product").split(".")[0]
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_name)[:35]
        unique_name = f"{safe_name}_{int(datetime.utcnow().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"

        target_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(target_path, "wb") as f:
            f.write(file_bytes)

        return {
            "success": True,
            "url": f"/uploads/{unique_name}",
            "filename": unique_name,
            "size": len(file_bytes)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi lưu trữ ảnh: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
