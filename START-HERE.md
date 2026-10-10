# F5 AI Studio — tiếp quản và chạy ngay

Đây là điểm bắt đầu duy nhất cho agent mới. Mã nguồn đã có; không dựng lại từ đầu. Tài liệu chi tiết trong `handover/` chỉ đọc khi cần giải quyết một vấn đề cụ thể.

## Kết quả cần bàn giao

Người dùng mở được website thật trên máy desktop, sau đó có URL HTTPS public nếu môi trường đã có hosting và quyền triển khai. Không bàn giao chỉ bằng ảnh hoặc link file cloud. Website chưa được đưa lên Internet trong môi trường Codex.

Người dùng đã yêu cầu: **chủ động đề xuất, tự thực hiện và không hỏi lại**. Không phỏng vấn lại, không dừng để hỏi các lựa chọn thông thường. Dùng tiếng Việt.

## Bắt đầu

1. Dùng source từ repository `F5AI/WebProCode`, nhánh `claude-handover`, nếu nhánh này đã được chuyển thành công; kiểm tra refs bằng Git thực. Không dùng branch main rỗng hoặc tự kết luận có code khi chưa clone thành công.
2. Làm việc trong thư mục chứa `package.json`; giữ mọi thay đổi, `.env` và `.data` đã có của chủ dự án. Node.js **24 trở lên** và npm là bắt buộc.
3. Chạy `npm ci`, `npm test`, `npm run build`, rồi `npm run dev` trong terminal sống.
4. API dùng 3001, frontend dùng 5173. Mở `http://localhost:5173` **trên chính máy chạy server** bằng browser/preview của Claude Code Desktop nếu có. Đưa URL local đúng cho người dùng, giữ server đang chạy.
5. Kiểm tra ảnh/font, tìm kiếm không dấu, filter, lưu/reload, mở bài, download thật, account và mobile. Nếu agent ở máy remote thay vì desktop local, phải xác minh preview/forwarding được hỗ trợ trước khi bàn giao URL.

Lệnh `npm start` chạy production bằng Node preloader, không dùng cú pháp gán biến POSIX; phục vụ frontend build và API cùng cổng `PORT` mặc định 3001. Cookie production Secure cần HTTPS; dùng dev mode để test account qua HTTP local.

## Sản phẩm và các quyết định đã chốt

- Website tiếng Việt, rất đơn giản, cho dân văn phòng mới dùng AI hoặc đã dùng nhưng chưa kiểm soát được kết quả.
- Đích học miễn phí: hoàn thành một phim AI ngắn **3 phút**, đủ các bước kịch bản → shotlist/storyboard → nhân vật → bối cảnh → keyframe → chuyển động → dựng/âm thanh/phụ đề/xuất MP4.
- Ưu tiên: nhanh, chất lượng, rẻ và dễ vận hành; dùng công cụ miễn phí/mã nguồn mở khi phù hợp.
- Bài viết kết hợp hướng dẫn, video preview, workflow và file thực hành HTML/Markdown/JSON/CSV/SRT hoặc định dạng liên quan.
- CLB trả phí theo tháng mở video đầy đủ, workflow/file nâng cấp giúp làm nhanh và tự động hơn. Bản miễn phí vẫn phải đủ quy trình cơ bản.
- Bản đang có đề xuất **199.000đ / 30 ngày**, chuyển khoản và admin duyệt sau đối chiếu. Chưa có tự trừ tiền hoặc auto-renewal. Giá là đề xuất trong code, không phải giá người dùng tự đưa; nếu đổi, sửa server và UI thống nhất.
- Thiết kế sáng, điểm nhấn cam, ảnh điện ảnh, font Be Vietnam Pro local; sidebar PC và điều hướng mobile. Responsive 1440/820/390/360 px đã được kiểm tra.

## Đã có trong source

- React 19 + TypeScript + Vite; Express 5 + SQLite tích hợp Node; không cần database service bên ngoài.
- Thư viện 8 bài, search tiếng Việt có/không dấu, filter chủ đề/loại, lộ trình 4 chặng, lưu bài trên trình duyệt.
- Modal bài học, URL `?resource=id`, Escape/focus, tải file free thật.
- Đăng ký/login/logout, scrypt password hash, cookie session HttpOnly/SameSite; premium được kiểm tra quyền ở server.
- Membership interest khi chưa có bank, đơn chuyển khoản có mã riêng khi đã cấu hình, admin approve idempotent và cộng 30 ngày từ thời điểm hiện tại hoặc hạn đang còn.
- Admin tạo/sửa/gỡ bài, upload file/MP4/WebM free/premium tối đa 100 MB, phát video có byte range, xem interests/orders.
- Seed 14 file miễn phí và 3 file premium; source premium dành cho chủ dự án, không đưa vào public static của website.
- Dockerfile, build/test scripts, offline HTML exporter và kiểm thử browser thật.

## Những điều còn thiếu phải mô tả đúng

