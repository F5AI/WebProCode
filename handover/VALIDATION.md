# Biên bản kiểm tra bàn giao

Kiểm tra lại ngày **10/10/2026**, khoảng **16:44–16:56 UTC**, trong môi trường cloud Linux. Phần kiểm tra chức năng dùng `/workspace/WebProCode`; phần kiểm tra đóng gói dùng bản giải nén mới hoàn toàn trong `/tmp`. Đây là kết quả thực thi thật, không phải danh sách kiểm tra dự kiến. Website chưa có địa chỉ công khai và chưa được triển khai lên hosting.

## 1. Môi trường đã dùng

| Thành phần | Giá trị đã kiểm tra |
| --- | --- |
| Node.js | `v24.19.0` |
| npm | `11.9.0` |
| Vite trong bản build | `6.4.4` từ lockfile |
| Browser tự động | Chromium hệ thống `/usr/bin/chromium`, qua Playwright đã cài trong dự án |
| Media fixture | FFmpeg `/usr/bin/ffmpeg`, tạo MP4 H.264 thật để kiểm tra video |
| Lưu trữ test | SQLite và thư mục upload tạm riêng trong `/tmp` |
| Giao diện được kiểm tra | Desktop, tablet, mobile và mobile nhỏ |

Các phiên kiểm tra trình duyệt dùng dữ liệu giả riêng. Không gửi tiền, không tạo tài khoản quản trị thật, không dùng ngân hàng thật, không sửa `.env`, không mở hoặc xóa database vận hành `.data/club.sqlite`.

## 2. Kết quả tổng thể

| Lệnh / hạng mục | Kết quả | Phạm vi thực sự được kiểm tra |
| --- | --- | --- |
| `npm test` | **PASS: 8/8**, không fail, không skip | API, tài khoản, phiên đăng nhập, quyền premium, thanh toán thủ công, CMS, upload và streaming |
| `npm run build` | **PASS** | TypeScript và Vite production build; 1.596 modules được biến đổi |
| `npm run test:browser` | **PASS** | Thư viện công khai, các bộ lọc, tìm kiếm, lộ trình, dialog, tải file, lưu bài, đăng ký/đăng nhập, quan tâm câu lạc bộ; 4 kích thước màn hình |
| `npm run test:admin` | **PASS**, có FFmpeg nên không bỏ qua video | Đăng/sửa/gỡ bài, upload file và video, phần xem trước, duyệt chuyển khoản và cấp quyền premium thực tế |
| `node scripts/export-preview.mjs` | **PASS** | Tạo HTML một file, 6.710.799 bytes, 8 tài nguyên, 14 file miễn phí khác nhau |
| `node tests/offline-preview.cjs` | **PASS** | HTML ngoại tuyến, 4 kích thước; hình và font nhúng; bộ lọc/tìm kiếm/lộ trình/lưu bài/tải HTML; không phát sinh request API hoặc asset ra mạng |
| `npm start` sau sửa tương thích shell | **PASS** | Production preloader, health, frontend build, 8 tài nguyên, đăng ký và cookie `Secure`; database tạm |
| Đóng server sau kiểm tra | **PASS sau SIGTERM vào launcher của chính phiên test** | Xác nhận cổng 3001 và 5173 đã đóng; fixture tạm đã được dọn |

`npm start` được agent kiểm tra riêng ở cổng 43127 với `NODE_ENV=development` của tiến trình cha, nhằm xác nhận `scripts/production-env.mjs` đặt lại `NODE_ENV=production` **trước** khi module server được chạy. Lệnh cuối cùng là:

```text
node --env-file-if-exists=.env --import ./scripts/production-env.mjs server/index.mjs
```

Kết quả thực tế: `/api/health` trả HTTP 200 và `{ "status": "ok" }`; frontend trả 200; danh sách có 8 tài nguyên; đăng ký tài khoản test trả 201 và `Set-Cookie` có `Secure`. Fixture riêng được xóa và cổng 43127 đã đóng. Chưa kiểm tra phiên browser qua HTTPS với reverse proxy thật.

## 3. Chi tiết 8 kiểm thử backend

