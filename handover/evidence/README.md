# Bằng chứng giao diện

Ảnh do Chromium/Playwright tạo từ ứng dụng chạy thật, không phải mockup. Ảnh phục vụ review, không thay thế một URL website.

- `desktop.png`, `tablet.png`, `mobile.png`, `mobile-small.png`: smoke test thư viện 1440/820/390/360 px, full page.
- `mobile-resource.png`: modal bài hướng dẫn trên mobile.
- `admin-desktop.png`, `admin-mobile.png`: quản trị với database tạm, tài khoản và thanh toán fixture; không phải khách hàng/giao dịch thật.
- `portable-desktop-fold.png`, `portable-mobile-fold.png`: ảnh bản HTML offline được chụp ở lượt tạo preview trước lượt đóng gói. Lượt kiểm tra bàn giao kiểm tra lại chức năng offline, không dùng ảnh cũ làm bằng chứng một deploy mới.
- `free-download-roadmap.html`: file thực hành đã tải qua browser test server.
- `offline-free-download.html`: file HTML thực hành tải từ preview offline, nếu được tạo trong lượt kiểm tra.

Kết quả và giới hạn nằm ở `../VALIDATION.md`. Không có ảnh bộ phim GPU-render hoàn chỉnh hoặc website deployed public. Script đóng gói chỉ copy các tên trên từ `.playwright/` nếu có, không copy toàn bộ thư mục runtime hoặc screenshot chứa account thực.
