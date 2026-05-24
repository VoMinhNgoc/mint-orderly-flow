# 🍃 Order Mint - Order Management System

**Order Mint** là một hệ thống quản lý và gom đơn hàng hiệu quả dành riêng cho các bạn chủ shop kinh doanh đồ handmade (crochet, perler beads) hoặc gom đơn hàng thương mại (goods idol, tạp chí công ty quản lý...). Hệ thống giúp tối ưu hóa quy trình chốt đơn, phân chia đợt hàng (split sets) và tự động hóa việc gán khách hàng vào từng mã sản phẩm cụ thể.

Hệ thống hỗ trợ linh hoạt cả môi trường **Online đa người dùng (qua đám mây TiDB Cloud + Render)** lẫn môi trường **Localhost cá nhân bảo mật (qua XAMPP + MySQL local)**.

---

## ✨ Tính năng nổi bật

- **Catalog Sản Phẩm:** Quản lý danh sách sản phẩm thông minh, tự động chuyển đổi link ảnh từ kho lưu trữ GitHub thành liên kết hiển thị trực tiếp. Phân loại trạng thái "Còn hàng" và "Đã hoàn thành" tự động dựa trên lượng tồn kho thực tế (`stock`).
- **Giỏ Hàng Tạm Thời (Cart):** Hỗ trợ lên kế hoạch nhập hàng, thiết lập các thông số cấu hình đợt hàng như giá gốc (`base_price`), phí chênh lệch (`markup_fee`), số lượng set cần gom (`split_sets`).
- **Hàng Đang Bán (Processing Orders):** Khu vực cốt lõi cho phép gán thông tin nhiều khách hàng mua chung vào một đợt sản phẩm. Theo dõi trực quan số lượng "Đã gán" và "Còn lại" của từng đợt gom.
- **Quản Lý Khách Hàng (Customers):** Tổng hợp báo cáo chi tiết về tổng số lượng sản phẩm đã mua, tổng số tiền chi tiêu, mã vận đơn (`tracking_number`) và tự động tính toán doanh thu lời nhuận thực tế thu về từ phí markup.
- **Giao Diện Thân Thiện Trên Di Động:** Thiết kế bảng dữ liệu thông minh, cho phép cuộn ngang (`overflow-x-auto`) mượt mà trên màn hình điện thoại, giúp thao tác gán khách và chốt đơn mọi lúc mọi nơi.

---

## 🛠️ Công nghệ sử dụng

**Backend:**
- FastAPI (Python)
- MySQL Connector (Kết nối cơ sở dữ liệu)
- Uvicorn (ASGI web server)

**Frontend:**
- React + Vite + TypeScript
- Shadcn/ui + Tailwind CSS (Giao diện ứng dụng)
- TanStack Query (Quản lý trạng thái và đồng bộ dữ liệu API)

---

## 🚀 Hướng dẫn cài đặt dưới máy Local (XAMPP)

Để khởi chạy hệ thống độc lập dưới máy tính cá nhân của bạn, hãy làm theo các bước sau:

### 1. Khởi động Cơ sở dữ liệu
1. Mở **XAMPP Control Panel** và nhấn **Start** dịch vụ **MySQL** (cổng mặc định `3306`).
2. Truy cập vào `http://localhost/phpmyadmin/`, tạo một cơ sở dữ liệu mới trống tên là **`mintorder`**.
3. Chạy các câu lệnh SQL khởi tạo cấu trúc bảng (`products`, `orders`, `order_assignments`, `cart`, `customers`) vào database này.

### 2. Khởi chạy Backend (FastAPI)
1. Di chuyển vào thư mục backend, kích hoạt môi trường ảo (nếu có).
2. Chạy lệnh uvicorn mở rộng để cho phép các thiết bị khác trong mạng Wi-Fi (như điện thoại) cùng truy cập:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
