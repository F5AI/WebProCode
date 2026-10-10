# F5 AI Studio

Website tiếng Việt chia sẻ tài nguyên làm phim AI cho người mới. Bản miễn phí bao quát quy trình hoàn thành một phim ngắn 3 phút; Studio Club mở bộ tài nguyên giúp làm nhanh, dễ và tiết kiệm hơn.

Để xem ngay mà không cài Node.js, tải `website-preview.html` rồi mở bằng trình duyệt. Bản ngoại tuyến có tìm kiếm, lọc, lưu bài, hướng dẫn và tải file miễn phí; tài khoản, quản trị và thanh toán cần website được triển khai. Xem [OPEN-WEBSITE.md](OPEN-WEBSITE.md) để mở bản xem trước hoặc triển khai bản đầy đủ. Tạo lại HTML bằng `npm run preview:export`.

Để chuyển sang Claude Code Desktop, đọc [HANDOVER.md](HANDOVER.md), chọn thư mục project đã giải nén và dùng prompt `handover/AGENT-PROMPT.md`. Gói đầy đủ có thể tạo lại bằng `python scripts/package-handover.py`; Python chỉ dùng cho đóng gói, không cần để chạy website.

## Demo cục bộ bản production

```bash
node scripts/demo-local.mjs
```

Trên Windows có thể bấm `start-demo.cmd`. Lệnh build frontend khi cần, chạy API + frontend cùng cổng `http://localhost:3080`, dùng database riêng `.data-demo/` và bank demo ghi rõ chưa phải tài khoản thật. Tài khoản quản trị demo nằm trong `.env.demo` (tự tạo, đã gitignore). Dữ liệu thật trong `.data/` không bị chạm.

## Chạy trong môi trường phát triển

Yêu cầu Node.js **24 trở lên** (dùng SQLite tích hợp), npm. Không cần cơ sở dữ liệu hoặc dịch vụ trả phí bên ngoài.

```bash
cd /workspace/WebProCode
npm ci --cache /workspace/.npm-cache
npm run dev
```

Vite dùng cổng 5173, API dùng cổng 3001. Vite chuyển tiếp `/api` về API. Giao diện tự cập nhật khi sửa frontend; khởi động lại `npm run dev` sau khi sửa mã backend hoặc biến môi trường. `.env` tùy chọn được đọc bởi Node, không cần tạo để dùng thư viện miễn phí và tài khoản. Dùng checkout hiện có của cloud task; mỗi task đã được cô lập, không cần tạo Git worktree.

## Các chức năng

- Thư viện bài viết, hướng dẫn, workflow; tìm kiếm tiếng Việt có/không dấu và lọc chủ đề.
- Lộ trình 4 chặng; lưu bài trên trình duyệt; đường dẫn chia sẻ bằng `?resource=<id>`.
- 8 bài thực hành, 14 file miễn phí, 3 file cao cấp ban đầu. Hướng dẫn HTML ngoại tuyến, prompt Markdown, shot list 180 giây, mẫu phụ đề và workflow ComfyUI tạo ảnh.
- Đăng ký, đăng nhập, phiên tài khoản và quyền thành viên; file cao cấp được kiểm tra quyền ở máy chủ.
- Đăng ký quan tâm được lưu nếu CLB chưa nhận thanh toán. Không giả lập thanh toán hoặc tự cấp quyền.
- Chuyển khoản theo mã đơn khi đã cấu hình tài khoản nhận; quản trị viên đối chiếu và xác nhận để mở 30 ngày. Không tự động gia hạn. Xác nhận lại cùng đơn không cộng quyền thêm lần nữa.
- Quản trị viên đăng/sửa/xóa tài nguyên, tải file và video miễn phí/cao cấp, quản lý đơn và danh sách quan tâm.

## Mở tài khoản quản trị và thanh toán

Copy `.env.example` thành `.env` ở máy của bạn. Điền email quản trị và mật khẩu riêng dài ít nhất 12 ký tự trong file cục bộ hoặc qua hệ thống quản lý secrets của nơi triển khai. Không commit file hoặc đưa mật khẩu vào chat.

```bash
npm run admin
```

Sau khi tạo thành công, xóa `F5AI_ADMIN_PASSWORD` khỏi `.env`; tài khoản đã được lưu với mật khẩu băm. Đăng nhập tài khoản đó để thấy **Quản lý Studio** trong menu. Không có tài khoản hoặc mật khẩu quản trị mặc định.

