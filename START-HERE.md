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
- Thiết kế tối (navy sẫm `#0b0e14` + trắng ngà `#eef1f6`, điểm nhấn cam than `#ff6a3d`, vàng kim cho khu CLB), phong cách tối giản công nghệ, ảnh điện ảnh, font Be Vietnam Pro local; sidebar PC và điều hướng mobile. Đổi từ bản sáng ngày 11/10/2026 theo yêu cầu chủ dự án (FIX-001, ADR-001). Toàn bộ màu là token trong `:root` của `src/styles.css`. Responsive 1440/820/390 px đã chụp lại với theme tối.

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
| `PORT`, `HOST` | Cổng production/API, mặc định 3001 và `0.0.0.0`; dev launcher cố định 3001 |
| `DATABASE_PATH` | Database riêng cho test/custom deployment; mặc định `.data/club.sqlite` |
| `APP_ORIGIN` | Origin HTTPS public chính xác khi triển khai |
| `TRUST_PROXY=1` | Chỉ khi đúng một reverse proxy đáng tin cậy |
| `COOKIE_SECURE=0` | Chỉ cho demo HTTP trong mạng nội bộ; production giữ trống (cookie Secure) |
| `PLAN_PRICE`, `PLAN_DAYS` | Giá và số ngày của gói CLB; mặc định 199000 / 30, UI đọc từ API |
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

Đã kiểm tra trên Linux: 8/8 backend, build, 4 viewport browser, CMS/admin/membership/uploads/video fixture và offline HTML. Bản ZIP trước đó đã cài/run test từ giải nén sạch. Đã kiểm tra lại trên Windows 11 ngày 11/10/2026 (Node 25, Google Chrome làm Chromium cho test): 8/8 backend, build, 4 viewport browser, CMS/admin/membership/video fixture và offline HTML đều PASS; chi tiết và lưu ý Windows trong `handover/VALIDATION.md` mục 11. Chưa thực thi macOS, Docker hoặc GPU; không biến những runbook đó thành bằng chứng đã chạy.

## Triển khai tiếp theo

Ưu tiên một instance Node 24/container + HTTPS + persistent `.data`. Không deploy chỉ `dist/` lên static hosting rồi mong account/API hoạt động; không dùng ephemeral disk cho SQLite/uploads. Dockerfile đã chuẩn bị nhưng cần build/chạy thực tế.

Nếu có hạ tầng/quyền được cấp hợp lệ, triển khai và xác minh từ browser bên ngoài: health, free file, signup/login, cookie HTTPS, premium 401/403, admin và dữ liệu sau restart. Không tự tạo account hosting, dùng token nội bộ hay bịa public URL. Khi thiếu hạ tầng, báo chính xác thiếu gì sau khi local app và runbook đã hoàn thiện.

## Chỉ đọc tài liệu dài khi cần

- `handover/TECHNICAL.md`: schema, API contracts, security, upload/video và source map.
- `handover/PRODUCT.md`: từng bài/tài nguyên và yêu cầu sản phẩm đầy đủ.
- `handover/DESKTOP.md`: PowerShell/macOS/Linux/browser/admin/deploy commands.
- `handover/VALIDATION.md`: bằng chứng kiểm tra thực.
- `handover/EXECUTION.md`: runbook triển khai, backlog và nghiệm thu.
- `handover/PUBLISH.md`: lộ trình đưa lên Internet bằng `deploy/docker-compose.yml` + Caddy HTTPS; việc cần chủ dự án cấp (VPS, domain, bank) và bảng nghiệm thu từ máy ngoài.

Các tài liệu nói chưa commit/push hoặc remote rỗng là trạng thái **trước thao tác chuyển source sang GitHub**. Kiểm tra Git refs hiện tại để biết trạng thái mới; không suy luận từ archive cũ. Bản HTML/ZIP không phải website public.

Trên Windows: chạy `start-windows.cmd` (hoặc `npm.cmd run dev` nếu PowerShell chặn `npm.ps1`) rồi mở `http://localhost:5173`.

## Demo cục bộ bản production (không chạm dữ liệu thật)

`start-demo.cmd` (Windows) hoặc `node scripts/demo-local.mjs` build frontend khi cần rồi chạy API + frontend cùng cổng `http://localhost:3080` với database riêng `.data-demo/`, bank demo ghi rõ "chưa phải tài khoản thật" và một tài khoản quản trị demo. Email/mật khẩu quản trị demo nằm trong `.env.demo` (tự tạo lần đầu, đã gitignore); không dùng cho website thật. Demo chạy HTTP nên script đặt `COOKIE_SECURE=0`; website thật dùng HTTPS và không đặt biến này.

## Bảo mật đã rà soát (11/10/2026)

Header `Content-Security-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS khi chạy HTTPS; chặn ghi khi `Sec-Fetch-Site: cross-site` hoặc Origin lạ, origin dev chỉ được phép ngoài production; khóa đăng nhập theo email (10 lần sai/15 phút) bên cạnh giới hạn theo IP (30/15 phút); upload kiểm tra chữ ký nội dung (MP4/WebM/PDF/ZIP/text) ngoài đuôi file; hash scrypt chạy bất đồng bộ; file tải về có tên dễ đọc; asset build cache 1 năm, `index.html` luôn revalidate; `/api/health` báo trạng thái database và thư mục upload. Chi tiết trong `handover/TECHNICAL.md` mục 13 và `handover/VALIDATION.md` mục 12. Chưa có: xác minh email, đặt lại mật khẩu, 2FA, quét mã độc file, rate limit chia sẻ nhiều instance.

Hãy bắt đầu chạy ứng dụng và mở browser ngay. Báo kết quả ngắn: địa chỉ thật để mở, các thay đổi cần thiết, test và blocker còn lại. Không hỏi lại, không dừng sau một kế hoạch.
