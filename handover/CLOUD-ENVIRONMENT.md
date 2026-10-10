# Lịch sử môi trường Codex cloud

Tài liệu này là thông tin bàn giao, không phải bước bắt buộc trên Claude Code Desktop.

## Đã làm và đã lưu

- Skill đã dùng: `cloud-environment-onboarding:setup`, nguồn `skill://plugin_connector_1p_ed5feb9070a08191b08c81c47947bc16/setup/SKILL.md`.
- Checkout thực `/workspace/WebProCode`, Node 24+, npm; cấu hình draft được đọc lại ngày 10/10/2026, revision 2.
- `install_script` và `start_skill` có nội dung đã được lưu trong draft. Bản chụp không có secret nằm ở `cloud/install.sh` và `cloud/start-instructions.md` trong thư mục này.
- Network draft restricted, preset `package_managers`, không thêm custom egress domains; không có yêu cầu secrets/runtime variables trong draft.
- Không sửa cấu hình cloud trong lượt đóng gói này. Lệnh start production trong source đã đổi sang Node preloader tương thích desktop, còn `npm start` vẫn là tên lệnh cũ hợp lệ.

## Những điều chưa được xác minh

- Chưa xác minh người dùng đã Save/Publish môi trường hay khôi phục trên task mới.
- Draft persistence không có nghĩa là script đã được áp dụng, môi trường đã publish, app đang chạy hay website đã triển khai public.
- Không có hosting/port-preview capability trong môi trường onboarding đã kiểm tra. Không đưa localhost cloud cho người dùng làm link truy cập.
- Các tiến trình không được đóng gói hoặc giữ qua publication/new task. Agent mới phải kiểm tra và khởi động lại.

## Bản chụp script không dùng nguyên xi trên desktop

`cloud/install.sh` dùng Bash và đường dẫn `/workspace`; đây là lịch sử cloud, không phải PowerShell/Windows setup. Trên desktop, vào thư mục đã giải nén và theo `../DESKTOP.md`: `npm ci`, `npm test`, `npm run build`, `npm run dev`.

Cloud start instructions ghi preserve `.data/.env`, tạo admin bằng env riêng, cấu hình bank khi có thông tin thật, test API/browser/admin và giới hạn video/GPU. Các hướng dẫn này vẫn hữu ích nhưng command kiểm tra dùng `curl`/heredoc POSIX; không yêu cầu Claude Desktop có connector Codex hoặc cài lại skill.

ZIP không chứa Git proxy, metadata `.git`, credential, secrets, shell history hoặc biến nội bộ của máy cloud. Origin chỉ ghi dạng đã loại thông tin xác thực `github.com/F5AI/WebProCode` trong tài liệu chính.
