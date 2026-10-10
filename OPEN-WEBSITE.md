# Mở F5 AI Studio

## Xem ngay, không cài phần mềm

Tải `website-preview.html` rồi mở file bằng Chrome, Edge, Firefox hoặc Safari. Đây là một file HTML độc lập: có giao diện, hình ảnh, font, các bài hướng dẫn và file thực hành miễn phí. Bạn có thể tìm kiếm, lọc, lưu bài, mở lộ trình, đọc và tải tài liệu khi ngoại tuyến.

Đây là **bản xem trước ngoại tuyến**, không phải website đã được xuất bản lên Internet. Đăng nhập, quản trị nội dung và thanh toán cần bản server đầy đủ. Bản xem trước không giả lập tài khoản hoặc mở quyền trả phí.

Tạo lại file từ mã nguồn:

```bash
npm ci
npm run preview:export
```

## Website đầy đủ

Mã nguồn nằm trong thư mục `/workspace/WebProCode` của task này, chưa được đẩy lên GitHub. File `f5-ai-studio-source.zip` đóng gói mã nguồn cùng ảnh và bộ tài nguyên ban đầu, không chứa database, tài khoản, mật khẩu hoặc file `.env` của môi trường.

Website đầy đủ cần một máy chủ chạy Node.js 24+, HTTPS và ổ lưu trữ bền vững cho `.data`. Xem `README.md` để cài đặt, tạo tài khoản quản trị và bật thanh toán chuyển khoản.

Đã có `Dockerfile` để triển khai lên máy chủ hoặc dịch vụ chạy container:

```bash
docker build -t f5-ai-studio .
docker volume create f5-ai-studio-data
docker run -d --name f5-ai-studio \
  --env-file .env \
  -p 127.0.0.1:3001:3001 \
  -v f5-ai-studio-data:/app/.data \
  f5-ai-studio
```

Đặt reverse proxy HTTPS phía trước cổng 3001; `APP_ORIGIN` phải là địa chỉ HTTPS công khai của website. Dockerfile là cấu hình triển khai được chuẩn bị, chưa được build/chạy trong môi trường cloud này. Các kiểm tra ứng dụng đã chạy trực tiếp trên Node.js.

**Publish trong Environment Settings chỉ lưu môi trường phát triển và snapshot. Nó không tạo domain hoặc triển khai website công khai.** Môi trường onboarding hiện không cung cấp chức năng mở cổng hoặc preview ứng dụng, nên các địa chỉ localhost của máy cloud không mở được từ máy người dùng.