- Chưa có public deployment/domain/hosting được xác minh.
- Chưa có admin hoặc bank thật được cấu hình. Không có admin mặc định.
- Chưa có video giảng viên trong 8 bài seed. Clip test một giây chỉ là fixture chức năng.
- Workflow seed ComfyUI là ảnh SD1.5 7 node lõi, chưa GPU-render ở đây; chưa có workflow video cao cấp được thực nghiệm hoặc phim 3 phút thật.
- Khi không đủ GPU, tài liệu hướng dẫn animatic từ ảnh, pan/zoom, giọng đọc và dựng 180 giây; không được gọi là video sinh model cho mọi shot.
- Article sections hiện công khai; chỉ file và video premium được gated.
- Chưa có reset password/email verification, refund/cancel hoặc recurring payment integration.
- UI chưa có nút gia hạn khi member còn hạn, dù API cho phép gia hạn. Upload kiểm tra đuôi file, chưa sniff/scan hoặc cleanup file mồ côi.

## Cấu hình vận hành

Copy `.env.example` thành `.env` nếu cần; không đưa secret vào chat hoặc Git.

| Biến | Dùng để |
| --- | --- |
| `PORT` | Cổng production/API, mặc định 3001; dev launcher cố định 3001 |
| `DATABASE_PATH` | Database riêng cho test/custom deployment; mặc định `.data/club.sqlite` |
| `APP_ORIGIN` | Origin HTTPS public chính xác khi triển khai |
| `TRUST_PROXY=1` | Chỉ khi đúng một reverse proxy đáng tin cậy |
| `BANK_NAME`, `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME` | Ba thông tin nhận chuyển khoản công khai; để trống khi chưa có bank thật |
| `F5AI_ADMIN_EMAIL`, `F5AI_ADMIN_PASSWORD` | Bootstrap admin bằng `npm run admin`; password 12–128 ký tự, xóa env password sau tạo thành công |

`npm run admin` có thể cập nhật password và nâng role cho email đã tồn tại: chỉ chạy cho account chủ website thật. Không tự tạo credential công khai. Nếu chưa có thông tin ngoài project, vẫn chạy được free library và account thường; làm xong phần không phụ thuộc và báo đúng blocker.

Giữ toàn bộ `.data/`: database, WAL/SHM nếu có, uploads/free và uploads/premium. Không chạy browser smoke vào database production. Backup bằng cách dừng server rồi sao chép toàn bộ `.data`, hoặc dùng SQLite backup đúng; không copy mỗi file SQLite đang ghi và gọi là backup chắc chắn.

## Kiểm tra

`npm test` chạy 8 test API với database tạm. `npm run build` kiểm tra TypeScript và tạo production bundle.

Browser tests cần Chromium. Mặc định `/usr/bin/chromium` chỉ phù hợp Linux cloud. Trên desktop: `npx playwright install chromium`, lấy đường dẫn bằng `node -p "require('playwright').chromium.executablePath()"`, đặt `CHROMIUM_PATH` bằng cú pháp shell của máy rồi chạy:

- `npm run test:browser`: server dev đang chạy, database thử riêng; sẽ đăng ký account synthetic.
- `npm run test:admin`: build trước, database/server riêng; FFmpeg cho fixture MP4 (thiếu sẽ skip video, không được báo video đã test).
- `npm run preview:export` rồi `npm run test:preview`: không cần server/database, test HTML self-contained qua origin được intercept; không phải kiểm tra native file://.

Đã kiểm tra trên Linux: 8/8 backend, build, 4 viewport browser, CMS/admin/membership/uploads/video fixture và offline HTML. Bản ZIP trước đó đã cài/run test từ giải nén sạch. Chưa thực thi Windows/macOS, Docker hoặc GPU; không biến những runbook đó thành bằng chứng đã chạy.

## Triển khai tiếp theo

Ưu tiên một instance Node 24/container + HTTPS + persistent `.data`. Không deploy chỉ `dist/` lên static hosting rồi mong account/API hoạt động; không dùng ephemeral disk cho SQLite/uploads. Dockerfile đã chuẩn bị nhưng cần build/chạy thực tế.

Nếu có hạ tầng/quyền được cấp hợp lệ, triển khai và xác minh từ browser bên ngoài: health, free file, signup/login, cookie HTTPS, premium 401/403, admin và dữ liệu sau restart. Không tự tạo account hosting, dùng token nội bộ hay bịa public URL. Khi thiếu hạ tầng, báo chính xác thiếu gì sau khi local app và runbook đã hoàn thiện.

## Chỉ đọc tài liệu dài khi cần

- `handover/TECHNICAL.md`: schema, API contracts, security, upload/video và source map.
- `handover/PRODUCT.md`: từng bài/tài nguyên và yêu cầu sản phẩm đầy đủ.
- `handover/DESKTOP.md`: PowerShell/macOS/Linux/browser/admin/deploy commands.
- `handover/VALIDATION.md`: bằng chứng kiểm tra thực.
- `handover/EXECUTION.md`: runbook triển khai, backlog và nghiệm thu.

Các tài liệu nói chưa commit/push hoặc remote rỗng là trạng thái **trước thao tác chuyển source sang GitHub**. Kiểm tra Git refs hiện tại để biết trạng thái mới; không suy luận từ archive cũ. Bản HTML/ZIP không phải website public.

Hãy bắt đầu chạy ứng dụng và mở browser ngay. Báo kết quả ngắn: địa chỉ thật để mở, các thay đổi cần thiết, test và blocker còn lại. Không hỏi lại, không dừng sau một kế hoạch.