Nguồn kiểm thử nằm trong `tests/*.test.mjs`. `npm test` báo 8 test đạt, tổng thời gian khoảng 2,2 giây trong lần chạy này.

1. **Đăng ký, đăng nhập, đăng xuất:** password được hash bằng scrypt; dữ liệu tài khoản tồn tại trong database; phiên và logout hoạt động.
2. **Tài nguyên miễn phí và bảo vệ premium:** bài/file miễn phí truy cập được; premium cần tài khoản và quyền thành viên.
3. **Thanh toán chưa cấu hình:** không tạo cơ chế thanh toán giả; đăng ký quan tâm được lưu và gọi lại không tạo bản ghi trùng.
4. **Cấp quyền sau duyệt:** yêu cầu tham gia chỉ kích hoạt khi admin duyệt; duyệt cùng yêu cầu lần hai không cộng thêm thời gian.
5. **Cross-origin và rate limit:** từ chối yêu cầu ghi khác origin và giới hạn lưu lượng đăng nhập lạm dụng.
6. **Bootstrap admin:** yêu cầu email/mật khẩu được cấu hình rõ ràng, không có tài khoản admin mặc định.
7. **CMS:** tạo, sửa và gỡ tài nguyên qua database; gỡ nội dung seed dùng tombstone, không viết lại file seed.
8. **Upload và video:** file tải lên trở thành download có kiểm tra quyền; free/premium video hỗ trợ byte range.

Các test này giúp xác nhận hành vi cốt lõi, không thay thế kiểm thử tải lớn, audit bảo mật chuyên biệt, hoặc kiểm tra hệ thống thanh toán của nhà cung cấp bên ngoài.

## 4. Kiểm tra browser công khai

### Các kích thước đã chạy

| Tên trong test | Kích thước viewport |
| --- | --- |
| `desktop` | 1440 × 1000 |
| `tablet` | 820 × 1180 |
| `mobile` | 390 × 844 |
| `mobile-small` | 360 × 800 |

Ở cả bốn kích thước, test xác nhận:

- Số thẻ tài nguyên bằng số tài nguyên API trả về; ảnh decode được và có kích thước thật.
- Không tràn ngang ở document/body, lộ trình và bên trong dialog tài nguyên.
- Bộ lọc chủ đề hoạt động; bộ lọc định dạng được kiểm tra khi control hiển thị ở kích thước tương ứng.
- Tìm kiếm tiếng Việt không dấu tìm thấy bài; chuỗi không khớp hiển thị trạng thái rỗng; xóa tìm kiếm khôi phục thư viện.
- Lộ trình có 4 giai đoạn; mở bài hiện hướng dẫn, cập nhật `?resource=...`; phím Escape đóng dialog và xóa tham số tài nguyên.
- Menu mobile mở/đóng được khi control mobile hiển thị.

Test tiếp tục xác nhận lưu bài còn sau reload; gỡ khỏi danh sách đã lưu; mở trực tiếp URL tài nguyên; tải file HTML có nội dung thực hành thật; guest bị 401 với premium; tài khoản thường bị 403; đăng ký/đăng xuất/đăng nhập hoạt động; đăng ký quan tâm câu lạc bộ có tính lặp an toàn và không tự cấp quyền trả phí. Không có lỗi runtime hoặc console browser trong toàn bộ lượt chạy.

Phiên này dùng database mới dưới `/tmp/f5ai-handover-browser-*`. Email synthetic do test tự sinh chỉ tồn tại trong fixture này, không được đưa vào dữ liệu bàn giao.

### Lệnh thực thi cho phiên browser này

Ở terminal thứ nhất, Linux/Bash:

```bash
task_validation_root=$(mktemp -d /tmp/f5ai-handover-browser-XXXXXX)
export DATABASE_PATH="$task_validation_root/club.sqlite"
export BANK_NAME='' BANK_ACCOUNT='' BANK_ACCOUNT_NAME=''
export F5AI_ADMIN_EMAIL='' F5AI_ADMIN_PASSWORD='' NODE_ENV=development
npm run dev
```

Ở terminal thứ hai, từ thư mục dự án:

```bash
npm run test:browser
```

