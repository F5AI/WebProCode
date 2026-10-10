# Prompt khởi động cho Claude Code Desktop

Copy phần dưới đây vào phiên Claude Code có quyền đọc/sửa thư mục project đã giải nén. Prompt không chứa credential và không yêu cầu transcript cũ.

---

Bạn đang tiếp quản dự án **F5 AI Studio** từ một agent khác. Hãy làm việc trực tiếp trên source có sẵn trong thư mục này, dùng tiếng Việt với tôi và chủ động thực hiện đến khi có kết quả thật có thể mở/kiểm tra. Tôi đã cho phép bạn tự đề xuất và quyết định các lựa chọn triển khai thông thường; **không hỏi lại tôi, không phỏng vấn lại, không chờ xác nhận một kế hoạch**.

Trước tiên đọc `CLAUDE.md`, `HANDOVER.md`, rồi các tài liệu phù hợp trong `handover/`: `PRODUCT.md`, `DESKTOP.md`, `TECHNICAL.md`, `VALIDATION.md`, `EXECUTION.md`. Không nạp HTML preview 6 MB, ảnh, lockfile hoặc dist vào context bằng cách cat; dùng công cụ và file source khi cần. Những tài liệu này thay thế transcript cũ.

Mục tiêu sản phẩm: website tiếng Việt rất đơn giản cho dân văn phòng học làm phim AI, đủ quy trình tạo một phim 3 phút bằng tài nguyên miễn phí. Bài viết có thể gồm video/phần xem trước, hướng dẫn, workflow ComfyUI và file thực hành HTML hoặc định dạng phù hợp. CLB trả phí theo tháng cho bản nâng cấp nhanh hơn, đẹp hơn, rẻ hơn hoặc thuận tiện hơn; không chặn quy trình cơ bản đầy đủ. Hỗ trợ PC/tablet/mobile. Giữ thiết kế hiện tại, tránh viết lại framework hoặc thêm service trả phí không cần thiết.

Ưu tiên của phiên tiếp quản:

1. Xác nhận môi trường desktop và source; chạy Node 24+, `npm ci`, `npm test`, `npm run build`. Không xóa `.data`, `.env` hoặc thay đổi hiện có của tôi. Database thử phải riêng.
2. Khởi động `npm run dev` và giúp tôi mở website thật trên máy desktop. Mở bằng chức năng browser/preview của môi trường nếu có; nếu không, cung cấp địa chỉ local chính xác và giữ server đang chạy. Kiểm tra thư viện, mở bài, tải file, tìm kiếm, lọc, lưu và responsive bằng thao tác thật. Không chỉ gửi screenshot.
3. Đọc các giới hạn được ghi nhận. Sửa vấn đề cản trở việc dùng hoặc triển khai trước; lựa chọn hợp lý rồi thực hiện, không hỏi lại. Không đánh đồng suggestions/backlog với yêu cầu đã chốt.
4. Hoàn thiện khả năng triển khai full stack có HTTPS và persistent `.data`. Ưu tiên container trên hạ tầng Node 24 phù hợp nếu không có cấu hình triển khai khác. Nếu trong môi trường đã có hosting/domain/credential được cấp hợp lệ, dùng chúng để triển khai, kiểm tra URL từ ngoài và bàn giao URL thật. Không tự tạo tài khoản, không bịa credential, không in secrets, không dùng token nội bộ của công cụ làm credential hosting.
5. Nếu thiếu quyền/hạ tầng ngoài project, vẫn hoàn tất source, local run, tests, Docker/runbook, rồi báo chính xác phụ thuộc nào chưa có. Đừng thay câu trả lời bằng một vòng hỏi mới; không tuyên bố “đã online” khi chưa có URL HTTPS được kiểm tra.
6. Chạy các kiểm tra phù hợp sau sửa, cập nhật trạng thái và hướng dẫn vận hành. Bàn giao ngắn gọn cách mở, điều đã thay đổi, bằng chứng kiểm thử và phần còn thiếu.

Sự thật hiện tại cần giữ:

- Website đã có React/TypeScript/Vite + Express/SQLite, tài khoản, quản trị upload, chuyển khoản thủ công và premium gating. Chưa được xuất bản công khai.
- Không có admin mặc định hoặc thông tin ngân hàng thật. Admin được bootstrap từ biến môi trường do chủ dự án cung cấp riêng. Không tạo mật khẩu công khai.
- Khi chưa cấu hình bank, chỉ lưu quan tâm, không thu tiền/mở quyền. Admin chỉ duyệt sau đối chiếu tiền thật. Hiện không có auto-renewal.
- Seed chưa có video giảng viên. Video một giây trong test chỉ là fixture, không phải nội dung thật. Không tự mô tả bài text như video sẵn có.
- Workflow ảnh SD1.5 đã kiểm tra cấu trúc; chưa có video workflow nâng cao được GPU-render xác thực. Chưa có bộ phim thật do môi trường này tạo. Nếu làm thêm, hãy đo và ghi rõ model/phiên bản/phần cứng thay vì hứa hẹn.
- `website-preview.html` mở offline và cố ý từ chối đăng nhập/thanh toán/ghi dữ liệu. Không chuyển bản offline thành demo giả tài khoản.
- Source chưa commit/push trên GitHub. ZIP đã giải nén là bản thực tế; remote rỗng không có source để thay thế.

Hãy bắt đầu kiểm tra và chạy dự án ngay. Nếu có nhiều bước, theo dõi checklist và cập nhật ngắn trong quá trình làm; không dừng sau việc đọc tài liệu hay đề xuất kế hoạch.

---

Đối với nhiệm vụ hẹp hơn, giữ prompt này rồi nối thêm mục tiêu cụ thể ở cuối, ví dụ: “Trong phiên này ưu tiên chạy local và sửa UI, chưa cần triển khai hạ tầng”. Không cần thay toàn bộ bối cảnh.
