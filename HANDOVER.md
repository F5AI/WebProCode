# Bàn giao F5 AI Studio cho Claude Code Desktop

Ngày lập gói: **10/10/2026**. Ngôn ngữ: tiếng Việt. Dự án nguồn: `F5AI/WebProCode`. Tên sản phẩm đang dùng: **F5 AI Studio**.

## Trạng thái quan trọng nhất

Đã có mã nguồn website full stack, tài nguyên khởi đầu, quản trị, tài khoản, membership chuyển khoản thủ công, responsive và test hành vi. **Chưa có website được triển khai công khai.** Người dùng đã phản hồi “website tôi đâu” vì ảnh và mã nguồn trong cloud không tạo địa chỉ truy cập website.

Gói này có bản HTML offline để mở ngay và toàn bộ source để agent khác chạy ứng dụng đầy đủ, hoàn thiện những phần còn thiếu và triển khai khi có hạ tầng hợp lệ. Không được coi việc mở ảnh, build thành công hay Publish môi trường là hoàn thành mục tiêu truy cập online.

## Cách dùng gói với Claude Code Desktop

1. Tải `f5-ai-studio-claude-handover.zip` và giải nén toàn bộ. Giữ cấu trúc thư mục, kể cả file bắt đầu bằng dấu chấm.
2. Chọn thư mục `f5-ai-studio` trong chế độ **Code** chạy cục bộ của Claude Desktop nếu phiên bản của bạn hỗ trợ chọn project. Chọn **thư mục**, không chỉ đính kèm ZIP vào một cuộc chat thông thường. Tên nút có thể khác theo phiên bản. Nếu chế độ Code cục bộ chưa có, dùng Claude Code CLI tại thư mục đó; chi tiết trong `handover/DESKTOP.md`.
3. Mở `handover/AGENT-PROMPT.md`, copy toàn bộ phần prompt và gửi vào phiên làm việc mới. File root `CLAUDE.md` cung cấp hướng dẫn thường trực cho Claude Code; prompt vẫn yêu cầu agent đọc các tài liệu cần thiết.
4. Agent kiểm tra Node 24+, chạy `npm ci`, tests, build và dev server. Node/npm không nằm trong ZIP. `node_modules` được tái tạo từ lockfile.
5. Trên máy desktop, website dev mở ở `http://localhost:5173` khi terminal đang chạy. Đây là địa chỉ của máy desktop, không phải URL public. Không dùng địa chỉ cloud cũ.

Nếu chỉ muốn xem giao diện ngay, mở `website-preview.html` trong trình duyệt. Nó chứa UI, ảnh, font, 8 bài và 14 file miễn phí; không cần Node hoặc server. Tìm kiếm, lọc, lưu bài, đọc và download hoạt động ngoại tuyến. Tài khoản, thanh toán và quản trị cần bản full stack.

## Các file cần đọc

| File | Mục đích | Thời điểm đọc |
| --- | --- | --- |
| `CLAUDE.md` | Quy tắc agent ngắn, quyền quyết định, stack, sự thật cần giữ | Bắt đầu mọi phiên |
| `handover/AGENT-PROMPT.md` | Prompt copy/paste cho agent tiếp quản | Khởi tạo phiên mới |
| `handover/PRODUCT.md` | Khách hàng, mô hình free/premium, quyết định đã chốt, nội dung | Trước sửa sản phẩm |
| `handover/DESKTOP.md` | Windows/macOS/Linux, Node, browser, test, local preview | Trước chạy máy mới |
| `handover/TECHNICAL.md` | Cấu trúc source, schema, API, auth, upload, membership, giới hạn | Trước sửa kỹ thuật |
| `handover/VALIDATION.md` | Kết quả kiểm tra thực và giới hạn của bằng chứng | Trước tuyên bố hoàn thành |
| `handover/EXECUTION.md` | Việc tiếp theo theo ưu tiên, triển khai, nghiệm thu | Lập kế hoạch thực thi |
| `handover/CLOUD-ENVIRONMENT.md` | Lịch sử onboarding, install/start đã lưu, tránh hiểu nhầm Publish | Chỉ nếu cần trở lại Codex cloud |
| `README.md`, `OPEN-WEBSITE.md`, `.env.example` | Hướng dẫn repo, mở preview và cấu hình ứng dụng | Tham chiếu vận hành |
| `handover/evidence/` | Ảnh kiểm tra giao diện thật | Review trực quan |
| `handover/MANIFEST.json`, `handover/SHA256SUMS.txt` | Kích thước/hash và danh sách file gói bàn giao | Kiểm tra tính toàn vẹn |

## Những gì được đóng gói