Test mặc định dùng frontend dev ở cổng 5173. `BROWSER_BASE_URL` thay đổi được endpoint. Ngân hàng cần để trống cho test này vì test kiểm tra luồng **đăng ký quan tâm khi chưa mở thanh toán**. Test không tự cách ly database; việc dùng `DATABASE_PATH` tạm là chủ ý của phiên kiểm tra này. Không chạy test này trực tiếp vào production.

Trên Windows/macOS, xem `DESKTOP.md` để đặt biến môi trường và `CHROMIUM_PATH` theo hệ điều hành. Sau test, dừng launcher, xác nhận cả hai cổng đã đóng rồi chỉ xóa thư mục fixture mà chính phiên test tạo. Trong cloud này, Ctrl+C ở lớp PTY đã kết thúc shell nhưng launcher vẫn còn chạy; SIGTERM vào **PID launcher cụ thể của phiên test** đã đóng cả API và Vite. Không dùng lệnh dừng toàn bộ Node trên máy người dùng.

## 5. Kiểm tra CMS, thành viên và video

Lệnh thực thi:

```bash
npm run build
npm run test:admin
```

`tests/admin-browser.cjs` tự tạo Express server ở cổng ngẫu nhiên, database/upload tạm, mật khẩu ngẫu nhiên và thông tin ngân hàng có nhãn fixture. Test này không cần mở `npm run dev`.

Hành vi được xác nhận bằng thao tác UI thật:

1. Admin đăng nhập, đăng bài có 2 phần hướng dẫn, đính kèm HTML miễn phí/cao cấp và MP4 miễn phí/cao cấp. MP4 là video H.264 1 giây, được FFmpeg tạo trong fixture.
2. Trang admin hiển thị vừa màn hình desktop và mobile 390px, không tràn ngang bên trong dialog.
3. Guest tìm được bài mới, đọc đủ 2 phần, tải file HTML miễn phí có nội dung đúng, phát được video miễn phí. File/video premium trả 401.
4. Tài khoản thường tạo yêu cầu tham gia với thông tin ngân hàng test; premium vẫn trả 403 trước duyệt.
5. Admin thực hiện bước xác nhận chuyển khoản; người dùng kiểm tra lại trạng thái, nhận quyền thành viên; tải được HTML cao cấp và phát được video cao cấp thật.
6. Sửa bài rồi reload cho thấy dữ liệu mới; gỡ bài tạo tombstone; URL bài/download cũ trả 404, bài không còn trong tìm kiếm.
7. Không có lỗi runtime/console. Browser/server được đóng và toàn bộ fixture database/upload được dọn trong `finally`.

Nếu máy tiếp nhận chưa cài FFmpeg, test sẽ báo **SKIP video fixture** và vẫn chạy phần còn lại. Khi đó không được nói rằng kiểm tra video đã đạt. Lần kiểm tra được ghi ở đây có FFmpeg và đã thực hiện đủ upload, metadata và playback cho cả hai tier.

## 6. HTML ngoại tuyến: điều đã và chưa xác nhận

`website-preview.html` hiện tại được sinh từ production build và seed công khai: **8 bài, 14 file miễn phí khác nhau**, 6.710.799 bytes. Không nhúng password, tài khoản, session, database vận hành hoặc bytes của file cao cấp. HTML có thông báo rõ rằng tài khoản/thanh toán cần bản website được triển khai.

Kiểm thử có thể chạy lại từ mã nguồn, không cần server:

```bash
npm run preview:export
node tests/offline-preview.cjs
```

`npm run preview:export` tạo production build rồi sinh lại HTML. Test dùng đường dẫn tương đối theo thư mục dự án; đặt `CHROMIUM_PATH` theo `DESKTOP.md` khi Chromium không ở `/usr/bin/chromium`. Test chỉ đọc HTML/seed và ghi file bằng chứng vào `.playwright/`, không mở SQLite hoặc sửa `.env`. Browser context, browser và download tạm được dọn cả khi test thất bại; bản tải dùng làm bằng chứng được giữ có chủ ý ở `.playwright/offline-free-download.html`.

Trong lần kiểm tra này, Playwright đọc HTML từ đĩa rồi dùng `route.fulfill` đưa document vào origin test `http://offline-preview.test/`; mọi request khác bị chặn. Không có HTTP server thực, DNS thật hoặc API thật phục vụ origin này. Đây là cách kiểm tra chức năng của HTML tự chứa trong Chromium, **không phải kiểm tra native `file://`**.

