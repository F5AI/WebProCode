# Chạy và tiếp quản bằng Claude Code trên máy cá nhân

Đây là hướng dẫn cho agent thực thi và người nhận bàn giao trên Windows, macOS hoặc Linux. Toàn bộ mã nguồn là dự án Node.js thông thường; không cần môi trường Codex cloud để chạy lại.

## 1. Mở đúng chế độ trong Claude Desktop

1. Giải nén gói bàn giao vào một thư mục làm việc riêng, ví dụ `C:\Projects\F5AIStudio` hoặc `~/Projects/F5AIStudio`. Không chạy từ bên trong file ZIP.
2. Nếu phiên bản Claude Desktop và tài khoản của bạn có tab **Code**, chọn thư mục vừa giải nén làm thư mục dự án. Chọn môi trường chạy **local/máy cá nhân** nếu giao diện có tùy chọn này. Tên và vị trí nút có thể khác giữa các phiên bản; không giả định Desktop luôn cung cấp terminal hoặc runtime Node sẵn có.
3. Mở phiên làm việc tại chính thư mục có `package.json` và `CLAUDE.md`. Đưa agent nội dung của `handover/AGENT-PROMPT.md` và yêu cầu đọc `CLAUDE.md` trước khi chạy lệnh. Không dán `.env`, mật khẩu hay database vào chat.
4. Nếu Desktop không có Code hoặc chế độ local, dùng Claude Code CLI đã được cài theo hướng dẫn chính thức của Anthropic: mở terminal trong thư mục dự án, chạy `claude`, rồi đưa cùng prompt. Chế độ chat thông thường chỉ đính kèm file không đồng nghĩa agent có quyền chạy Node, truy cập thư mục hoặc triển khai dịch vụ.
5. Xem các thay đổi do agent tạo trong diff và kết quả lệnh. Giao diện Desktop có thể có quy trình cấp quyền chạy công cụ riêng; không tắt cơ chế bảo vệ của máy để thực hiện dự án này.

Các cổng local bên dưới mở được trên **máy cá nhân đang chạy ứng dụng**. Môi trường Codex cloud trước đây không cung cấp chức năng mở cổng trong giao diện; địa chỉ local ở máy cloud không phải đường dẫn website công khai cho người nhận.

## 2. Kiểm tra điều kiện máy

- Node.js **24 trở lên**; ưu tiên bản Node 24 LTS mới nhất. Backend dùng `node:sqlite` tích hợp, không dùng MySQL/PostgreSQL và không cần cài SQLite riêng.
- npm đi cùng Node. Chạy `node --version` và `npm --version` trong terminal của chính phiên Claude Code; Desktop có thể cần mở lại sau khi cài Node để nhận PATH mới.
- Có mạng khi chạy `npm ci` lần đầu. Bộ nguồn không chứa `node_modules` hoặc trình duyệt Playwright.
- Một trình duyệt Chrome/Edge/Firefox/Safari để dùng website. Các bài kiểm tra tự động hiện dùng **Chromium**, không khẳng định đã kiểm tra bằng cả bốn trình duyệt.
- Git chỉ cần nếu tiếp tục làm việc qua repository. `ffmpeg` chỉ phục vụ fixture video trong kiểm tra quản trị; website không gọi ffmpeg để vận hành.

Nếu PowerShell chặn `npm.ps1` bởi execution policy, dùng `npm.cmd` và `npx.cmd` thay cho `npm`/`npx`, hoặc chạy terminal Command Prompt. Không cần thay đổi execution policy toàn máy. Node 22/20 không phải môi trường đã hỗ trợ; không cố bỏ qua yêu cầu engine.

## 3. Khởi động lần đầu

Mở terminal tại thư mục dự án rồi chạy các lệnh sau, mỗi lệnh một lần:

```text
node --version
npm --version
npm ci
npm test
npm run build
npm run dev
```

Giữ terminal cuối mở. Website phát triển nằm tại `http://localhost:5173`; API tại cổng 3001. Vite chuyển tiếp `/api` về backend. Mở địa chỉ bằng trình duyệt trên cùng máy; đây là bản đầy đủ có tài khoản và dữ liệu, khác với file HTML ngoại tuyến.