- Source React/TypeScript, Express/SQLite, scripts và tests.
- `package-lock.json`, cấu hình build, `.env.example`, Dockerfile.
- Seed 8 tài nguyên, 14 file thực hành free, 3 file premium; hai ảnh điện ảnh gốc và SVG.
- `dist/` build production sẵn ở thời điểm bàn giao; agent vẫn nên build lại sau `npm ci`.
- `website-preview.html` độc lập, bộ tài liệu tiếp quản và ảnh bằng chứng được chọn.
- Script đóng gói có thể chạy lại; manifest SHA-256 cho các file bên trong.

**Không** gồm `node_modules`, npm cache, `.git` và token Git proxy, `.env`, database vận hành hay uploaded data. Khi kiểm kê, database cloud có 0 users/sessions/orders/interests/resource overrides/uploads, không có dữ liệu nghiệp vụ cần chuyển. File `.env` không tồn tại. ZIP khởi tạo database sạch khi chạy lần đầu. Nếu chủ dự án có dữ liệu thực ở một máy khác, phải chuyển riêng và bảo toàn toàn bộ `.data/`; tuyệt đối không áp dụng reset database.

Các file premium trong ZIP dành cho chủ dự án và agent quản trị source. Không phát hành ZIP này như gói tài nguyên miễn phí cho người xem website. HTML offline không chứa bytes của premium.

## Kiểm tra ZIP và tạo lại gói

File `f5-ai-studio-claude-handover.zip.sha256` chứa checksum của toàn bộ ZIP. Sau khi tải, so sánh với `Get-FileHash .\f5-ai-studio-claude-handover.zip -Algorithm SHA256` trong PowerShell hoặc `shasum -a 256 f5-ai-studio-claude-handover.zip` trên macOS. Trong project có `handover/MANIFEST.json` và `handover/SHA256SUMS.txt`; manifest ghi hash từng file nội dung, SHA256SUMS còn ghi hash manifest, không tự hash chính nó.

Nếu có Python 3, kiểm tra đầy đủ một ZIP bằng `python scripts/package-handover.py --verify <đường-dẫn-ZIP>`; thay placeholder bằng đường dẫn file thật, dùng `python3` nếu máy dùng tên đó. Script kiểm tra CRC, path, danh sách file và SHA-256. Tạo lại sau thay đổi bằng `npm run preview:export` rồi `python scripts/package-handover.py`; script không chạy tests thay bạn, hãy cập nhật `handover/VALIDATION.md` bằng kết quả thực trước khi bàn giao lại.

## Quyết định đã chốt, không phỏng vấn lại

- Người dùng mới làm quen AI hoặc đã dùng nhưng chưa kiểm soát kết quả như ý.
- Mục tiêu thực hành: một phim AI ngắn 3 phút, có quy trình đầy đủ.
- Ưu tiên: tốc độ, chất lượng, chi phí, tiện lợi và dễ vận hành; ưu tiên công cụ rẻ/miễn phí và mã nguồn mở.
- Miễn phí: hướng dẫn/preview/bản cơ bản và file thực hành. Trả phí: video đầy đủ, workflow nâng cấp, file/bài học cao cấp.
- Mô hình CLB trả phí theo tháng; bản hiện tại đề xuất 199.000đ / 30 ngày bằng chuyển khoản admin xác nhận. Giá này là đề xuất đã triển khai trong code, không phải kết quả khảo sát định giá hay giá người dùng tự đưa.
- Giao diện đơn giản, tiếng Việt, responsive PC/tablet/mobile, có thể học cách trình bày free/member của Patreon.
- Chỉ dẫn cuối của người dùng: **chủ động đề xuất và tự thực hiện, không hỏi lại**. Câu hỏi phỏng vấn trước đó đã được thay bằng quyền chủ động này.

## Git và nguồn sự thật

Checkout cloud là `/workspace/WebProCode`, branch symbolic `work`, HEAD chưa có commit. Remote được xác minh ở dạng đã loại thông tin xác thực: `github.com/F5AI/WebProCode`. Chưa commit và chưa push source. Clone remote không thay thế được việc giải nén gói này.

ZIP không chứa Git metadata để tránh chuyển credential/proxy cloud. Agent trên desktop có thể chạy `git init` nếu cần lịch sử cục bộ; chỉ thêm remote/push bằng quyền Git hợp lệ đang có. Không reset hoặc ép push để tạo cảm giác đồng bộ.

## Điểm nghiệm thu thực tế của agent mới

Người dùng nhận được một cách mở ứng dụng **thật**, biết rõ local hay public; free files tải được; quyền premium được kiểm tra ở server; PC/tablet/mobile không tràn ngang; dữ liệu giữ được qua restart. Nếu hạ tầng cho phép, URL HTTPS public phải được mở và kiểm tra từ ngoài máy chủ. Nếu hạ tầng chưa được cấp, ứng dụng local và cấu hình triển khai vẫn phải hoàn thiện; báo chính xác thiếu hosting/domain/quyền nào.

Không được tuyên bố đã làm ra phim, đã nhận thanh toán, đã quay video giảng viên hoặc đã triển khai public chỉ dựa vào test fixture, ảnh screenshot hay build output.
