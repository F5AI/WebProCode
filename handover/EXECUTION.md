# Kế hoạch thực thi sau bàn giao

Tài liệu dành cho agent đang có quyền thao tác local source. Không phải danh sách tính năng đã hoàn thành. Quyền chủ động của người dùng không cung cấp sẵn tài khoản hosting, domain, email admin hoặc thông tin ngân hàng.

## P0 — mở website thật trên desktop

1. Xác nhận thư mục giải nén có `package.json`, `src/`, `server/`, `CLAUDE.md`; Node 24+. Dùng đúng source trong gói, không clone remote rỗng rồi bỏ source.
2. `npm ci`, `npm test`, `npm run build`. Nếu lỗi Node/lockfile, sửa nguyên nhân trước; không tự nâng dependency đại trà.
3. `npm run dev` trong terminal sống; frontend 5173, API 3001. Xác nhận `/api/health`, `/api/resources`, một download free có bytes thật. Backend/env sửa cần restart.
4. Desktop của người dùng mở `http://localhost:5173`. Nếu agent chạy trên máy ảo/remote của Claude, xác minh chế độ preview/port forwarding thực sự hỗ trợ trước khi đưa URL. Localhost chỉ đúng trên cùng máy chạy server.
5. Kiểm tra viewport 1440, 820, 390 và 360; tìm kiếm không dấu, filter, lưu/reload, URL resource, modal Escape và file download. Giữ server đến khi người dùng có cách mở.

Nghiệm thu: mở được UI và bài thật, ảnh/font tải đủ, không tràn ngang, tải file được, lỗi account/network có thông báo dễ hiểu. Offline HTML chỉ là phương án xem miễn phí bổ sung, không thay thế bản server có tài khoản.

## P1 — triển khai online có lưu dữ liệu

### Kiến trúc mặc định đề xuất

Một dịch vụ Node 24/container chạy frontend đã build và API cùng origin, reverse proxy HTTPS, persistent volume cho `.data`. Phù hợp với Express/SQLite hiện có, giảm số dịch vụ phải vận hành. Không dùng static-only hosting làm bản full stack. Với serverless ephemeral filesystem, phải thiết kế lại storage/database trước, không chỉ copy Dockerfile sang.

Chọn một replica cho SQLite hiện tại. Nếu cần nhiều instance, đổi backend storage và upload storage, bổ sung migration và kiểm thử phù hợp; đây là thay đổi lớn không cần cho MVP.

### Kiểm tra trước triển khai

- Có quyền host/container, HTTPS domain hoặc provider URL, persistent disk, cổng nội bộ, cách cài secrets và backup.
- `APP_ORIGIN` là origin HTTPS đúng, không có pathname; `TRUST_PROXY=1` chỉ khi đúng một reverse proxy tin cậy.
- Bản public không chứa `.env`, database, source premium công khai, screenshot chứa account thật hay ZIP bàn giao.
- Seed vẫn đọc được; upload folder có quyền ghi cho runtime; hạn chế body reverse proxy khớp upload tối đa 100 MB.
- Không cấu hình bank giả để làm checkout có vẻ hoạt động. Nếu chưa có thông tin nhận thật, để màn hình quan tâm như hiện tại.

### Native Node

```text
npm ci
npm run build
npm start
```

`npm start` đặt chế độ production; cookie Secure cần HTTPS cho tài khoản. Để kiểm tra đăng nhập trên HTTP local, dùng `npm run dev` hoặc lệnh backend ở môi trường development. Không bỏ Secure trong production chỉ để test nhanh.

### Docker (cần agent tiếp quản thực sự build/chạy)

Dockerfile có hai stage Node 24, build frontend, prune dev deps, runtime user `node`, healthcheck `/api/health`. Bản bàn giao chưa xác nhận Docker build/runtime. Các lệnh sau là runbook đề xuất, không phải bằng chứng đã chạy.

Tạo `.env` riêng từ `.env.example`; đặt `APP_ORIGIN=https://your-domain.example` bằng domain thật của bạn, `TRUST_PROXY` theo topology. Giá trị `.example` ở đây chỉ là placeholder, không phải website đã triển khai. Mật khẩu bootstrap đặt tạm trong secret manager hoặc env file riêng, không gửi trong chat.

```bash
docker build -t f5-ai-studio .
docker volume create f5-ai-studio-data
# Chỉ khi đã cung cấp email và mật khẩu admin riêng:
docker run --rm --env-file .env \
  -v f5-ai-studio-data:/app/.data \
  f5-ai-studio node server/index.mjs --create-admin
# Xóa F5AI_ADMIN_PASSWORD khỏi env sau khi bootstrap thành công.
docker run -d --name f5-ai-studio --restart unless-stopped \
  --env-file .env \
  -p 127.0.0.1:3001:3001 \
  -v f5-ai-studio-data:/app/.data \
  f5-ai-studio
```

Các lệnh xuống dòng ở trên dùng shell POSIX; trên PowerShell viết một dòng hoặc dùng backtick theo shell. Đặt reverse proxy TLS phía trước binding loopback 3001. Trên provider container, dùng cách publish/healthcheck/persistent volume của provider thay vì copy binding loopback máy chủ riêng.

### Xác minh từ bên ngoài

1. Mở URL HTTPS thật từ browser không nằm trên máy chạy app; xem library và một bài.
2. Tải một file free. Guest premium phải bị từ chối ở server ngay cả khi copy URL trực tiếp.
3. Đăng ký tài khoản thử riêng, login/logout; cookie có HttpOnly/SameSite và Secure đúng production.
4. Kiểm tra admin bằng credential riêng; tạo tài nguyên thử và xóa sau xác minh. Video thật nếu có: MIME/Range đúng và seek hoạt động.
5. Restart/redeploy và xác minh account/content/upload giữ lại. Kiểm tra việc restore backup trước khi coi vận hành đủ.
6. Không tạo/duyệt một giao dịch “thử” trên database thật như thể đã chuyển tiền. Luồng paid được kiểm tra bằng fixture ở test độc lập; real approval chỉ sau đối chiếu.

