# DECISIONS — sổ quyết định (ADR)

> Mỗi quyết định quan trọng là một mục: chọn gì, vì sao, đã bỏ phương án nào, được gì và mất gì.
> Không sửa mục cũ. Khi đổi ý thì viết mục mới và đánh dấu mục cũ `Superseded by ADR-xxx`. Lịch sử đổi ý chính là dữ liệu quý.

## ADR-001: <tiêu đề>
Status: Accepted (YYYY-MM-DD)
Context: <vấn đề, ràng buộc lúc đó>
Decision: <chọn gì>
Alternatives: <A → loại vì…; B → loại vì…>
Consequences: <+ được gì / − mất gì>
Linked: <FIX-xxx nếu quyết định sinh ra từ một lỗi>

## ADR-001: Theme tối navy sẫm + trắng ngà, màu đi qua token
Status: Accepted (2026-10-11)
Context: Chủ dự án yêu cầu giao diện tối, tối giản, công nghệ, gợi ý đen-trắng hoặc navy sẫm, có thể thêm chất điện ảnh/art. Bản bàn giao đang là nền kem, cam nhấn, với ~300 màu hex rải trong hai stylesheet.
Decision: Hai tone chính là navy sẫm (`--bg #0b0e14`, bề mặt `#151a24`) và trắng ngà (`--ink #eef1f6`). Cam than `#ff6a3d` giữ nhận diện thương hiệu nhưng chỉ dùng cho CTA chính, tab đang chọn, link nhấn. Vàng kim mờ (`--gold`) cho khu câu lạc bộ để có chất điện ảnh. Chip chọn và nút CLB dùng trắng trên tối (tối giản). Mọi màu khai báo một lần trong `:root`; rule chỉ dùng `var(--token)`.
Alternatives: Đen tuyền + trắng → loại vì thiếu chiều sâu khi đặt ảnh điện ảnh, cạnh card bị gắt; Giữ nền sáng và thêm nút đổi theme → loại vì tăng gấp đôi bề mặt kiểm thử trong khi anh chỉ yêu cầu bản tối; Cam nhấn đậm như cũ → loại vì nổi quá trên nền tối, dùng tiết chế hơn.
Consequences: + Đổi bảng màu sau này chỉ sửa một dòng `:root`, có test khóa; + Ảnh hero/card nổi hơn trên nền tối. − Chưa có bản sáng; người dùng thích nền sáng phải chờ; − Hai bộ test browser/admin chưa chạy lại sau đổi theme (chỉ kiểm hành vi, không kiểm màu).
Linked: FIX-001

## ADR-002: Demo cục bộ chạy bản production trên cổng 3080 với dữ liệu và cấu hình demo tách riêng
Status: Accepted (2026-10-11)
Context: Anh muốn tự host và xem demo offline trước khi bàn chuyện thuê server. Dữ liệu thật nằm ở `.data/`, chưa có admin/bank thật; dev server (3001/5173) của phiên khác đang chạy. Demo cần có admin và bank để thấy đủ luồng CMS + duyệt chuyển khoản mà không bịa tài khoản thật.
Decision: `scripts/demo-local.mjs` chạy `npm start`-tương-đương ở cổng 3080, `DATABASE_PATH=.data-demo/club.sqlite`, đọc `.env.demo` (tự sinh mật khẩu admin demo lần đầu, gitignore), bank ghi rõ "NGÂN HÀNG DEMO (chưa phải tài khoản thật)", `COOKIE_SECURE=0` vì chạy HTTP. Không ghi gì vào `.data/` hay `.env`.
Alternatives: Tạo admin vào `.data/` thật → loại vì sẽ để lại credential demo trong database vận hành; Demo bằng `npm run dev` → loại vì không phản ánh header/cache/cookie của bản production; Dùng cổng 3001 → loại vì đụng dev API đang chạy.
Consequences: + Xóa `.data-demo/` và `.env.demo` là sạch demo; + Cùng code và header với production. − Cookie không Secure trong demo nên không kiểm được hành vi HTTPS; − Cần nhớ demo và dev là hai database khác nhau.
Linked: FIX-002