Đã kiểm tra ở 1440/820/390/360px: toàn bộ ảnh nhúng hiển thị; 8 thẻ; bộ lọc chủ đề/định dạng khi hiển thị; tìm kiếm tiếng Việt không dấu/trạng thái rỗng; 4 bước lộ trình; dialog và Escape; không tràn ngang. Đã kiểm tra thêm:

- Lưu bài tồn tại sau reload trên origin test, hiện đúng trong danh sách đã lưu và gỡ khỏi danh sách được.
- Tải Blob HTML miễn phí có tên `.html` và nội dung thực hành thật, hơn 500 bytes.
- Premium có `locked=true`, URL premium là `null`.
- POST đăng ký trả 503 với thông báo cần triển khai; session vẫn `null`.
- Trong 7 lần điều hướng chỉ có request document test; không request API/ảnh/font ra mạng; không có lỗi runtime/console.

Native `file://` bị giới hạn bởi Chromium trong môi trường cloud, nên chưa xác nhận trên Chrome/Edge/Safari desktop thật. Agent tiếp nhận cần mở file đã tải xuống trên máy người dùng, thử localStorage, mở tài nguyên qua query string và tải file thực hành. Chính sách browser về `file://` và localStorage có thể khác nhau. Không dùng HTML ngoại tuyến để kiểm tra đăng nhập, thanh toán, admin hay cấp quyền premium.

## 7. Bằng chứng và cách đọc

Các artifact được test tạo trong `.playwright/`:

| File | Nội dung |
| --- | --- |
| `desktop.png` | Thư viện desktop 1440px, full page |
| `tablet.png` | Thư viện tablet 820px, full page |
| `mobile.png` | Thư viện mobile 390px, full page |
| `mobile-small.png` | Thư viện mobile nhỏ 360px, full page |
| `mobile-resource.png` | Dialog tài nguyên trên mobile |
| `admin-desktop.png` | Quản trị bài và file trên desktop |
| `admin-mobile.png` | Quản trị trên mobile |
| `free-download-roadmap.html` | File thực hành tải từ API thật |
| `offline-free-download.html` | File thực hành tải từ HTML tự chứa |

Thư mục `.playwright/` được Git ignore. Bản đóng gói có thể sao chép các bằng chứng sang `handover/evidence/`; hãy dùng manifest của gói để biết chính xác file nào được kèm. Ảnh là bằng chứng giao diện tại thời điểm chụp, không phải địa chỉ website. Các ảnh `desktop-fold.png`, `mobile-fold.png`, `portable-*-fold.png` có từ phiên trước, không nằm trong kết quả ảnh chụp mới của lượt QA này.

## 8. Giới hạn phải giữ nguyên trong handover

- **Chưa deploy công khai:** chưa có URL Internet, domain, HTTPS, reverse proxy hoặc hosting account được cấu hình. Publish môi trường Codex không publish website.
- **Chưa chạy Docker build/container trong lượt này:** Dockerfile đã chuẩn bị, nhưng kết quả native Node không chứng minh image Docker đã chạy.
- **Chưa xác nhận Windows/macOS thực tế:** lệnh `npm start` đã bỏ cú pháp gán biến POSIX để phù hợp shell, nhưng test thực thi vẫn trên Linux.
- **Chưa thử GPU/ComfyUI render:** workflow đã có cấu trúc và tài liệu thực hành; chưa cài model/GPU hoặc sản xuất một phim 3 phút thật trong môi trường này.
- **Chưa có video bài giảng thật:** test MP4 là fixture 1 giây; không phải nội dung học. Các bài seed có phần thực hành văn bản và thông báo video chưa sẵn sàng.
- **Chưa có thanh toán tự động:** hiện là chuyển khoản và admin duyệt, quyền 30 ngày; không tự trừ tiền hàng tháng. Giá 199.000đ là đề xuất sản phẩm đã được dùng trong mã nguồn.
- **Chưa mở bán thật:** thông tin ngân hàng/admin thật cần cấu hình riêng, không được sinh hoặc đưa bí mật vào archive.
- **Chưa kiểm thử tải lớn/khôi phục backup/observability:** agent tiếp nhận cần xác minh trước khi vận hành cho người dùng thật.

