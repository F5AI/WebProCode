# F5 AI Studio — hướng dẫn cho Claude Code

Đây là dự án đã triển khai chức năng trong mã nguồn. Hãy tiếp quản và hoàn thiện trên nền hiện có, không tạo lại website từ đầu.

## Đọc trước khi hành động

1. `START-HERE.md`: đọc file này trước để chạy và tiếp quản ngay.
2. Các tài liệu dài trong `handover/` chỉ đọc khi giải quyết phần việc tương ứng: sản phẩm, desktop, kỹ thuật, kiểm thử hoặc triển khai. Không bắt người dùng mở nhiều file.
3. `HANDOVER.md` là lịch sử gói ZIP trước thao tác chuyển source sang GitHub; kiểm tra refs Git hiện tại khi cần biết trạng thái commit/push.

Chỉ đọc phần liên quan trong tài liệu dài khi đã biết nhiệm vụ; không nạp `website-preview.html`, ảnh, lockfile hoặc toàn bộ `dist/` vào context. Đây là file sinh ra, có thể dùng công cụ để kiểm tra.

## Ý định và quyền quyết định của người dùng

- Ngôn ngữ sản phẩm và trao đổi: tiếng Việt.
- Người dùng đã yêu cầu: “chủ động đề xuất và tự thực hiện mà không hỏi lại bất cứ thứ gì”. Không phỏng vấn lại hay xin xác nhận các lựa chọn triển khai thông thường.
- Website đơn giản cho người làm văn phòng học làm phim AI, ưu tiên nhanh, chất lượng, rẻ và dễ vận hành.
- Tài nguyên miễn phí phải đủ các bước hoàn thành phim AI ngắn 3 phút. CLB trả phí nâng cấp tốc độ, chất lượng và tự động hóa.
- Ưu tiên đầu tiên khi tiếp quản: người dùng thực sự mở được website. Bản offline có sẵn; website online chưa được triển khai.
- Chỉ sử dụng tài khoản/hosting/credential đã được cấp hợp lệ. Nếu thiếu một phụ thuộc bên ngoài, hoàn thiện phần còn lại và báo chính xác phụ thuộc đó; không bịa URL, tài khoản hoặc giao dịch.

## Stack và lệnh chính

- Node.js **24+**, npm, React 19, TypeScript, Vite, Express 5, SQLite tích hợp Node.
- `npm ci`: cài đúng lockfile. `npm run dev`: API 3001 + frontend 5173.
- `npm run build`, `npm test`: kiểm tra TypeScript/bundle và API.
- `npm start`: production frontend + API cùng cổng `PORT` (mặc định 3001).
- `npm run admin`: bootstrap admin bằng biến môi trường riêng; không có admin mặc định.
- `npm run test:browser`: browser smoke; cần server dev hoặc `BROWSER_BASE_URL` phù hợp, Chromium và database thử riêng.
- `npm run test:admin`: CMS/membership/video với database và server tạm; cần build, Chromium; FFmpeg cho phần test video.
- `npm run preview:export`: tạo lại một file HTML offline độc lập.
- `npm run test:preview`: kiểm tra HTML offline trong Chromium; không cần server/database, vẫn cần browser.
- `python scripts/package-handover.py`: tạo ZIP bàn giao và manifest; cần Python 3, không phải dependency của website.

## Quy tắc giữ dữ liệu và hành vi

- Không reset/xóa `.data/`, `.env`, tài khoản, file tải lên hoặc thay đổi của người dùng. Database thử dùng `DATABASE_PATH` riêng.
- `.env` không được commit hoặc đóng gói. Không in mật khẩu, session token hay toàn bộ biến môi trường.
- Seed ở `server/content.json`; nội dung quản trị chỉnh sửa được lưu override/tombstone trong SQLite. Sửa seed không ghi đè override đã tồn tại.
- File cao cấp ở `server/assets/premium/` hoặc `.data/uploads/premium/`; không đưa vào `public/`, `dist/` hoặc HTML offline. ZIP bàn giao cho chủ dự án có source premium, không phải artifact phát hành công khai.
- Thay backend/env cần khởi động lại dev server; frontend có HMR. Tránh chạy server trùng cổng.
- Thanh toán hiện là chuyển khoản và admin xác nhận sau đối chiếu. Không tự mở quyền vì người dùng bấm nút hoặc đăng ký quan tâm. Không có trừ tiền định kỳ.
- Không viết test chỉ phản chiếu implementation. Dùng các test hành vi hiện có, bổ sung nếu thay đổi rủi ro thực.

## Các sự thật không được mô tả sai

- Chưa có website công khai, tên miền, admin thực hay tài khoản ngân hàng thực được cấu hình trong bản bàn giao.
- `website-preview.html` là bản offline; các yêu cầu ghi dữ liệu bị từ chối rõ ràng. Không giả lập đăng nhập/thanh toán.
- Chưa có video giảng viên thật. Test video dùng clip fixture một giây, không phải bài học.
- Workflow ComfyUI seed tạo ảnh SD1.5 bằng node lõi; chưa có workflow video nâng cao đã render trên GPU.
- Chưa render GPU hoặc tạo một bộ phim hoàn chỉnh trong môi trường này.
- Dockerfile đã chuẩn bị; chỉ gọi Docker “đã kiểm tra” nếu bạn thực sự build/chạy và xác minh.
- Publish môi trường Codex chỉ lưu môi trường; không xuất bản website. Localhost trên máy desktop của người dùng khác với localhost của máy cloud.
- Repo có remote `F5AI/WebProCode`. Gói ZIP trước đây được tạo khi chưa có commit/push; dùng refs Git thực để xác minh trạng thái mới của nhánh `claude-handover`.

## Làm việc hiệu quả

Giữ phong cách hiện có: nền sáng, điểm nhấn cam, hình điện ảnh, font Be Vietnam Pro local, sidebar desktop và điều hướng mobile. Không thêm framework, service trả phí, analytics, form hỏi lại hoặc dashboard phức tạp khi chưa cần.

Sau mỗi thay đổi: kiểm tra phù hợp, cập nhật tài liệu trạng thái, rồi bàn giao đường dẫn thật có thể mở. Thông báo ngắn gọn những phát hiện và blocker trong quá trình làm. Không kết thúc chỉ bằng ảnh screenshot hoặc câu “đã làm xong” khi người dùng chưa có cách mở website.