## ADR-003: Bảo vệ CSRF bằng Origin + Sec-Fetch-Site theo môi trường, không thêm token
Status: Accepted (2026-10-11)
Context: Cookie SameSite=Lax đã chặn phần lớn CSRF; middleware cũ chỉ kiểm Origin khi có header và luôn cho phép origin dev kể cả ở production.
Decision: Giữ kiểm Origin, thêm từ chối khi `Sec-Fetch-Site: cross-site`, chỉ cho phép `localhost:5173`/`127.0.0.1:5173` khi `NODE_ENV` khác production. Không thêm CSRF token vì API same-origin, mọi ghi đều từ `fetch` của SPA và cookie Lax; token sẽ làm phức tạp offline preview và test mà không thêm lớp bảo vệ thực chất cho trình duyệt hiện đại.
Alternatives: Double-submit cookie token → loại vì thêm bề mặt lỗi, lợi ích biên nhỏ với SameSite=Lax + Origin + Fetch Metadata; SameSite=Strict → loại vì link chia sẻ `?resource=id` mở từ ngoài sẽ mất phiên.
Consequences: + Hai test khóa trong `tests/backend.test.mjs`; − Client không phải trình duyệt (script, curl) không gửi Origin/Sec-Fetch-Site vẫn gọi được API ghi khi có cookie hợp lệ, đó là hành vi chấp nhận được.
Linked: FIX-002

## ADR-004: Hosting cho bản đầu: VPS Việt Nam (AZDIGI Pro VPS Platinum-2) + tên miền .vn
Status: Superseded by ADR-005 (phần tên miền) (2026-10-11)
Context: Chủ dự án ở Việt Nam, website đầu tay, khán giả trong nước, ngân sách nhỏ, cần thanh toán nội địa và hỗ trợ tiếng Việt. App là một container Node + SQLite, không cần scale ngang.
Decision: Thuê AZDIGI Pro VPS Platinum-2 (2 vCPU/2 GB/20 GB, 199.000đ/tháng chu kỳ 12 tháng, chưa VAT) đặt tại DC Việt Nam; tên miền .vn (558.000đ năm đầu tại Mắt Bão hoặc tại AZDIGI). HTTPS bằng Caddy + Let's Encrypt theo `deploy/`.
Alternatives: Vietnix VPS SSD Linux 1 (210.000đ/tháng, 40 GB, hoàn tiền 30 ngày) → giữ làm phương án thay thế khi muốn trả theo tháng hoặc cần đĩa lớn hơn, nhược điểm 10 Mbps quốc tế; DigitalOcean Singapore 12 USD/tháng → loại ở bản đầu vì cần thẻ quốc tế và độ trễ cao hơn với người xem VN; Hetzner → loại vì giá/model đổi liên tục trong 2026 và không có DC gần VN ngoài Singapore; static hosting/PaaS đĩa tạm → loại vì không giữ được SQLite và upload.
Consequences: + Chi phí ≈ 3,14 triệu đồng năm đầu, một hóa đơn VAT; + Độ trễ trong nước thấp, thanh toán MoMo/chuyển khoản. − 20 GB đĩa cần theo dõi khi upload nhiều video (nâng gói hoặc chuyển Vietnix 40 GB); − Băng thông quốc tế của VPS VN thấp, khán giả ngoài VN xem video chậm.
Linked: FIX-004

## ADR-005: Tên miền quốc tế thay cho .vn; năm phương án trọn gói, khuyên phương án 2
Status: Accepted (2026-10-11)
Context: Chủ dự án không muốn .vn (quản lý chặt, giá cao) và muốn tên miền dễ nhớ, có chất công nghệ, uy tín; yêu cầu 5 phương án đầy đủ mọi thứ cần có.
Decision: Tên chính `f5aistudio.com` (còn trống, 249.000đ năm đầu / 369.000đ gia hạn tại Mắt Bão). Tùy chọn thêm `f5ai.studio` làm tên ngắn chuyển hướng. Năm phương án ghi ở `handover/PUBLISH.md` mục 0c; khuyên phương án 2 (AZDIGI Platinum-2 + .com + Cloudflare DNS + Caddy + UptimeRobot + backup R2).
Alternatives: .ai → chỉ ở phương án 4 vì 82,70 USD/năm và Mắt Bão bán tối thiểu 2 năm; .io/.co/.tech → không kiểm được tình trạng trống bằng RDAP và gia hạn cao; .xyz/.site/.online → rẻ năm đầu nhưng gia hạn cao, hay bị lọc spam; .app/.dev → giữ cho phương án quốc tế, ít quen với dân văn phòng.
Consequences: + Chi phí năm đầu phương án 2 ≈ 2,83 triệu đồng; + Tên .com không bị ràng buộc hồ sơ như .vn. − `f5ai.com` đã có chủ nên tên ngắn nhất không có; − Nếu mua .studio phải chịu gia hạn 1.509.000đ/năm.
Linked: FIX-006