Frontend cập nhật tự động khi sửa mã. Backend chạy Node thường, cần dừng bằng Ctrl+C rồi chạy lại `npm run dev` sau khi sửa `server/` hoặc `.env`. Sau khi dừng, kiểm tra hai cổng đã đóng trước khi khởi động lại; một số terminal wrapper có thể để tiến trình con còn chạy. Không chạy thêm bản dev thứ hai: cổng 5173 được cấu hình `strictPort` và proxy frontend luôn trỏ cổng 3001. Nếu cổng bị chiếm, xác định tiến trình đang dùng trước khi dừng; không kết thúc mọi tiến trình Node trên máy.

### `.env` có thể để chưa tạo khi xem thử

Không cần thông tin ngân hàng, tài khoản admin hay dịch vụ trả phí để dùng thư viện miễn phí và đăng ký tài khoản thường. Backend tự tạo `.data/club.sqlite` và thư mục uploads khi cần. Khi bật tính năng vận hành, sao chép `.env.example` thành `.env`:

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Sửa file `.env` trên máy cá nhân. Node đọc file bằng `--env-file-if-exists`; biến môi trường đã có trong terminal sẽ được ưu tiên. Không commit `.env`. Chi tiết biến ở tài liệu kỹ thuật và `.env.example`.

## 4. Tạo tài khoản quản trị mà không đưa mật khẩu vào agent/chat

Trong `.env` cục bộ, điền email do chủ website chọn vào `F5AI_ADMIN_EMAIL` và mật khẩu riêng dài **12–128 ký tự** vào `F5AI_ADMIN_PASSWORD`; không dùng giá trị ví dụ công khai. Chạy:

```text
npm run admin
```

Sau thông báo thành công, xóa dòng mật khẩu khỏi `.env` và khởi động lại backend nếu đang chạy. Đăng nhập với tài khoản này để thấy **Quản lý Studio**. Không có tài khoản mặc định. Lệnh `npm run admin` tạo admin mới **hoặc cập nhật mật khẩu và cấp quyền admin cho email đã tồn tại**; chỉ chạy chủ động cho email của chủ website. Không dùng lệnh này trong database thật chỉ để test.

Không yêu cầu người dùng dán mật khẩu vào chat, không hardcode credentials vào mã, không đóng gói `.env` vào tài liệu bàn giao. Nếu nhà cung cấp hosting quản lý secrets, dùng cơ chế của họ thay cho file trong mã nguồn.

## 5. Chạy kiểm tra Chromium trên Windows, macOS và Linux

`npm test` không cần trình duyệt. `npm run test:browser` cần website dev đang chạy; nó tạo tài khoản và bản ghi đăng ký quan tâm trên server được kiểm tra. **Chỉ dùng website local thử nghiệm hoặc database test, không trỏ bài kiểm tra browser vào website đang bán thật.** `npm run test:admin` tự tạo server/database/uploads tạm, không mở database đang vận hành.

Hai script browser mặc định tìm `/usr/bin/chromium`, đường dẫn chỉ phù hợp môi trường cloud/Linux trước đây. Cách dùng trên máy nhận bàn giao là cài Chromium của Playwright rồi truyền đường dẫn thực qua `CHROMIUM_PATH`:

```text
npx playwright install chromium
```

`npm run test:preview` cũng dùng Chromium và cùng biến `CHROMIUM_PATH`, nhưng không cần server hoặc database: tạo HTML bằng `npm run preview:export` trước khi chạy.

Lệnh tải browser cần mạng; trên Linux có thể cần thêm thư viện hệ thống. `npx playwright install --with-deps chromium` cần quyền quản trị/cài gói hệ thống tùy máy; chỉ thực hiện khi máy cho phép, không suy ra rằng Claude Desktop đã có các thư viện đó.

PowerShell, ở terminal thứ hai khi `npm run dev` vẫn chạy:

```powershell
$env:CHROMIUM_PATH = node -p "require('playwright').chromium.executablePath()"
$env:BROWSER_BASE_URL = 'http://127.0.0.1:5173'
npm run test:browser
npm run test:admin
Remove-Item Env:CHROMIUM_PATH, Env:BROWSER_BASE_URL -ErrorAction SilentlyContinue
```

macOS/Linux:

```bash
export CHROMIUM_PATH="$(node -e 'console.log(require("playwright").chromium.executablePath())')"
export BROWSER_BASE_URL='http://127.0.0.1:5173'
npm run test:browser
npm run test:admin
unset CHROMIUM_PATH BROWSER_BASE_URL
```

