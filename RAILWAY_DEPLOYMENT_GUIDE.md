# Hướng Dẫn Chi Tiết Triển Khai Lên Railway (Railway Deployment Guide)

Hệ thống **Business Management System** hỗ trợ 2 phương án triển khai lên Railway linh hoạt:

---

## 🌟 PHƯƠNG ÁN 1: Triển Khai Trọn Gói Full-Stack (Khuyến nghị - Nhanh & Dễ nhất)

Toàn bộ ứng dụng bao gồm giao diện React (Quản lý kho, Điểm bán hàng POS, Đơn hàng, Sổ quỹ, Khách hàng, Báo cáo) cùng Backend Express và cơ sở dữ liệu SQLite sẽ chạy chung trong một dịch vụ duy nhất.

### Bước 1: Đẩy mã nguồn lên GitHub
1. Khởi tạo Git repository và đẩy toàn bộ source code của bạn lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy Business Management System"
   git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
   git branch -M main
   git push -u origin main
   ```

### Bước 2: Tạo dự án trên Railway
1. Đăng nhập vào [railway.app](https://railway.app/).
2. Nhấn nút **New Project** -> Chọn **Deploy from GitHub repo**.
3. Chọn kho mã nguồn (repository) vừa đẩy lên.
4. Railway sẽ tự động nhận diện tệp `Dockerfile` và `railway.toml` ở thư mục gốc để tiến hành cài đặt và build.

### Bước 3: Cấu hình Lưu Trữ Dữ Liệu Bền Vững (Railway Volume)
> **Cực kỳ quan trọng**: Để cơ sở dữ liệu (SQLite) và ảnh sản phẩm tải lên không bị mất đi khi khởi động lại hoặc khi bạn deploy code mới, hãy gắn Volume lưu trữ vĩnh viễn:

1. Trong dashboard dự án trên Railway, nhấp vào service ứng dụng của bạn.
2. Chuyển sang tab **Volumes** -> Chọn **Add Volume**.
3. Cấu hình Volume:
   - **Mount Path**: `/app/data` (Lưu trữ cơ sở dữ liệu)
4. (Tùy chọn thêm volume cho ảnh) Chọn **Add Volume** thứ hai:
   - **Mount Path**: `/app/uploads` (Lưu trữ ảnh sản phẩm tải lên)
   *(Hoặc gộp chung: đặt Mount Path là `/app/storage`, sau đó trong tab **Variables** đặt `DATA_DIR=/app/storage/data` và `UPLOADS_DIR=/app/storage/uploads`)*.

### Bước 4: Tạo Tên Miền Truy Cập (Public Domain)
1. Trong dashboard của service, chuyển sang tab **Settings**.
2. Cuộn xuống phần **Networking** -> Nhấn **Generate Domain**.
3. Bạn sẽ nhận được đường dẫn công khai có dạng `https://<ten-ung-dung>.up.railway.app`.
4. Mở đường dẫn này trên trình duyệt để bắt đầu sử dụng hệ thống ngay lập tức!

---

## 🚀 PHƯƠNG ÁN 2: Triển Khai Backend Python FastAPI + PostgreSQL (`/railway_export`)

Nếu bạn muốn kiến trúc phân tách độc lập giữa Frontend và Backend Python với cơ sở dữ liệu PostgreSQL của Railway:

1. Trong Railway, nhấn **New Project** -> **Provision PostgreSQL**.
2. Tạo thêm Service từ thư mục con `/railway_export` (chọn Root Directory là `/railway_export`).
3. Trong tab **Variables** của FastAPI Service, thêm:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `PORT`: `8000`
   - `TZ`: `Asia/Ho_Chi_Minh`
4. Gắn **Volume** tại Mount Path `/app/uploads` để lưu trữ ảnh tải lên bền vững.
5. Xem thêm hướng dẫn chi tiết tại `railway_export/README.md`.