Bàn giao URL, nơi lưu dữ liệu, lệnh restart, cách backup, cách cập nhật, admin đã bootstrap hay chưa, bank đã cấu hình hay chưa; không ghi secret values.

## P2 — hoàn thiện nội dung để có thể mở bán

- Bổ sung video giảng viên thật có free preview và bản đầy đủ cho member. Kích thước lớn hơn 100 MB cần chuẩn bị giải pháp upload/stream/storage phù hợp, không tăng limit mù quáng.
- Xây dựng và render thử workflow video open source trên phần cứng thật, ghi tên/version/checkpoint, GPU/VRAM, thời gian, số frame, fps, chi phí và giấy phép. Thêm workflow nâng cấp có lợi ích đo được.
- Hoàn thành một phim tham chiếu 180 giây với bộ asset/source thật, đối chiếu các bước bài học. Hình astronaut minh họa hiện khác truyện mẫu “Chiếc ô cuối cùng”; có thể thay bằng bộ minh họa đồng bộ khi sản xuất thật.
- Review nội dung premium seed: ba file hiện là bộ khởi đầu, chưa chứng minh mức tăng tốc/thu nhập; không quảng bá như workflow video cao cấp đã thực nghiệm.
- Chốt thông tin vận hành thực: chủ thể nhận thanh toán, hỗ trợ, điều kiện hoàn tiền/hủy, thời hạn truy cập. Không bịa địa chỉ/contact hoặc văn bản pháp lý của chủ dự án.

Nghiệm thu: học viên có thể theo tài liệu hoàn thành sản phẩm được mô tả, biết yêu cầu GPU/model và chi phí; video phát được; file thực hành đúng nội dung; quyền cao cấp được server bảo vệ.

## P3 — các hạn chế hiện tại cần cân nhắc sửa

| Vấn đề | Tình trạng/ảnh hưởng | Hướng xử lý đề xuất |
| --- | --- | --- |
| Chưa có ngày xuất bản/sort theo ngày | Option có key `newest` hiện đã ghi nhãn “Bước cuối trước” và sort step giảm dần | Giữ nhãn đúng hiện có; chỉ thêm timestamp/sort thời gian nếu thực sự cần |
| Gia hạn khi member còn hạn | API cộng từ ngày hết hạn, UI chưa có CTA gia hạn chủ động | Bổ sung CTA/gia hạn rõ, vẫn manual approval; test chống cộng hai lần |
| Upload theo đuôi file | Không sniff MIME, scan nội dung hay quota; file mồ côi chưa cleanup | Hardening theo quy mô thực, validation MIME, quota, cleanup có tham chiếu, tránh xóa file đang dùng |
| Tất cả article sections công khai | Chỉ files/video gated | Nếu muốn premium text: thêm schema và backend gating, không chỉ ẩn ở UI |
| Tài khoản thiếu reset password/verify email | Support chủ yếu thủ công | Ưu tiên quy trình khôi phục rõ; email service chỉ khi có tài khoản hợp lệ |
| Giá và thời hạn hiển thị ở nhiều chỗ | `PLAN_PRICE`/`PLAN_DAYS` server và chuỗi UI ở `src/App.tsx` cần cùng giá trị | Khi đổi plan, sửa thống nhất hoặc lấy config server làm nguồn hiển thị |
| Rate limit RAM theo instance | Không bền qua restart/scale | Thích hợp MVP một instance; giải pháp shared store khi scale |
| Chưa có lịch sử duyệt/hoàn tiền đầy đủ | Vận hành paid còn tối giản | Audit log và hành vi cancel/refund khi quy trình nghiệp vụ đã rõ |
| SEO article modal | Chủ yếu một SPA, article mở theo query | Public article route/metadata có nội dung rõ khi SEO trở thành ưu tiên |

Không tự coi P3 là scope bắt buộc trước khi P0/P1 xong. Nếu sửa một mục, cập nhật schema/API/docs/test thật và bảo toàn dữ liệu cũ.

## Backup, cập nhật và rollback

- Với SQLite và upload local, backup **toàn bộ** `.data`, gồm SQLite/WAL/SHM nếu đang có. Cách đơn giản an toàn: dừng app, copy `.data` sang bản backup có ngày giờ và quyền truy cập riêng, rồi khởi động lại. Với backup online, dùng cơ chế SQLite backup phù hợp, không copy mỗi `club.sqlite` đang ghi.
- Env/secrets giữ ngoài source và ngoài public artifacts; chuyển bằng secret manager/cơ chế an toàn của môi trường.
- Trước update giữ artifact/image cũ + backup dữ liệu. Build bản mới, test, thay runtime; không xóa volume. Có migration thì rollback database phải được thiết kế và thử riêng.
- Khôi phục vào thư mục/volume thử trước, xác nhận users, bài override, file/video references. Không ghi đè production để “thử restore”.

## Cách báo cáo cuối cho chủ dự án

Đầu tiên nêu đường dẫn thực để mở, phân biệt rõ local/public/offline. Sau đó nêu phần đã thay đổi, kiểm thử cần thiết, dữ liệu/paid activation và giới hạn còn lại. Không kết thúc bằng ảnh-only, đường dẫn cloud localhost hoặc câu “Publish để lên website”.