Biến trả về là đường dẫn Playwright sẽ dùng; file đó chỉ tồn tại sau khi cài browser thành công. Có thể đặt `CHROMIUM_PATH` trực tiếp đến Chromium/Chrome/Edge hợp lệ, nhưng bộ kiểm tra chưa xác nhận mọi phiên bản browser trên mọi hệ điều hành. Ảnh/log kiểm tra nằm trong `.playwright/`, bị Git bỏ qua.

Để kiểm tra **đầy đủ video quản trị**, cài `ffmpeg` từ nguồn phù hợp hệ điều hành và bảo đảm `ffmpeg -version` chạy được trong terminal của agent. Script sẽ báo `SKIP video fixture: ffmpeg is unavailable` nếu không tìm được ffmpeg; khi đó phần quản trị/file vẫn chạy nhưng không được báo video đã kiểm chứng. Khi ffmpeg có mặt, script tạo MP4 H.264 1 giây để kiểm tra upload, phân quyền và phát thật. Chưa chạy các lệnh kiểm tra này trên Windows/macOS ở môi trường bàn giao; tính tương thích shell đã được chỉnh, cần agent nhận thực thi trên máy đích.

## 6. Chạy bản production và hiểu cookie HTTPS

```text
npm run build
npm start
```

`npm start` chạy Node production và phục vụ cả frontend đã build + API tại `PORT` (mặc định 3001). Script đã được viết độc lập với cú pháp shell nên dùng được với PowerShell/cmd và bash/zsh. Node preloads `scripts/production-env.mjs` để gán `NODE_ENV=production` trước khi nạp server.

Cookie production có `Secure`. Để xác nhận đầy đủ đăng nhập/phiên production, chạy sau HTTPS hợp lệ; mở bằng HTTP local chỉ phù hợp kiểm tra health/static, không dùng làm chứng cứ rằng phiên production đã được xác nhận trên mọi browser. Dùng `npm run dev` cho phát triển local không có HTTPS.

Nhà cung cấp hosting phải hỗ trợ Node 24, tiến trình HTTP chạy liên tục và disk/volume bền vững cho **toàn bộ `.data/`**. Đặt `APP_ORIGIN` bằng đúng origin HTTPS công khai. `TRUST_PROXY=1` chỉ khi có một reverse proxy đáng tin cậy. Không đưa premium files vào static `public/`, không triển khai riêng thư mục `dist` rồi mong API và tài khoản hoạt động.

Dockerfile được bàn giao để agent dựng trên máy/hosting có Docker. Việc có Dockerfile không có nghĩa image đã được build, container đã chạy, có domain hay có public URL. Claude Desktop không tự trở thành hosting. Không dùng Publish môi trường Codex để coi website đã online.

## 7. Dữ liệu và kết quả bàn giao

- Giữ `.data/club.sqlite` cùng `.data/uploads/` giữa các lần deploy. Archive nguồn không chứa dữ liệu tài khoản/đơn thật; dữ liệu vận hành hiện hữu cần quy trình backup riêng của chủ website.
- Dừng server trước khi sao chép database SQLite bằng cách copy file thông thường. Nếu cần backup online, dùng cơ chế SQLite phù hợp; không chỉ copy riêng `.sqlite` khi còn tiến trình ghi/WAL hoạt động rồi coi là backup chắc chắn.
- Ghi lại lệnh đã chạy, môi trường máy, kết quả test, phần video/GPU còn chưa kiểm tra, và public URL thật nếu đã triển khai. Không đưa screenshot hoặc địa chỉ localhost của máy agent thành link website cho chủ dự án.
- Người dùng đã yêu cầu chủ động triển khai tiếp theo hướng bàn giao, không lặp lại phỏng vấn sản phẩm. Nếu thiếu quyền truy cập hosting/domain, làm xong build/test/cấu hình trước, báo đúng điểm bị chặn và dữ liệu cần thiết; không giả tạo URL hoặc trạng thái triển khai.

File `website-preview.html` chỉ là bản xem ngoại tuyến để người dùng nhìn và thử tài nguyên miễn phí. Tài khoản, xác nhận chuyển khoản, quản trị và quyền truy cập cao cấp đều cần bản server. Chạy `npm run preview:export` để tạo lại sau khi sửa nội dung/giao diện; nội dung được quản trị lưu trong database không tự chuyển vào bộ seed export.