Điền `BANK_NAME`, `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME` rồi khởi động lại API để nhận đăng ký trả phí. Mức khởi điểm được đề xuất là **199.000đ / 30 ngày**; giá và thời hạn nằm trong hằng số `PLAN_PRICE`, `PLAN_DAYS` ở `server/index.mjs`. Thông tin tài khoản nhận sẽ hiển thị công khai cho người chuyển khoản. Chỉ duyệt đơn sau khi đã đối chiếu khoản nhận thực tế.

## Nội dung và dữ liệu

`server/content.json` chứa bộ bài ban đầu. Nội dung do quản trị viên cập nhật, tài khoản, đơn, đăng ký quan tâm và phiên nằm trong `.data/club.sqlite`; file tải lên nằm trong `.data/uploads/`. Giữ cả thư mục `.data` trên storage bền vững và sao lưu dữ liệu trước khi thay đổi môi trường triển khai. Bài cơ bản có file trong `server/assets/free/`; tài nguyên cao cấp ở `server/assets/premium/`, không đặt trong `public/`.

Hình minh họa được tạo riêng, đóng gói cục bộ, không phụ thuộc CDN ảnh hoặc font bên ngoài. Bộ bài mẫu hiện **chưa có video giảng viên**; giao diện ghi rõ trạng thái này. Người quản trị có thể tải video hướng dẫn thật lên sau. Các công cụ không hứa hẹn doanh thu hoặc tự tạo bộ phim bằng một lần bấm.

Workflow tạo ảnh yêu cầu checkpoint SD1.5 hợp lệ do người học tự cài; bộ video yêu cầu mô hình và GPU phù hợp theo tài liệu chính thức. Nếu chưa có GPU, có thể hoàn thành bản animatic bằng ảnh, lời thoại và chuyển động khung hình. Không kèm mô hình AI, ComfyUI runtime hay GPU. Workflow đã được kiểm tra cấu trúc, **chưa được render trên GPU** trong môi trường này.

## Kiểm tra và bản production

```bash
npm test
npm run build
npm start
```

`npm start` phục vụ cả frontend đã build và API ở cổng `PORT` (mặc định 3001). Triển khai công khai sau HTTPS, đặt `APP_ORIGIN` đúng origin công khai; bật `TRUST_PROXY=1` khi có một reverse proxy đáng tin cậy. Cookie production dùng thuộc tính Secure. Các bài kiểm tra API chạy với database tạm, không sửa dữ liệu thật.

Kiểm tra giao diện bằng Chromium có sẵn trong môi trường cloud và Playwright được cài cùng dependencies:

```bash
npm run dev
# Trong terminal thứ hai:
npm run test:browser
```

Script browser dùng cổng 5173, kiểm tra PC/tablet/mobile và các thao tác thực. Ảnh kiểm tra nằm trong thư mục bị bỏ qua `.playwright/`. Khi chạy ngoài cloud, cài Chromium phù hợp và truyền `CHROMIUM_PATH` nếu cần. `BROWSER_BASE_URL` thay đổi địa chỉ của server dùng cho kiểm tra.

Kiểm tra riêng luồng quản trị và quyền trả phí với database tạm, tài khoản và thông tin ngân hàng thử:

```bash
npm run build
npm run test:admin
```

Bài kiểm tra này tự khởi động server riêng, đăng/sửa/gỡ bài qua giao diện, tải file HTML và video MP4, xác nhận đơn thử và kiểm tra mở quyền. Cần `ffmpeg` để tạo video fixture dài 1 giây; môi trường cloud hiện đã có. Database và file fixture được xóa sau khi chạy, không tác động dữ liệu thật. Đây là xác nhận chức năng phần mềm, không phải giao dịch ngân hàng thực tế.

## Cấu hình môi trường cloud

`install_script` và `start_skill` được lưu trong bản nháp cấu hình môi trường để cài lại và khởi động dịch vụ. Snapshot giữ file, nhưng không giữ tiến trình: task mới cần chạy lại server. Việc lưu bản nháp không tự xuất bản hoặc triển khai website. Chủ môi trường xem và lưu cấu hình trong Environment Settings, rồi Publish khi muốn dùng cho task sau.