## 9. Tiêu chí xác nhận hoàn tất của agent tiếp nhận

Đừng chỉ gửi ảnh, báo build thành công hoặc nói mã nguồn đã xong. Lần bàn giao tiếp theo phải có website mà người dùng mở được: trên máy desktop dùng địa chỉ local đang chạy, hoặc URL HTTPS công khai khi đã triển khai vào hosting được cung cấp. Phải xác nhận health, ảnh/font, thư viện, download, đăng nhập, admin và quyền premium trên chính môi trường đích; ghi rõ các phần cần ngân hàng/video/domain thật nếu còn thiếu.

Chạy lại các lệnh kiểm thử theo môi trường của máy tiếp nhận, ghi phiên bản runtime, kết quả PASS/SKIP và đường dẫn bằng chứng. Giữ dữ liệu thật riêng với test fixture; không chạy luồng thanh toán/tạo tài khoản synthetic lên production khi chưa được phép.

## 10. Kiểm tra chính file ZIP bằng bản giải nén sạch

Ngày 10/10/2026, khoảng 16:54–16:56 UTC, đã dùng Python `zipfile` giải nén **`f5-ai-studio-claude-handover.zip`** vào một thư mục `/tmp/f5ai-handover-clean-*` mới. Kiểm tra mọi đường dẫn trong archive nằm trong thư mục đích trước khi giải nén. Gói được kiểm tra có **111 entries**, **19.299.012 bytes**; thư mục dự án bên trong là `f5-ai-studio/`.

Trước khi cài dependency, xác nhận bản giải nén không có `node_modules`, `.env` hoặc `.data`. Các lệnh sau chạy **trong dự án giải nén**, không chạy trong checkout gốc và không dùng `node_modules` của checkout gốc:

```bash
npm ci --cache /workspace/.npm-cache --no-fund --no-audit
npm test
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:preview
```

| Hạng mục bản giải nén | Kết quả thực tế |
| --- | --- |
| Cài theo lockfile | **PASS**, thêm 145 packages, khoảng 2 giây |
| Backend | **PASS 8/8**, 0 fail, 0 skip |
| Build | **PASS**, TypeScript và Vite 6.4.4; 1.596 modules |
| HTML ngoại tuyến từ gói ZIP | **PASS** cả desktop/tablet/mobile/mobile nhỏ; 8 bài; bộ lọc/tìm kiếm/lộ trình/dialog; lưu và gỡ bài; tải HTML có nội dung thật |
| Quyền và mạng ngoại tuyến | Premium khóa, ghi dữ liệu trả 503, session null; 7 request document được intercept, không request API/asset ngoài, không lỗi browser |
| Dọn fixture | Browser/context/download tạm đóng; toàn bộ thư mục giải nén riêng đã xóa, không đụng thư mục dự án gốc hoặc dữ liệu vận hành |

`--cache /workspace/.npm-cache` là đường dẫn cache của môi trường kiểm tra này, không phải cấu hình bắt buộc của dự án. Trên máy desktop dùng `npm ci --no-fund --no-audit` hoặc cache riêng của máy và đặt `CHROMIUM_PATH` theo `DESKTOP.md`.

HTML trong gói đã được kiểm tra trực tiếp mà không sinh lại trước test, nhằm xác nhận artifact bàn giao tự chạy được. Build mới từ source cũng đã đạt. Phần này chưa chạy lại server/CMS/browser online trên bản giải nén; các kiểm tra đó đã đạt ở các mục trước với cùng mã nguồn. Không mở cổng server trong phiên kiểm tra ZIP.

Gói cuối sẽ được sinh lại sau khi thêm biên bản này và manifest cuối, nên kích thước/hash có thể khác gói kiểm tra ban đầu; không có thay đổi mã ứng dụng hoặc kiểm thử sau kết quả này. Xem `handover/MANIFEST.json` để kiểm tra từng file và dùng `f5-ai-studio-claude-handover.zip.sha256` đi kèm để xác nhận SHA-256 của archive cuối.
