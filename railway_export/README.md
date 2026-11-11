# Hướng Dẫn Triển Khai Backend Lên Railway (FastAPI + PostgreSQL)

Hệ thống quản lý kinh doanh **Business Management System** bao gồm gói backend chuẩn hóa để triển khai lên dịch vụ **Railway** với cơ sở dữ liệu PostgreSQL.

## 1. Yêu cầu & Kiến trúc
- **Ngôn ngữ & Framework**: Python 3.11 + FastAPI.
- **ORM & Validation**: SQLAlchemy 2 + Pydantic v2.
- **Cơ sở dữ liệu**: PostgreSQL (Railway Database Service).
- **Tiền tệ**: Lưu trữ bằng số nguyên `BIGINT` VND.
- **Timezone**: `Asia/Ho_Chi_Minh`.

## 2. Các bước triển khai lên Railway

### Bước 1: Tạo dự án mới trên Railway
1. Truy cập [railway.app](https://railway.app/) và đăng nhập.
2. Nhấn nút **New Project**.
3. Chọn **Provision PostgreSQL** để tạo cơ sở dữ liệu PostgreSQL.

### Bước 2: Triển khai FastAPI Service
1. Chọn **New Service** -> **GitHub Repo** (hoặc dùng Railway CLI `railway up` từ thư mục `/railway_export`).
2. Trong phần cài đặt **Variables** của FastAPI Service, thêm biến môi trường:
   - `DATABASE_URL`: Liên kết với biến `${{Postgres.DATABASE_URL}}` của dịch vụ PostgreSQL vừa tạo.
   - `PORT`: 8000 (Railway sẽ tự động cấp phát cổng).
   - `SECRET_KEY`: Khóa bảo mật ngẫu nhiên cho JWT.
   - `TZ`: `Asia/Ho_Chi_Minh`.

### Bước 3: Kiểm tra hoạt động
Sau khi deploy hoàn tất, truy cập URL do Railway cung cấp:
- Health check: `https://your-service.up.railway.app/health`
- Tài liệu tương tác Swagger API: `https://your-service.up.railway.app/docs`
- Redoc API: `https://your-service.up.railway.app/redoc`

### Bước 4: Lưu trữ Hình ảnh Sản phẩm Bền vững (Railway Volume)
Để ảnh sản phẩm tải lên (`/uploads/...`) được lưu trữ vĩnh viễn và không bị mất khi deploy code mới trên Railway:
1. Trong dashboard của Railway, nhấp vào dịch vụ backend của bạn.
2. Chuyển sang tab **Volumes** -> chọn **Add Volume**.
3. Điền Mount Path là: `/app/uploads` (hoặc `/uploads`).
4. Nhấn **Add**. Các ảnh sản phẩm tải lên từ nút "Tải lên từ thiết bị" trong phần Quản lý Kho sẽ tự động được lưu trữ trực tiếp vào Railway volume này và truy cập qua đường dẫn công khai `https://your-service.up.railway.app/uploads/<tên_ảnh>`.

